#!/usr/bin/env node
import { basename, join, resolve } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import {
  initProject,
  importAsset,
  removeAsset,
  generateAssetRegistry,
  exportProject,
  saveGameState,
  loadGameState,
  listSaveSlots,
  listRecipes,
  describeRecipe,
  applyRecipe,
  listSkills,
  applySkill,
  createGameFromSkill,
  wireShellToGameplay,
  applySkillPackRecipes,
} from "./project.js";
import { startEditorServer } from "./server.js";
import { startMcpServer } from "@gamekit/mcp/server";

export {
  initProject,
  importAsset,
  removeAsset,
  generateAssetRegistry,
  exportProject,
  buildExportBootstrapInput,
  saveGameState,
  loadGameState,
  listSaveSlots,
  listRecipes,
  describeRecipe,
  applyRecipe,
  listSkills,
  applySkill,
  createGameFromSkill,
  wireShellToGameplay,
  applySkillPackRecipes,
} from "./project.js";
export { getSkillPack, SKILL_PACKS } from "./skill-packs.js";
export {
  generateWebMain,
  generateMobileApp,
  orderSceneFiles,
  resolveTransitionMs,
  sceneFileToImportVar,
} from "./export-bootstrap.js";
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
    case "create": {
      // One-command playable game from a genre skill + recipe pack.
      // Usage: gamekit create <skill-id> [--name "My Game"] [--platform web|mobile]
      const skillId = args.find((arg) => !arg.startsWith("--"));
      if (!skillId) {
        const skills = await listSkills();
        throw new Error(
          `Usage: gamekit create <skill-id> [--name "..."] [--platform web|mobile]\n` +
            `Available skills: ${skills.map((s) => s.id).join(", ")}`,
        );
      }
      const platform =
        (readOption(args, "--platform") as "web" | "mobile" | undefined) ?? "mobile";
      if (platform !== "web" && platform !== "mobile") {
        throw new Error("--platform must be 'web' or 'mobile'");
      }
      const result = await createGameFromSkill(cwd, skillId, {
        name: readOption(args, "--name") ?? basename(cwd),
        platform,
      });
      console.log(`Created playable game from skill "${result.skillId}" (${result.skillName})`);
      console.log(`  Project:   ${result.projectPath}`);
      console.log(`  Gameplay:  gamekit/scenes/${result.gameplayFile} (id=${result.sceneId})`);
      console.log(`  Entities:  ${result.entityCount}`);
      if (result.assetsCopied.length) {
        console.log(`  Assets:    ${result.assetsCopied.join(", ")}`);
      }
      if (result.recipesApplied.length) {
        console.log(`  Recipes:   ${result.recipesApplied.join(", ")}`);
      }
      for (const w of result.warnings) {
        console.log(`  warning:   ${w}`);
      }
      console.log(`  Registry:  ${result.registryPath}`);
      console.log("");
      console.log("Next:");
      console.log("  pnpm gamekit editor");
      console.log(`  pnpm gamekit export ./build --platform ${platform}`);
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
      const host = readOption(args, "--host") ?? process.env.GAMEKIT_EDITOR_HOST ?? "127.0.0.1";
      await startEditorServer({ root: cwd, port, host });
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
    case "save": {
      const saveSlot = args.find((arg) => !arg.startsWith("--"));
      if (!saveSlot) {
        throw new Error("Usage: gamekit save <slot-name>");
      }
      await saveGameState(cwd, saveSlot);
      console.log(`Saved game state to slot: ${saveSlot}`);
      return;
    }
    case "load": {
      const loadSlot = args.find((arg) => !arg.startsWith("--"));
      if (!loadSlot) {
        throw new Error("Usage: gamekit load <slot-name>");
      }
      await loadGameState(cwd, loadSlot);
      console.log(`Loaded game state from slot: ${loadSlot}`);
      return;
    }
    case "list-saves": {
      const slots = await listSaveSlots(cwd);
      if (slots.length === 0) {
        console.log("No save slots found.");
      } else {
        for (const s of slots) {
          console.log(`  ${s.slotName} — ${s.levelsUnlocked}/${s.totalLevels} levels unlocked, scene: ${s.currentScene ?? "none"}`);
        }
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
      if (subcommand === "list") {
        const skills = await listSkills();
        for (const skill of skills) {
          console.log(`  ${skill.id} — ${skill.name} (${skill.entityCount} entities)`);
          console.log(`    ${skill.description}\n`);
        }
        console.log(`${skills.length} skill(s). Create a full game: gamekit create <skill-id>`);
        return;
      }
      if (subcommand === "apply") {
        const skillName = args[1];
        if (!skillName) {
          throw new Error(
            "Usage: gamekit skills apply <skill-id> [--name SceneName] [--wire-shell]",
          );
        }
        const sceneName = readOption(args, "--name");
        const wireShell = args.includes("--wire-shell");
        const result = await applySkill(cwd, skillName, sceneName);
        if (wireShell) {
          await wireShellToGameplay(cwd, result.sceneId, result.filename);
          const pack = await applySkillPackRecipes(cwd, skillName, result.filename);
          await generateAssetRegistry(cwd, "mobile");
          console.log(`Applied skill "${skillName}" → ${result.filename} (shell wired)`);
          if (pack.applied.length) console.log(`  Recipes: ${pack.applied.join(", ")}`);
          for (const w of pack.warnings) console.log(`  warning: ${w}`);
        } else {
          console.log(`Applied skill "${skillName}" → ${result.filename}`);
        }
        console.log(`  Scene id: ${result.sceneId}`);
        console.log(`  Entities: ${result.entityCount}`);
        if (result.assetsCopied.length) {
          console.log(`  Assets:   ${result.assetsCopied.join(", ")}`);
        }
        console.log(`  Tip: gamekit create ${skillName} for a full menu→play project.`);
        return;
      }
      throw new Error("Usage: gamekit skills <list|apply> [name]");
    }
    case "recipes": {
      const subcommand = args[0];

      if (subcommand === "list") {
        const category = readOption(args, "--category");
        const query = readOption(args, "--query");
        const tagRaw = readOption(args, "--tag");
        const tags = tagRaw ? tagRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
        const recipes = await listRecipes({ category, query, tags });
        if (recipes.length === 0) {
          console.log("No recipes found.");
          return;
        }
        for (const recipe of recipes) {
          console.log(`  ${recipe.id} [${recipe.category}] — ${recipe.name}`);
          console.log(`    ${recipe.description}`);
          if (recipe.tags.length) {
            console.log(`    tags: ${recipe.tags.join(", ")}`);
          }
          console.log("");
        }
        console.log(`${recipes.length} recipe(s)`);
        return;
      }

      if (subcommand === "describe") {
        const recipeId = args[1];
        if (!recipeId) {
          throw new Error("Usage: gamekit recipes describe <recipe-id>");
        }
        const recipe = await describeRecipe(recipeId);
        console.log(JSON.stringify(recipe, null, 2));
        return;
      }

      if (subcommand === "apply") {
        const recipeId = args[1];
        if (!recipeId) {
          throw new Error(
            "Usage: gamekit recipes apply <recipe-id> --scene <file> [--entity <id>] [--param key=value]...",
          );
        }
        const scenePath = readOption(args, "--scene") ?? "main.scene.json";
        const entityId = readOption(args, "--entity");
        const params = parseParamFlags(args);
        const result = await applyRecipe(cwd, recipeId, {
          scenePath,
          entityId,
          params,
        });
        console.log(`Applied recipe "${result.recipeId}" → ${result.scenePath}`);
        if (result.entityId) console.log(`  Entity: ${result.entityId}`);
        if (result.appliedComponents.length) {
          console.log(`  Components: ${result.appliedComponents.join(", ")}`);
        }
        if (result.appliedInputActions.length) {
          console.log(`  Input actions: ${result.appliedInputActions.join(", ")}`);
        }
        if (result.skippedComponents.length) {
          console.log(`  Skipped: ${result.skippedComponents.join(", ")}`);
        }
        for (const w of result.warnings) {
          console.log(`  warning: ${w}`);
        }
        return;
      }

      throw new Error("Usage: gamekit recipes <list|describe|apply> ...");
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
        `Scenes: ${report.summary.scenes}  Assets: ${report.summary.assets}  Levels: ${report.summary.levels}  Prefabs: ${report.summary.prefabs}`,
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

/** Parse repeated `--param key=value` flags into a record. */
function parseParamFlags(args: string[]): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== "--param") continue;
    const raw = args[i + 1];
    if (!raw) continue;
    const eq = raw.indexOf("=");
    if (eq <= 0) continue;
    const key = raw.slice(0, eq);
    const value = raw.slice(eq + 1);
    if (value === "true" || value === "false") {
      params[key] = value === "true";
    } else if (value !== "" && !Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) {
      params[key] = Number(value);
    } else {
      params[key] = value;
    }
  }
  return params;
}

function printHelp(): void {
  console.log(`Playroom CLI

Usage:
  gamekit init [--name MyGame]
  gamekit editor [--port 4177] [--host 127.0.0.1]
  gamekit import <file>
  gamekit remove <asset-id>
  gamekit export [path] [--platform web|mobile]
  gamekit generate [--platform web|mobile]
  gamekit mcp [project-path]
  gamekit skills list
  gamekit skills apply <name>
  gamekit recipes list [--category effect|mechanic|script|animation|gesture] [--tag pickup] [--query bob]
  gamekit recipes describe <recipe-id>
  gamekit recipes apply <recipe-id> --scene <file> [--entity <id>] [--param key=value]...
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
