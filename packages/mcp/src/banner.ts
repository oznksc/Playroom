import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const TOOL_COUNT = 41;

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  red: "\x1b[31m",
};

export async function countSkills(): Promise<number> {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const skillsDir = join(__dirname, "..", "skills");
    const files = await readdir(skillsDir);
    return files.filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

export function printBanner(projectPath: string, toolCount: number, skillCount: number): void {
  const w = 38;

  const line = (inner: string) =>
    `${c.cyan}│${c.reset}${inner}${" ".repeat(Math.max(0, w - stripAnsi(inner).length))}${c.cyan}│${c.reset}`;

  const header = [
    ``,
    `${c.cyan}┌${"─".repeat(w)}┐${c.reset}`,
    line(` ${c.bold}${c.white}███╗   ███╗  ██████╗  ██████╗ ${c.reset}`),
    line(` ${c.bold}${c.white}████╗ ████║██╔════╝ ██╔══██╗${c.reset}`),
    line(` ${c.bold}${c.white}██╔████╔██║██║      ███████║${c.reset}`),
    line(` ${c.bold}${c.white}██║╚██╔╝██║██║     ██╔═════╝${c.reset}`),
    line(` ${c.bold}${c.white}██║ ╚═╝ ██║╚██████╗██║      ${c.reset}`),
    line(` ${c.bold}${c.white}╚═╝     ╚═╝ ╚═════╝╚═╝      ${c.reset}`),
    line(` ${c.dim}GameKit Model Context Protocol${c.reset}`),
    `${c.cyan}└${"─".repeat(w)}┘${c.reset}`,
  ];

  const status = [
    ``,
    `  ${c.green}● ACTIVE${c.reset}`,
    ``,
    `  ${c.dim}Transport${c.reset}   stdio`,
    `  ${c.dim}Project${c.reset}     ${c.white}${projectPath}${c.reset}`,
    `  ${c.dim}Tools${c.reset}       ${c.yellow}${toolCount}${c.reset} registered`,
    `  ${c.dim}Skills${c.reset}      ${c.yellow}${skillCount}${c.reset} templates ${c.dim}(platformer, topdown, puzzle)${c.reset}`,
    `  ${c.dim}Resources${c.reset}   ${c.yellow}2${c.reset} available`,
    `  ${c.dim}Prompts${c.reset}     ${c.yellow}2${c.reset} available`,
    ``,
    `  ${c.dim}Waiting for client connection…${c.reset}`,
    ``,
  ];

  const output = [...header, ...status].join("\n");
  process.stderr.write(output + "\n");
}

export async function startMcpServer(projectPath: string): Promise<void> {
  const { resolve } = await import("node:path");
  const basePath = resolve(projectPath);
  const skillCount = await countSkills();

  printBanner(projectPath, TOOL_COUNT, skillCount);

  const server = createMcpServer(basePath);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
