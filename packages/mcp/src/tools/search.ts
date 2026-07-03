import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export function registerSearchTools(server: McpServer, basePath: string): void {
  server.tool(
    "search_project",
    "Semantic search or text query across project assets, scenes, configs, and source code",
    {
      query: z.string().describe("Natural language query or text pattern to find"),
      resultsLimit: z.number().optional().default(10).describe("Max results to return"),
    },
    async ({ query, resultsLimit }) => {
      // 1. Try colgrep first
      try {
        const output = await new Promise<string>((resolve, reject) => {
          const proc = spawn("colgrep", [query, "--results", String(resultsLimit)], {
            cwd: basePath,
            env: { ...process.env, PAGER: "cat" },
          });

          let stdout = "";
          let stderr = "";

          proc.stdout.on("data", (data) => {
            stdout += data.toString();
          });

          proc.stderr.on("data", (data) => {
            stderr += data.toString();
          });

          proc.on("close", (code) => {
            if (code === 0 && stdout.trim()) {
              resolve(stdout);
            } else {
              reject(new Error(stderr || `colgrep exited with code ${code}`));
            }
          });

          proc.on("error", (err) => {
            reject(err);
          });
        });

        return {
          content: [{ type: "text", text: `=== colgrep Search Results ===\n${output}` }],
        };
      } catch (err) {
        // 2. Fallback to standard recursive search
        try {
          const matches = await fallbackSearch(basePath, query, basePath);
          const limitMatches = matches.slice(0, resultsLimit);
          let text = `=== Fallback Search Results (matching "${query}") ===\n`;
          if (limitMatches.length === 0) {
            text += "No matches found.";
          } else {
            limitMatches.forEach((m) => {
              text += `File: ${m.file} (Line ${m.line}): ${m.content}\n`;
            });
            if (matches.length > resultsLimit) {
              text += `\n...and ${matches.length - resultsLimit} more matches.`;
            }
          }
          return {
            content: [{ type: "text", text }],
          };
        } catch (fallbackErr: any) {
          return {
            content: [{ type: "text", text: `Search failed: ${fallbackErr.message}` }],
          };
        }
      }
    }
  );
}

async function fallbackSearch(
  dir: string,
  query: string,
  rootDir: string
): Promise<Array<{ file: string; line: number; content: string }>> {
  const results: Array<{ file: string; line: number; content: string }> = [];
  const excludeDirs = [".git", "node_modules", "dist", "target", ".playwright-cli", "packages/mcp/dist"];

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name)) continue;
        await walk(fullPath);
      } else if (entry.isFile()) {
        // Search text files only
        if (/\.(ts|tsx|json|md|txt|css|scss|js|jsx)$/.test(entry.name)) {
          try {
            const content = await readFile(fullPath, "utf-8");
            if (content.toLowerCase().includes(query.toLowerCase())) {
              const lines = content.split("\n");
              lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                    file: relative(rootDir, fullPath),
                    line: idx + 1,
                    content: line.trim(),
                  });
                }
              });
            }
          } catch (e) {
            // ignore unreadable files
          }
        }
      }
    }
  }

  await walk(dir);
  return results;
}
