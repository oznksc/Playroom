import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { FileIO } from "../utils/file-io.js";
import { toolJson } from "../utils/result.js";

export function registerAuditTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "get_audit_log",
    "Query recent tool execution audit logs persisted to disk (status, duration, approval, arguments, results).",
    {
      limit: z.number().optional().describe("Max number of recent log entries to return (default: 20)"),
      tool: z.string().optional().describe("Filter entries by tool name"),
      sceneId: z.string().optional().describe("Filter entries by scene ID"),
      status: z.enum(["ok", "error", "denied", "cached", "cancelled"]).optional().describe("Filter by status"),
    },
    async (args) => {
      const auditFilePath = join(fileIO.projectRoot, "gamekit", "agent", "audit.jsonl");
      if (!existsSync(auditFilePath)) {
        return toolJson({
          total: 0,
          entries: [],
          message: "No audit logs found on disk.",
        });
      }

      try {
        const raw = await readFile(auditFilePath, "utf8");
        const lines = raw.split("\n").filter((l) => l.trim().length > 0);
        const limit = args.limit ?? 20;
        const entries: unknown[] = [];

        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const item = JSON.parse(lines[i]) as Record<string, unknown>;
            if (args.tool && item.tool !== args.tool) continue;
            if (args.sceneId && item.sceneId !== args.sceneId) continue;
            if (args.status && item.status !== args.status) continue;

            entries.push(item);
            if (entries.length >= limit) break;
          } catch {
            // skip malformed line
          }
        }

        return toolJson({
          total: entries.length,
          entries,
        });
      } catch (err) {
        return toolJson({ error: `Failed to read audit logs: ${err instanceof Error ? err.message : err}` }, true);
      }
    },
  );
}
