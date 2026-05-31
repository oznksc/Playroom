#!/usr/bin/env node
import { basename, resolve } from "node:path";
import { initProject, importAsset, generateAssetRegistry } from "./project.js";
import { startEditorServer } from "./server.js";

export { initProject, importAsset, generateAssetRegistry } from "./project.js";
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
  gamekit generate
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
