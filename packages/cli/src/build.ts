import { copyFile, mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { generateAssetRegistry, getGameKitRoot, getProjectSnapshot, readScene } from "./project.js";
import { runDoctor } from "./doctor.js";

export type BuildOptions = {
  outDir?: string;
  platform?: "web" | "mobile";
  skipDoctor?: boolean;
};

export type BuildResult = {
  outDir: string;
  platform: "web" | "mobile";
  scenes: string[];
  assets: number;
  assetHashes: Record<string, string>;
  durationMs: number;
};

/**
 * Production pack of the gamekit/ project folder:
 * - runs doctor (optional)
 * - regenerates assets registry
 * - copies minified project/scenes + assets into outDir with content hashes manifest
 */
export async function buildProject(root: string, options: BuildOptions = {}): Promise<BuildResult> {
  const started = Date.now();
  const platform = options.platform ?? "mobile";
  const outDir = options.outDir ?? join(root, "build", "gamekit");

  if (!options.skipDoctor) {
    const report = await runDoctor(root);
    if (!report.ok) {
      const errors = report.issues.filter((i) => i.level === "error").map((i) => i.message);
      throw new Error(`Build blocked by doctor errors:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    }
  }

  await generateAssetRegistry(root, platform);
  const snapshot = await getProjectSnapshot(root);
  const gamekitRoot = getGameKitRoot(root);

  await mkdir(join(outDir, "scenes"), { recursive: true });
  await mkdir(join(outDir, "assets"), { recursive: true });
  await mkdir(join(outDir, "generated"), { recursive: true });

  // Project (compact JSON)
  await writeFile(join(outDir, "project.json"), JSON.stringify(snapshot.project));

  // Scenes (re-validated + compact)
  for (const file of snapshot.scenes) {
    const scene = await readScene(root, file);
    await writeFile(join(outDir, "scenes", file), JSON.stringify(scene));
  }

  // Assets + hashes
  const assetHashes: Record<string, string> = {};
  for (const asset of snapshot.assets) {
    const src = join(gamekitRoot, "assets", asset.file);
    try {
      await stat(src);
    } catch {
      throw new Error(`Missing asset file during build: ${asset.file}`);
    }
    const bytes = await readFile(src);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    assetHashes[asset.id] = hash;
    await copyFile(src, join(outDir, "assets", asset.file));
  }

  // Registry for the target platform
  const registrySrc = join(gamekitRoot, "generated", "assets.ts");
  try {
    await copyFile(registrySrc, join(outDir, "generated", "assets.ts"));
  } catch {
    // regenerated path may differ; ignore if missing after generate
  }

  // Prefabs if any
  try {
    const prefabFiles = (await readdir(join(gamekitRoot, "prefabs"))).filter((f) => f.endsWith(".prefab.json"));
    if (prefabFiles.length > 0) {
      await mkdir(join(outDir, "prefabs"), { recursive: true });
      for (const file of prefabFiles) {
        const raw = JSON.parse(await readFile(join(gamekitRoot, "prefabs", file), "utf8"));
        await writeFile(join(outDir, "prefabs", file), JSON.stringify(raw));
      }
    }
  } catch {
    // no prefabs
  }

  const manifest = {
    builtAt: new Date().toISOString(),
    platform,
    schemaVersion: snapshot.project.schemaVersion,
    scenes: snapshot.scenes,
    assetHashes,
    relativeRoot: relative(root, outDir),
  };
  await writeFile(join(outDir, "build-manifest.json"), JSON.stringify(manifest, null, 2));

  return {
    outDir,
    platform,
    scenes: snapshot.scenes,
    assets: snapshot.assets.length,
    assetHashes,
    durationMs: Date.now() - started,
  };
}
