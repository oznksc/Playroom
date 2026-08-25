import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createLevel } from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

export function registerProjectTools(server: McpServer, fileIO: FileIO): void {
  server.tool("get_project", "Read and return project.json", {}, async () => {
    const project = await fileIO.readProject();
    return {
      content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
    };
  });

  server.tool(
    "update_project",
    "Update project.json fields",
    {
      name: z.string().optional().describe("New project name"),
      scenes: z.array(z.string()).optional().describe("New scenes list"),
      levels: z.array(z.unknown()).optional().describe("New levels list"),
    },
    async ({ name, scenes, levels }) => {
      const project = await fileIO.readProject();

      if (name !== undefined) {
        project.name = name;
      }
      if (scenes !== undefined) {
        project.scenes = scenes;
      }
      if (levels !== undefined) {
        project.levels = levels as typeof project.levels;
      }

      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    },
  );

  server.tool(
    "list_levels",
    "List project.levels (id, name, order, sceneIds, unlocked).",
    {},
    async () => {
      const project = await fileIO.readProject();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: project.levels.length, levels: project.levels }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "add_level",
    "Append a level to project.levels. sceneIds are scene ids without the .scene.json suffix (e.g. 'main').",
    {
      name: z.string().describe("Level display name"),
      sceneIds: z.array(z.string()).min(1).describe("Scene ids this level plays, e.g. ['main']"),
      order: z.number().optional().describe("Sort order (defaults to next integer)"),
      unlocked: z.boolean().optional().describe("Defaults to true only for order === 1"),
    },
    async ({ name, sceneIds, order, unlocked }) => {
      const project = await fileIO.readProject();
      const nextOrder = order ?? (project.levels.reduce((max, l) => Math.max(max, l.order), 0) + 1);
      const level = createLevel(name, nextOrder, sceneIds);
      if (unlocked !== undefined) level.unlocked = unlocked;
      if (project.levels.some((l) => l.id === level.id)) {
        level.id = `${level.id}-${nextOrder}`;
      }
      project.levels.push(level);
      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, level, total: project.levels.length }, null, 2) }],
      };
    },
  );

  server.tool(
    "update_level",
    "Patch a level by id (name, order, sceneIds, unlocked).",
    {
      levelId: z.string(),
      name: z.string().optional(),
      order: z.number().optional(),
      sceneIds: z.array(z.string()).optional(),
      unlocked: z.boolean().optional(),
    },
    async ({ levelId, name, order, sceneIds, unlocked }) => {
      const project = await fileIO.readProject();
      const level = project.levels.find((l) => l.id === levelId);
      if (!level) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Level "${levelId}" not found. Use list_levels.`,
                levels: project.levels.map((l) => l.id),
              }),
            },
          ],
          isError: true,
        };
      }
      if (name !== undefined) level.name = name;
      if (order !== undefined) level.order = order;
      if (sceneIds !== undefined) level.sceneIds = sceneIds;
      if (unlocked !== undefined) level.unlocked = unlocked;
      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, level }, null, 2) }],
      };
    },
  );

  server.tool(
    "remove_level",
    "Delete a level from project.levels (Levels panel).",
    { levelId: z.string() },
    async ({ levelId }) => {
      const project = await fileIO.readProject();
      const before = project.levels.length;
      project.levels = project.levels.filter((l) => l.id !== levelId);
      if (project.levels.length === before) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Level "${levelId}" not found.` }) }],
          isError: true,
        };
      }
      await fileIO.writeProject(project);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, removed: levelId, remaining: project.levels.map((l) => l.id) }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "validate_project",
    "Validate project.json file structure against schema rules",
    {},
    async () => {
      try {
        const project = await fileIO.readProject();
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, project }, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, errors: [err.message] }, null, 2) }],
        };
      }
    }
  );
}
