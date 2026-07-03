import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createEmptyScene,
  slugify,
  GAMEKIT_SCHEMA_VERSION,
  type GameKitScene,
} from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

export function registerSceneTools(server: McpServer, fileIO: FileIO): void {
  server.tool("list_scenes", "List all scene files in the project", {}, async () => {
    const scenes = await fileIO.listScenes();
    return {
      content: [{ type: "text", text: JSON.stringify(scenes, null, 2) }],
    };
  });

  server.tool(
    "get_scene",
    "Read and return a scene file",
    {
      path: z.string().describe("Scene filename (e.g., main.scene.json) or full path"),
    },
    async ({ path }) => {
      const filename = fileIO.resolveScenePath(path);
      const scene = await fileIO.readScene(filename);
      return {
        content: [{ type: "text", text: JSON.stringify(scene, null, 2) }],
      };
    },
  );

  server.tool(
    "create_scene",
    "Create a new scene with default settings",
    {
      name: z.string().describe("Scene name (e.g., 'Level 1')"),
      orientation: z
        .enum(["landscape", "portrait"])
        .default("landscape")
        .describe("Screen orientation"),
      viewport: z
        .object({ width: z.number(), height: z.number(), background: z.string() })
        .optional()
        .describe("Custom viewport settings"),
      gravity: z
        .object({ x: z.number(), y: z.number() })
        .optional()
        .describe("Custom gravity settings"),
    },
    async ({ name, orientation, viewport, gravity }) => {
      const scene = createEmptyScene(name);
      scene.id = slugify(name) || "main";

      const isLandscape = orientation === "landscape";
      scene.viewport = viewport ?? {
        width: isLandscape ? 844 : 390,
        height: isLandscape ? 390 : 844,
        background: "#a3a3a3",
      };
      scene.gravity = gravity ?? { x: 0, y: 1800 };
      scene.responsive.orientation = orientation;

      const filename = `${slugify(name)}.scene.json`;
      await fileIO.writeScene(filename, scene);

      const project = await fileIO.readProject();
      if (!project.scenes.includes(filename)) {
        project.scenes.push(filename);
        await fileIO.writeProject(project);
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ filename, scene }, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_scene",
    "Delete a scene file and remove it from project.json",
    {
      path: z.string().describe("Scene filename to delete"),
    },
    async ({ path }) => {
      const filename = fileIO.resolveScenePath(path);
      await fileIO.deleteScene(filename);

      const project = await fileIO.readProject();
      project.scenes = project.scenes.filter((s) => s !== filename);
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, deleted: filename }) }],
      };
    },
  );

  server.tool(
    "validate_scene",
    "Validate a scene file structure",
    {
      path: z.string().describe("Scene filename (e.g., main.scene.json) or full path"),
    },
    async ({ path }) => {
      try {
        const filename = fileIO.resolveScenePath(path);
        const scene = await fileIO.readScene(filename);
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, scene }, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, errors: [err.message] }, null, 2) }],
        };
      }
    }
  );
}
