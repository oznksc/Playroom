#!/usr/bin/env node
import { basename, join, resolve } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
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
      console.log(`Created GameKit project: ${project.projectPath}`);
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
      const output = await generateAssetRegistry(cwd);
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
      await initProject(cwd);
      const output = await exportProject(cwd, resolve(cwd, path));
      console.log(`Exported runnable Expo app: ${output}`);
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
  console.log(`GameKit CLI

Usage:
  gamekit init [--name MyGame]
  gamekit editor [--port 4177]
  gamekit import <file>
  gamekit remove <asset-id>
  gamekit export [path]
  gamekit generate
  gamekit mcp [project-path]
  gamekit skills list
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
