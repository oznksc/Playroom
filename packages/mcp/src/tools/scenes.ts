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

  server.tool(
    "load_scene",
    "Activate a scene for the editor/agent session (sets project.activeScene) and optionally records a transition",
    {
      scenePath: z.string().describe("Scene filename to activate"),
      transition: z
        .enum(["none", "fade", "slide"])
        .optional()
        .describe("Transition type to apply when switching"),
      duration: z.number().optional().describe("Transition duration in seconds (default 0.3)"),
    },
    async ({ scenePath, transition, duration }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      // Ensure scene exists
      await fileIO.readScene(filename);
      const project = await fileIO.readProject();
      if (!project.scenes.includes(filename) && !project.scenes.includes(filename.replace(/\.scene\.json$/, ""))) {
        // still allow load if file exists on disk
      }
      const previous = project.activeScene ?? project.scenes[0] ?? null;
      project.activeScene = filename;
      await fileIO.writeProject(project);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                previousScene: previous,
                activeScene: filename,
                transition: {
                  type: transition ?? "none",
                  duration: duration ?? (transition && transition !== "none" ? 0.3 : 0),
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "define_scene_transition",
    "Register a named scene transition preset on the project",
    {
      id: z.string().describe("Transition id (kebab-case)"),
      name: z.string().describe("Human-readable name"),
      toSceneId: z.string().describe("Target scene id or filename"),
      fromSceneId: z.string().optional().describe("Optional source scene id"),
      type: z.enum(["none", "fade", "slide"]).default("fade"),
      duration: z.number().default(0.3).describe("Duration in seconds"),
    },
    async ({ id, name, toSceneId, fromSceneId, type, duration }) => {
      const project = await fileIO.readProject();
      const transitions = [...(project.transitions ?? [])];
      const existing = transitions.findIndex((t) => t.id === id);
      const def = {
        id: slugify(id) || id,
        name,
        toSceneId,
        type,
        duration,
        ...(fromSceneId ? { fromSceneId } : {}),
      };
      if (existing >= 0) transitions[existing] = def;
      else transitions.push(def);
      project.transitions = transitions;
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, transition: def }, null, 2) }],
      };
    },
  );

  server.tool(
    "get_active_scene",
    "Return the project's active scene filename (project.activeScene) and transition presets",
    {},
    async () => {
      const project = await fileIO.readProject();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                activeScene: project.activeScene ?? project.scenes[0] ?? null,
                scenes: project.scenes,
                transitions: project.transitions ?? [],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
