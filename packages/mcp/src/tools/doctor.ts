import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { join } from "node:path";
import { access, readdir, stat } from "node:fs/promises";
import type { FileIO } from "../utils/file-io.js";

export function registerDoctorTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "run_doctor",
    "Validate the Playroom project: schema, missing assets, orphan scenes, level refs",
    {
      includeInfo: z.boolean().optional().describe("Include info-level findings (default false)"),
    },
    async ({ includeInfo }) => {
      const issues: Array<{ level: string; code: string; message: string; path?: string }> = [];
      const assetsDir = fileIO.assetsDir;

      let project;
      try {
        project = await fileIO.readProject();
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                issues: [{ level: "error", code: "PROJECT", message: e instanceof Error ? e.message : String(e) }],
              }),
            },
          ],
          isError: true,
        };
      }

      const sceneFiles = await fileIO.listScenes();
      for (const listed of project.scenes) {
        if (!sceneFiles.includes(listed)) {
          issues.push({
            level: "error",
            code: "SCENE_MISSING",
            message: `Project lists scene "${listed}" but file is missing`,
            path: listed,
          });
        }
      }

      for (const file of sceneFiles) {
        if (!project.scenes.includes(file)) {
          issues.push({
            level: "warn",
            code: "SCENE_ORPHAN",
            message: `Scene file "${file}" is not listed in project.scenes`,
            path: file,
          });
        }
        try {
          await fileIO.readScene(file);
        } catch (e) {
          issues.push({
            level: "error",
            code: "SCENE_INVALID",
            message: e instanceof Error ? e.message : String(e),
            path: file,
          });
        }
      }

      for (const asset of project.assets) {
        try {
          await stat(join(assetsDir, asset.file));
        } catch {
          issues.push({
            level: "error",
            code: "ASSET_FILE_MISSING",
            message: `Asset "${asset.id}" missing file "${asset.file}"`,
            path: asset.file,
          });
        }
      }

      const filtered = includeInfo ? issues : issues.filter((i) => i.level !== "info");
      const errors = filtered.filter((i) => i.level === "error").length;
      const warnings = filtered.filter((i) => i.level === "warn").length;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: errors === 0,
                summary: {
                  scenes: sceneFiles.length,
                  assets: project.assets.length,
                  levels: project.levels.length,
                  errors,
                  warnings,
                },
                issues: filtered,
              },
              null,
              2,
            ),
          },
        ],
        isError: errors > 0,
      };
    },
  );
}
