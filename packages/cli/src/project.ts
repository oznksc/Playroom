import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { pipeline } from "node:stream/promises";
import {
  type GameKitAsset,
  type GameKitProject,
  type GameKitScene,
  createEmptyScene,
  createProject,
  projectToJson,
  sceneToJson,
  slugify,
  validateProject,
  validateScene
} from "@gamekit/schema";

export type InitResult = {
  projectPath: string;
  scenePath: string;
};

export async function initProject(root: string, options: { name?: string } = {}): Promise<InitResult> {
  const gamekitRoot = getGameKitRoot(root);
  const scenesRoot = join(gamekitRoot, "scenes");
  const assetsRoot = join(gamekitRoot, "assets");
  const generatedRoot = join(gamekitRoot, "generated");

  await mkdir(scenesRoot, { recursive: true });
  await mkdir(assetsRoot, { recursive: true });
  await mkdir(generatedRoot, { recursive: true });

  const projectPath = join(gamekitRoot, "project.json");
  const scenePath = join(scenesRoot, "main.scene.json");

  if (!await exists(projectPath)) {
    await writeFile(projectPath, projectToJson(createProject(options.name ?? "GameKit Game")));
  }

  if (!await exists(scenePath)) {
    await writeFile(scenePath, sceneToJson(createStarterScene()));
  }

  await generateAssetRegistry(root);
  return { projectPath, scenePath };
}

export async function readProject(root: string): Promise<GameKitProject> {
  const projectPath = join(getGameKitRoot(root), "project.json");
  const raw = JSON.parse(await readFile(projectPath, "utf8")) as unknown;
  const result = validateProject(raw);

  if (!result.ok) {
    throw new Error(`Invalid gamekit/project.json:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return result.value;
}

export async function writeProject(root: string, project: GameKitProject): Promise<void> {
  const result = validateProject(project);
  if (!result.ok) {
    throw new Error(`Cannot write invalid project:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }
  await writeFile(join(getGameKitRoot(root), "project.json"), projectToJson(project));
}

export async function readScene(root: string, file = "main.scene.json"): Promise<GameKitScene> {
  const scenePath = join(getGameKitRoot(root), "scenes", sanitizeSceneFile(file));
  const raw = JSON.parse(await readFile(scenePath, "utf8")) as unknown;
  const result = validateScene(raw);

  if (!result.ok) {
    throw new Error(`Invalid scene ${file}:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return result.value;
}

export async function writeScene(root: string, scene: GameKitScene, file = "main.scene.json"): Promise<void> {
  const result = validateScene(scene);
  if (!result.ok) {
    throw new Error(`Cannot write invalid scene:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  await mkdir(join(getGameKitRoot(root), "scenes"), { recursive: true });
  await writeFile(join(getGameKitRoot(root), "scenes", sanitizeSceneFile(file)), sceneToJson(scene));
}

export async function listAssets(root: string): Promise<GameKitAsset[]> {
  await initProject(root);
  return (await readProject(root)).assets;
}

export async function importAsset(root: string, sourceFile: string): Promise<GameKitAsset> {
  await initProject(root);

  const extension = extname(sourceFile).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(extension)) {
    throw new Error("Only png, jpg, jpeg, webp, and svg image assets are supported in MVP 0.1.");
  }

  const sourceInfo = await stat(sourceFile);
  if (!sourceInfo.isFile()) {
    throw new Error(`Asset source is not a file: ${sourceFile}`);
  }

  const assetId = slugify(basename(sourceFile, extension));
  const fileName = uniqueAssetFileName(`${assetId}${extension}`);
  const assetsRoot = join(getGameKitRoot(root), "assets");
  const destination = join(assetsRoot, fileName);
  await pipeline(createReadStream(sourceFile), createWriteStream(destination));

  const project = await readProject(root);
  const asset: GameKitAsset = {
    id: assetId,
    file: fileName,
    kind: "image"
  };

  project.assets = [
    ...project.assets.filter((existing) => existing.id !== asset.id),
    asset
  ].sort((a, b) => a.id.localeCompare(b.id));

  await writeProject(root, project);
  await generateAssetRegistry(root);
  return asset;
}

export async function importAssetBuffer(root: string, fileName: string, data: Buffer): Promise<GameKitAsset> {
  await initProject(root);
  const extension = extname(fileName).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(extension)) {
    throw new Error("Only png, jpg, jpeg, webp, and svg image assets are supported in MVP 0.1.");
  }

  const assetId = slugify(basename(fileName, extension));
  const savedFile = uniqueAssetFileName(`${assetId}${extension}`);
  await writeFile(join(getGameKitRoot(root), "assets", savedFile), data);

  const project = await readProject(root);
  const asset: GameKitAsset = {
    id: assetId,
    file: savedFile,
    kind: "image"
  };
  project.assets = [
    ...project.assets.filter((existing) => existing.id !== asset.id),
    asset
  ].sort((a, b) => a.id.localeCompare(b.id));

  await writeProject(root, project);
  await generateAssetRegistry(root);
  return asset;
}

export async function removeAsset(root: string, assetId: string): Promise<void> {
  const project = await readProject(root);
  const asset = project.assets.find((a) => a.id === assetId);
  if (!asset) {
    throw new Error(`Asset "${assetId}" not found in project`);
  }

  const assetsRoot = join(getGameKitRoot(root), "assets");
  const filePath = join(assetsRoot, asset.file);
  try {
    await unlink(filePath);
  } catch {
    // File may already be missing — that's fine
  }

  project.assets = project.assets.filter((a) => a.id !== assetId);
  await writeProject(root, project);
  await generateAssetRegistry(root);
}

export async function generateAssetRegistry(root: string): Promise<string> {
  const generatedRoot = join(getGameKitRoot(root), "generated");
  await mkdir(generatedRoot, { recursive: true });

  let project: GameKitProject;
  try {
    project = await readProject(root);
  } catch {
    project = createProject("GameKit Game");
  }

  const output = join(generatedRoot, "assets.ts");
  const entries = project.assets
    .map((asset) => `  ${JSON.stringify(asset.id)}: require("../assets/${asset.file}")`)
    .join(",\n");

  await writeFile(output, `/* This file is generated by GameKit CLI. */
/* eslint-disable @typescript-eslint/no-var-requires */
export const gamekitAssets = {
${entries}
} as const;

export type GameKitAssetId = keyof typeof gamekitAssets;
`);

  return relative(root, output);
}

export async function getProjectSnapshot(root: string): Promise<{
  project: GameKitProject;
  scenes: string[];
  assets: GameKitAsset[];
  levels: GameKitProject["levels"];
}> {
  await initProject(root);
  const gamekitRoot = getGameKitRoot(root);
  const project = await readProject(root);
  const sceneFiles = await readdir(join(gamekitRoot, "scenes"));

  return {
    project,
    scenes: sceneFiles.filter((file) => file.endsWith(".scene.json")).sort(),
    assets: project.assets,
    levels: project.levels ?? []
  };
}

export function getGameKitRoot(root: string): string {
  return join(root, "gamekit");
}

export async function exportProject(root: string, outputDir: string): Promise<string> {
  const { project, scenes, assets } = await getProjectSnapshot(root);
  const gamekitRoot = getGameKitRoot(root);
  const outputGamekit = join(outputDir, "gamekit");
  const pkgJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as Record<string, unknown>;

  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputGamekit, "scenes"), { recursive: true });
  await mkdir(join(outputGamekit, "assets"), { recursive: true });
  await mkdir(join(outputGamekit, "generated"), { recursive: true });

  const templateDir = join(root, "templates", "expo-game");
  const filesToCopy = [
    { src: join(templateDir, "App.tsx"), dest: join(outputDir, "App.tsx") },
    { src: join(templateDir, "app.json"), dest: join(outputDir, "app.json") },
    { src: join(templateDir, "babel.config.js"), dest: join(outputDir, "babel.config.js") },
    { src: join(templateDir, "tsconfig.json"), dest: join(outputDir, "tsconfig.json") },
  ];

  for (const { src, dest } of filesToCopy) {
    if (await exists(src)) {
      await writeFile(dest, await readFile(src, "utf8"));
    }
  }

  const templatePkg = { ...JSON.parse(await readFile(join(templateDir, "package.json"), "utf8")) as Record<string, unknown> };
  templatePkg.name = project.name.toLowerCase().replace(/\s+/g, "-");
  (templatePkg.dependencies as Record<string, string>)["@gamekit/runtime"] = pkgJson.version as string ?? "0.1.0";
  await writeFile(join(outputDir, "package.json"), JSON.stringify(templatePkg, null, 2) + "\n");

  for (const sceneFile of scenes) {
    const scenePath = join(gamekitRoot, "scenes", sceneFile);
    await writeFile(join(outputGamekit, "scenes", sceneFile), await readFile(scenePath, "utf8"));
  }

  for (const asset of assets) {
    const assetSrc = join(gamekitRoot, "assets", asset.file);
    if (await exists(assetSrc)) {
      await writeFile(join(outputGamekit, "assets", asset.file), await readFile(assetSrc));
    }
  }

  await writeProject(outputDir, project);
  await generateAssetRegistry(outputDir);

  return outputDir;
}

function createStarterScene(): GameKitScene {
  const scene = createEmptyScene("Main Scene");
  scene.entities = [
    {
      id: "player",
      name: "Player",
      components: [
        {
          type: "Transform",
          position: { x: 120, y: 360 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        },
        {
          type: "Sprite",
          assetId: "player",
          width: 48,
          height: 64,
          anchor: { x: 0.5, y: 1 }
        },
        {
          type: "AabbCollider",
          offset: { x: -24, y: -64 },
          size: { x: 48, y: 64 },
          isStatic: false
        },
        {
          type: "PlayerController",
          speed: 240,
          jumpVelocity: 620,
          gravity: 1800
        }
      ]
    },
    {
      id: "ground",
      name: "Ground",
      components: [
        {
          type: "Transform",
          position: { x: 0, y: 520 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        },
        {
          type: "AabbCollider",
          offset: { x: 0, y: 0 },
          size: { x: 900, y: 48 },
          isStatic: true
        }
      ]
    },
    {
      id: "camera",
      name: "Camera",
      components: [
        {
          type: "Transform",
          position: { x: 0, y: 0 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        },
        {
          type: "CameraFollow",
          targetId: "player",
          smoothing: 0.18
        }
      ]
    }
  ];
  return scene;
}

function sanitizeSceneFile(file: string): string {
  if (!/^[a-zA-Z0-9._-]+\.scene\.json$/.test(file)) {
    throw new Error(`Invalid scene file name: ${file}`);
  }
  return file;
}

function uniqueAssetFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
