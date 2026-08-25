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
    "set_viewport",
    "Update a scene's viewport (width, height, background) and optionally gravity and orientation. Use this instead of rewriting the whole scene JSON.",
    {
      scenePath: z.string(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      background: z.string().optional().describe("CSS color, e.g. #1a1f2e"),
      name: z.string().optional().describe("Scene display name"),
      gravity: z.object({ x: z.number(), y: z.number() }).optional(),
      orientation: z.enum(["landscape", "portrait", "auto"]).optional(),
    },
    async ({ scenePath, width, height, background, name, gravity, orientation }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      if (name !== undefined) scene.name = name;
      if (width !== undefined) scene.viewport.width = width;
      if (height !== undefined) scene.viewport.height = height;
      if (background !== undefined) scene.viewport.background = background;
      if (gravity) scene.gravity = { ...gravity };
      if (orientation) scene.responsive.orientation = orientation;
      await fileIO.writeScene(filename, scene);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                name: scene.name,
                viewport: scene.viewport,
                gravity: scene.gravity,
                orientation: scene.responsive.orientation,
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
    "get_scene_settings",
    "Compact World panel dump: name, viewport, gravity, responsive, safe area, input actions, game-rules summary, timeline, GUI counts.",
    { scenePath: z.string() },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                filename,
                id: scene.id,
                name: scene.name,
                viewport: scene.viewport,
                gravity: scene.gravity,
                responsive: scene.responsive,
                inputActions: (scene.inputMap?.bindings ?? []).map((b) => b.action),
                gameRules: scene.gameRules
                  ? {
                      lives: scene.gameRules.lives,
                      objectives: scene.gameRules.objectives?.length ?? 0,
                      hazards: scene.gameRules.hazards?.length ?? 0,
                      winMessage: scene.gameRules.winMessage,
                      gameOverMessage: scene.gameRules.gameOverMessage,
                    }
                  : null,
                timeline: {
                  duration: scene.timeline.duration,
                  loop: scene.timeline.loop,
                  tracks: scene.timeline.tracks.length,
                },
                gui: {
                  nodes: scene.gui?.nodes.length ?? 0,
                  componentInstances: scene.gui?.componentInstances.length ?? 0,
                },
                entityCount: scene.entities.length,
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
    "set_responsive",
    "Set scene.responsive (mode, reference size, orientation) — World panel Responsive section.",
    {
      scenePath: z.string(),
      mode: z.enum(["fixed", "scale", "adaptive"]).optional(),
      referenceWidth: z.number().positive().optional(),
      referenceHeight: z.number().positive().optional(),
      orientation: z.enum(["landscape", "portrait", "auto"]).optional(),
    },
    async ({ scenePath, mode, referenceWidth, referenceHeight, orientation }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      if (mode) scene.responsive.mode = mode;
      if (referenceWidth !== undefined) scene.responsive.referenceWidth = referenceWidth;
      if (referenceHeight !== undefined) scene.responsive.referenceHeight = referenceHeight;
      if (orientation) scene.responsive.orientation = orientation;
      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, responsive: scene.responsive }, null, 2) }],
      };
    },
  );

  server.tool(
    "set_safe_area",
    "Set scene.responsive.safeArea (enabled + padding) — World panel Safe Area section.",
    {
      scenePath: z.string(),
      enabled: z.boolean().optional(),
      padding: z
        .object({
          top: z.number().optional(),
          bottom: z.number().optional(),
          left: z.number().optional(),
          right: z.number().optional(),
        })
        .optional(),
    },
    async ({ scenePath, enabled, padding }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      if (enabled !== undefined) scene.responsive.safeArea.enabled = enabled;
      if (padding) {
        scene.responsive.safeArea.padding = {
          ...scene.responsive.safeArea.padding,
          ...padding,
        };
      }
      await fileIO.writeScene(filename, scene);
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: true, safeArea: scene.responsive.safeArea }, null, 2) },
        ],
      };
    },
  );

  server.tool(
    "clone_scene",
    "Duplicate a scene file under a new name and register it on the project. Entity IDs are preserved (separate file). Use copy_entities if you need new IDs inside an existing scene.",
    {
      scenePath: z.string().describe("Source scene filename"),
      name: z.string().describe("New scene display name (file becomes <slug>.scene.json)"),
    },
    async ({ scenePath, name }) => {
      const sourceFile = fileIO.resolveScenePath(scenePath);
      const source = await fileIO.readScene(sourceFile);
      const filename = `${slugify(name)}.scene.json`;
      if (filename === sourceFile) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Clone name resolves to the same filename as the source." }) }],
          isError: true,
        };
      }
      const clone = structuredClone(source) as GameKitScene;
      clone.id = slugify(name) || clone.id;
      clone.name = name;
      await fileIO.writeScene(filename, clone);
      const project = await fileIO.readProject();
      if (!project.scenes.includes(filename)) {
        project.scenes.push(filename);
        await fileIO.writeProject(project);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                filename,
                sceneId: clone.id,
                entityCount: clone.entities.length,
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
