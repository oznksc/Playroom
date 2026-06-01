import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function spawnMcpClient(projectPath: string): ChildProcess {
  // Resolve CLI dist path relative to this file
  const cliDist = join(__dirname, "..", "index.js");
  return spawn("node", [cliDist, "mcp", projectPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });
}
