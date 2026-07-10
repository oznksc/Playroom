#!/usr/bin/env node
import { basename, join, resolve } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { initProject, importAsset, removeAsset, generateAssetRegistry, exportProject } from "./project.js";
import { startEditorServer } from "./server.js";
import { startMcpServer } from "@gamekit/mcp/server";

export { initProject, importAsset, removeAsset, generateAssetRegistry, exportProject } from "./project.js";
export { startEditorServer } from "./server.js";

async function main(argv: string[]): Promise<void> {
  const [command, ...args] = argv;
  const cwd = process.cwd();

  switch (command) {
    case "init": {
      const project = await initProject(cwd, { name: readOption(args, "--name") ?? basename(cwd) });
      console.log(`Created Playroom project: ${project.projectPath}`);
      return;
    }
    case "import": {
      const file = args.find((arg) => !arg.startsWith("--"));
      if (!file) {
        throw new Error("Usage: gamekit import <file>");
      }
      const asset = await importAsset(cwd, resolve(cwd, file));
      console.log(`Imported asset: ${asset.id}`);
      return;
    }
    case "remove": {
      const assetId = args.find((arg) => !arg.startsWith("--"));
      if (!assetId) {
        throw new Error("Usage: gamekit remove <asset-id>");
      }
      await removeAsset(cwd, assetId);
      console.log(`Removed asset: ${assetId}`);
      return;
    }
    case "generate": {
      const platform = (readOption(args, "--platform") as "web" | "mobile" | undefined) ?? "mobile";
      if (platform !== "web" && platform !== "mobile") {
        throw new Error("--platform must be 'web' or 'mobile'");
      }
      const output = await generateAssetRegistry(cwd, platform);
      console.log(`Generated asset registry: ${output}`);
      return;
    }
    case "editor": {
      const port = Number(readOption(args, "--port") ?? process.env.GAMEKIT_EDITOR_PORT ?? 4177);
      await startEditorServer({ root: cwd, port });
      return;
    }
    case "export": {
      const path = args.find((arg) => !arg.startsWith("--")) ?? join(cwd, "build");
      const platform = (readOption(args, "--platform") as "web" | "mobile" | undefined) ?? "mobile";
      if (platform !== "web" && platform !== "mobile") {
        throw new Error("--platform must be 'web' or 'mobile'");
      }
      await initProject(cwd);
      const output = await exportProject(cwd, resolve(cwd, path), platform);
      console.log(`Exported runnable ${platform === "web" ? "web" : "Expo"} app: ${output}`);
      if (platform === "web") {
        console.log(`Run 'cd ${output} && pnpm install && pnpm dev' to start.`);
      }
      return;
    }
    case "mcp": {
      const projectPath = args.find((arg) => !arg.startsWith("--")) ?? cwd;
      await startMcpServer(resolve(projectPath));
      return;
    }
    case "skills": {
      const subcommand = args[0];
      const skillsDir = new URL("../../mcp/skills/", import.meta.url).pathname;
      if (subcommand === "list") {
        const files = await readdir(skillsDir);
        const skills = [];
        for (const file of files.filter((f) => f.endsWith(".json"))) {
          const raw = JSON.parse(await readFile(join(skillsDir, file), "utf8"));
          skills.push({ id: file.replace(".json", ""), name: raw.name, description: raw.description });
        }
        for (const skill of skills) {
          console.log(`  ${skill.id} — ${skill.name}`);
          console.log(`    ${skill.description}\n`);
        }
        return;
      }
      if (subcommand === "apply") {
        const skillName = args[1];
        if (!skillName) {
          throw new Error("Usage: gamekit skills apply <skill-name>");
        }
        const { createEmptyScene, slugify, createId, sceneToJson, projectToJson, validateProject } = await import("@gamekit/schema");
        const skillPath = join(skillsDir, `${skillName}.json`);
        const skill = JSON.parse(await readFile(skillPath, "utf8"));
        const name = skill.name;
        const scene = createEmptyScene(name);
        const idMap = new Map<string, string>();
        for (const se of skill.entities) {
          const entity = { id: createId(se.name), name: se.name, components: se.components };
          idMap.set(se.name, entity.id);
          scene.entities.push(entity);
        }
        for (const entity of scene.entities) {
          for (const comp of entity.components) {
            if (comp.type === "CameraFollow") {
              const resolvedId = idMap.get(comp.targetId);
              if (resolvedId) comp.targetId = resolvedId;
            }
          }
        }
        if (skill.viewport) scene.viewport = skill.viewport;
        if (skill.gravity) scene.gravity = skill.gravity;
        if (skill.orientation) scene.responsive.orientation = skill.orientation;
        const filename = `${slugify(name)}.scene.json`;
        const gamekitDir = join(cwd, "gamekit");
        await writeFile(join(gamekitDir, "scenes", filename), sceneToJson(scene));
        const projectRaw = JSON.parse(await readFile(join(gamekitDir, "project.json"), "utf-8"));
        const projectResult = validateProject(projectRaw);
        if (projectResult.ok) {
          const project = projectResult.value;
          if (!project.scenes.includes(filename)) {
            project.scenes.push(filename);
          }
          await writeFile(join(gamekitDir, "project.json"), projectToJson(project));
        }
        console.log(`Applied skill "${skillName}" → ${filename}`);
        console.log(`  Entities: ${scene.entities.map((e) => e.name).join(", ")}`);
        return;
      }
      throw new Error("Usage: gamekit skills <list|apply> [name]");
    }
    case "search": {
      const query = args[0];
      if (!query) {
        throw new Error("Usage: gamekit search <query>");
      }
      try {
        console.log(`Searching for "${query}" using colgrep...`);
        execSync(`colgrep "${query}" --results 10`, { cwd, stdio: "inherit" });
      } catch (err) {
        console.log("colgrep search failed or not installed. Running fallback text search...");
        const results: Array<{ file: string; line: number; content: string }> = [];
        const excludeDirs = [".git", "node_modules", "dist", "target", ".playwright-cli"];
        async function walk(currentDir: string) {
          const entries = await readdir(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = join(currentDir, entry.name);
            if (entry.isDirectory()) {
              if (excludeDirs.includes(entry.name)) continue;
              await walk(fullPath);
            } else if (entry.isFile()) {
              if (/\.(ts|tsx|json|md|txt|css|scss|js|jsx)$/.test(entry.name)) {
                try {
                  const content = await readFile(fullPath, "utf-8");
                  if (content.toLowerCase().includes(query.toLowerCase())) {
                    const lines = content.split("\n");
                    lines.forEach((line, idx) => {
                      if (line.toLowerCase().includes(query.toLowerCase())) {
                        results.push({
                          file: relative(cwd, fullPath),
                          line: idx + 1,
                          content: line.trim(),
                        });
                      }
                    });
                  }
                } catch (e) {}
              }
            }
          }
        }
        const { relative } = await import("node:path");
        await walk(cwd);
        if (results.length === 0) {
          console.log("No matches found.");
        } else {
          results.slice(0, 20).forEach((m) => {
            console.log(`${m.file}:${m.line}: ${m.content}`);
          });
          if (results.length > 20) {
            console.log(`\n...and ${results.length - 20} more matches.`);
          }
        }
      }
      return;
    }
    case "validate": {
      const { validateProject, validateScene } = await import("@gamekit/schema");
      const gamekitDir = join(cwd, "gamekit");
      
      console.log("🔍 Validating project.json...");
      try {
        const projectRaw = JSON.parse(await readFile(join(gamekitDir, "project.json"), "utf-8"));
        const projectResult = validateProject(projectRaw);
        if (projectResult.ok) {
          console.log("✅ project.json is VALID.");
        } else {
          console.error("❌ project.json has ERRORS:\n" + projectResult.errors.map(e => `  - ${e}`).join("\n"));
        }
      } catch (err: any) {
        console.error("❌ Failed to read or parse project.json: " + err.message);
      }

      console.log("\n🔍 Validating scene files...");
      try {
        const scenesDir = join(gamekitDir, "scenes");
        const files = await readdir(scenesDir);
        const sceneFiles = files.filter(f => f.endsWith(".scene.json"));
        for (const file of sceneFiles) {
          try {
            const sceneRaw = JSON.parse(await readFile(join(scenesDir, file), "utf-8"));
            const sceneResult = validateScene(sceneRaw);
            if (sceneResult.ok) {
              console.log(`✅ ${file} is VALID.`);
            } else {
              console.error(`❌ ${file} has ERRORS:\n` + sceneResult.errors.map(e => `  - ${e}`).join("\n"));
            }
          } catch (err: any) {
            console.error(`❌ Failed to read or parse ${file}: ` + err.message);
          }
        }
      } catch (err: any) {
        console.error("❌ Failed to read scenes directory: " + err.message);
      }
      return;
    }
    case "doctor": {
      const { runDoctor } = await import("./doctor.js");
      const report = await runDoctor(cwd);
      const icon = { error: "✖", warn: "⚠", info: "·" } as const;
      console.log(`Playroom doctor — ${report.projectPath}`);
      console.log(
        `Scenes: ${report.summary.scenes}  Assets: ${report.summary.assets}  Levels: ${report.summary.levels}`,
      );
      console.log("");
      for (const issue of report.issues) {
        const loc = issue.path ? ` (${issue.path})` : "";
        console.log(`  ${icon[issue.level]} [${issue.level}] ${issue.code}: ${issue.message}${loc}`);
      }
      console.log("");
      if (report.ok) {
        console.log(`OK — ${report.summary.warnings} warning(s), ${report.summary.errors} error(s)`);
      } else {
        console.error(`FAILED — ${report.summary.errors} error(s), ${report.summary.warnings} warning(s)`);
        process.exitCode = 1;
      }
      return;
    }
    case "build": {
      const { buildProject } = await import("./build.js");
      const out = readOption(args, "--out") ?? join(cwd, "build", "gamekit");
      const platform = (readOption(args, "--platform") as "web" | "mobile" | undefined) ?? "mobile";
      if (platform !== "web" && platform !== "mobile") {
        throw new Error("--platform must be 'web' or 'mobile'");
      }
      const skipDoctor = args.includes("--skip-doctor");
      const result = await buildProject(cwd, { outDir: resolve(cwd, out), platform, skipDoctor });
      console.log(`Built gamekit pack → ${result.outDir}`);
      console.log(`  platform: ${result.platform}`);
      console.log(`  scenes:   ${result.scenes.length}`);
      console.log(`  assets:   ${result.assets}`);
      console.log(`  duration: ${result.durationMs}ms`);
      return;
    }
    case "dev": {
      const { startDevWatch } = await import("./dev.js");
      const platform = (readOption(args, "--platform") as "web" | "mobile" | undefined) ?? "mobile";
      if (platform !== "web" && platform !== "mobile") {
        throw new Error("--platform must be 'web' or 'mobile'");
      }
      const handle = startDevWatch(cwd, { platform });
      await new Promise<void>((resolve) => {
        process.on("SIGINT", () => {
          handle.stop();
          console.log("\n[gamekit dev] stopped");
          resolve();
        });
        process.on("SIGTERM", () => {
          handle.stop();
          resolve();
        });
      });
      return;
    }
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return;
    default:
      throw new Error(`Unknown command "${command}". Run gamekit --help.`);
  }
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function printHelp(): void {
  console.log(`Playroom CLI

Usage:
  gamekit init [--name MyGame]
  gamekit editor [--port 4177]
  gamekit import <file>
  gamekit remove <asset-id>
  gamekit export [path] [--platform web|mobile]
  gamekit generate [--platform web|mobile]
  gamekit mcp [project-path]
  gamekit skills list
  gamekit skills apply <name>
  gamekit search <query>
  gamekit validate
  gamekit doctor
  gamekit build [--out build/gamekit] [--platform web|mobile] [--skip-doctor]
  gamekit dev [--platform web|mobile]
`);
}

import { realpathSync } from "node:fs";

let isEntrypoint = false;
try {
  if (process.argv[1]) {
    const realArgv1 = realpathSync(process.argv[1]);
    isEntrypoint = import.meta.url === `file://${realArgv1}`;
  }
} catch {
  // ignore
}

if (isEntrypoint || import.meta.url.endsWith("/packages/cli/dist/index.js")) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
