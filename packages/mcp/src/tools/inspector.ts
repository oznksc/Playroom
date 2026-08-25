import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  GameKitComponentSchema,
  type StateMachineComponent,
  type ScriptComponent,
} from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";
import { toolJson } from "../utils/result.js";
import { findEntity, summarizeEntity } from "../utils/entity-query.js";

const DEFAULTS: Record<string, Record<string, unknown>> = {
  Sprite: { type: "Sprite", assetId: "player", width: 64, height: 64, anchor: { x: 0.5, y: 0.5 } },
  AabbCollider: { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 64, y: 64 }, isStatic: false },
  CircleCollider: { type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 24, isStatic: false, isTrigger: false },
  PolygonCollider: {
    type: "PolygonCollider",
    offset: { x: 0, y: 0 },
    points: [
      { x: -16, y: -16 },
      { x: 16, y: -16 },
      { x: 16, y: 16 },
      { x: -16, y: 16 },
    ],
    isStatic: false,
  },
  PlayerController: { type: "PlayerController", speed: 300, jumpVelocity: 600, gravity: 1800 },
  RigidBody: {
    type: "RigidBody",
    velocity: { x: 0, y: 0 },
    angularVelocity: 0,
    mass: 1,
    drag: 0,
    isKinematic: false,
    gravityScale: 1,
    useGravity: true,
  },
  CameraFollow: { type: "CameraFollow", targetId: "self", smoothing: 0.18 },
  Animation: {
    type: "Animation",
    assetId: "player",
    frameWidth: 48,
    frameHeight: 48,
    totalFrames: 4,
    framesPerSecond: 8,
    loop: true,
  },
  Tilemap: {
    type: "Tilemap",
    tilesetId: "tiles",
    tileWidth: 32,
    tileHeight: 32,
    columns: 8,
    gridWidth: 10,
    gridHeight: 10,
    tiles: [],
    solid: false,
  },
  Text: { type: "Text", text: "Label", fontAssetId: "", size: 24, color: "#ffffff", align: "left" },
  AudioSource: { type: "AudioSource", assetId: "sfx", volume: 1, loop: false, playOnStart: true },
  AudioListener: { type: "AudioListener", enabled: true },
  Tween: {
    type: "Tween",
    property: "position.x",
    startValue: 0,
    endValue: 100,
    duration: 1,
    easing: "linear",
    loop: true,
    pingPong: true,
    active: true,
  },
  FollowPath: { type: "FollowPath", points: [], speed: 100, loop: true },
  StateMachine: { type: "StateMachine", initialState: "idle", states: [{ name: "idle" }] },
  Script: { type: "Script", handlers: [] },
  ParticleSystem: {
    type: "ParticleSystem",
    maxParticles: 40,
    emissionRate: 18,
    lifetime: 0.9,
    speed: 70,
    gravityScale: 0.35,
    colorStart: "#00f0ff",
    colorEnd: "#8b5cf6",
    sizeStart: 5,
    sizeEnd: 0,
    shape: "point",
    width: 0,
    height: 0,
    active: true,
  },
  Light2D: { type: "Light2D", kind: "point", range: 200, intensity: 1, color: "#ffffff" },
  NineSlice: {
    type: "NineSlice",
    assetId: "panel",
    width: 100,
    height: 100,
    leftWidth: 10,
    rightWidth: 10,
    topHeight: 10,
    bottomHeight: 10,
  },
};

const EDITOR_CAPABILITIES = {
  purpose:
    "Author the full game with these tools. The editor is for pixel-level nudges (gizmos, snap, zoom, play feel) without extra tokens.",
  panels: {
    Hierarchy: ["list_entities", "add_entity", "remove_entity", "update_entity", "reorder_entity", "duplicate_entity"],
    Inspector: ["upsert_component", "update_component", "add_component", "remove_component", "list_components", "get_entity"],
    World: ["get_scene_settings", "set_viewport", "set_gravity", "set_responsive", "set_safe_area", "set_game_rules"],
    Input: ["get_input_map", "define_input_action", "remove_input_action", "apply_input_preset", "apply_recipe"],
    Timeline: ["get_timeline", "set_timeline", "upsert_timeline_track", "remove_timeline_track"],
    Tilemap: ["add_tilemap", "paint_tile", "paint_tiles", "upsert_component"],
    GUI: ["list_gui_nodes", "add_gui_node", "update_gui_node", "remove_gui_node", "list_gui_components"],
    Prefabs: ["list_prefabs", "create_prefab", "instantiate_prefab", "remove_prefab"],
    Levels: ["list_levels", "add_level", "update_level", "remove_level", "set_level_on_complete", "set_level_rules"],
    Assets: ["list_assets", "add_asset", "import_image", "import_audio", "remove_asset"],
    Recipes: ["list_recipes", "describe_recipe", "apply_recipe"],
    PlayVerify: ["simulate_runtime_step", "inspect_layout", "validate_scene", "run_doctor", "raycast"],
  },
  editorOnly: [
    "Canvas gizmos / drag / snap / zoom",
    "Live Phaser play host (use simulate_runtime_step to verify logic)",
    "UI undo/redo and command palette",
    "Tile paint cursor on the canvas",
  ],
};

export function registerInspectorTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "list_editor_capabilities",
    "Map of every editor panel to the MCP tools that cover it. Call this when planning a full authoring pass.",
    {},
    async () => toolJson(EDITOR_CAPABILITIES),
  );

  server.tool(
    "upsert_component",
    "Inspector equivalent: create a component with editor defaults, or merge fields into the existing one of that type. Use this for any inspector field the dedicated tools do not cover.",
    {
      scenePath: z.string(),
      entityId: z.string(),
      component: z
        .object({ type: z.string().min(1) })
        .catchall(z.unknown())
        .describe("Must include type; other fields merge onto defaults or the existing component"),
    },
    async ({ scenePath, entityId, component }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      const type = component.type;
      if (type === "Transform") {
        return toolJson({ error: "Use set_transform for Transform." }, true);
      }
      const existing = entity.components.find((c) => c.type === type);
      try {
        if (existing) {
          const merged = { ...existing, ...component, type };
          const parsed = GameKitComponentSchema.parse(merged);
          Object.assign(existing, parsed);
        } else {
          const defaults = { ...(DEFAULTS[type] ?? { type }) };
          if (type === "CameraFollow") {
            defaults.targetId = entity.id;
          }
          const parsed = GameKitComponentSchema.parse({ ...defaults, ...component, type });
          entity.components.push(parsed);
        }
      } catch (e) {
        return toolJson({ error: e instanceof Error ? e.message : String(e), hint: "Call list_component_types for fields." }, true);
      }
      await fileIO.writeScene(filename, scene);
      const saved = entity.components.find((c) => c.type === type);
      return toolJson({ success: true, upserted: type, component: saved, entity: summarizeEntity(entity) });
    },
  );

  server.tool(
    "set_player_controller",
    "Create or update PlayerController (speed, jumpVelocity, gravity). gravity 0 = top-down 4-way.",
    {
      scenePath: z.string(),
      entityId: z.string(),
      speed: z.number().optional(),
      jumpVelocity: z.number().optional(),
      gravity: z.number().optional(),
    },
    async ({ scenePath, entityId, speed, jumpVelocity, gravity }) => {
      return upsertTyped(fileIO, scenePath, entityId, "PlayerController", {
        ...(speed !== undefined ? { speed } : {}),
        ...(jumpVelocity !== undefined ? { jumpVelocity } : {}),
        ...(gravity !== undefined ? { gravity } : {}),
      });
    },
  );

  server.tool(
    "set_rigid_body",
    "Create or update RigidBody (velocity, mass, drag, isKinematic, gravityScale, useGravity).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      velocity: z.object({ x: z.number(), y: z.number() }).optional(),
      mass: z.number().positive().optional(),
      drag: z.number().min(0).optional(),
      isKinematic: z.boolean().optional(),
      gravityScale: z.number().optional(),
      useGravity: z.boolean().optional(),
      angularVelocity: z.number().optional(),
    },
    async ({ scenePath, entityId, ...props }) => {
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) patch[k] = v;
      }
      return upsertTyped(fileIO, scenePath, entityId, "RigidBody", patch);
    },
  );

  server.tool(
    "set_animation",
    "Create or update an Animation (sprite sheet) component.",
    {
      scenePath: z.string(),
      entityId: z.string(),
      assetId: z.string().optional(),
      frameWidth: z.number().positive().optional(),
      frameHeight: z.number().positive().optional(),
      totalFrames: z.number().int().positive().optional(),
      framesPerSecond: z.number().positive().optional(),
      loop: z.boolean().optional(),
      currentFrame: z.number().int().min(0).optional(),
    },
    async ({ scenePath, entityId, ...props }) => {
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) patch[k] = v;
      }
      return upsertTyped(fileIO, scenePath, entityId, "Animation", patch);
    },
  );

  server.tool(
    "set_follow_path",
    "Create or update FollowPath (patrol / moving platform).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
      speed: z.number().nonnegative().optional(),
      loop: z.boolean().optional(),
    },
    async ({ scenePath, entityId, points, speed, loop }) => {
      return upsertTyped(fileIO, scenePath, entityId, "FollowPath", {
        points,
        ...(speed !== undefined ? { speed } : {}),
        ...(loop !== undefined ? { loop } : {}),
      });
    },
  );

  server.tool(
    "add_fsm_state",
    "Append a StateMachine state (creates the component with idle if missing).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      name: z.string().min(1),
      on: z.record(z.string()).optional(),
      enter: z.array(z.object({ type: z.string() }).catchall(z.unknown())).optional(),
      exit: z.array(z.object({ type: z.string() }).catchall(z.unknown())).optional(),
      duration: z.number().positive().optional(),
      then: z.string().optional(),
      initial: z.boolean().optional().describe("If true, also set initialState to this name"),
    },
    async ({ scenePath, entityId, name, on, enter, exit, duration, then, initial }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      let sm = entity.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
      if (!sm) {
        sm = GameKitComponentSchema.parse(DEFAULTS.StateMachine) as StateMachineComponent;
        entity.components.push(sm);
      }
      const state = {
        name,
        ...(on ? { on } : {}),
        ...(enter ? { enter } : {}),
        ...(exit ? { exit } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(then ? { then } : {}),
      };
      sm.states = sm.states.filter((s) => s.name !== name);
      sm.states.push(state as StateMachineComponent["states"][number]);
      if (initial) sm.initialState = name;
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, state, initialState: sm.initialState, states: sm.states.map((s) => s.name) });
    },
  );

  server.tool(
    "add_audio_listener",
    "Add or enable an AudioListener on an entity (typically the player / camera).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      enabled: z.boolean().optional(),
    },
    async ({ scenePath, entityId, enabled }) => {
      return upsertTyped(fileIO, scenePath, entityId, "AudioListener", { enabled: enabled ?? true });
    },
  );

  server.tool(
    "remove_script_handler",
    "Remove Script handlers matching an event name.",
    {
      scenePath: z.string(),
      entityId: z.string(),
      event: z.string(),
    },
    async ({ scenePath, entityId, event }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
      if (!script) return toolJson({ error: "Entity has no Script." }, true);
      const before = script.handlers.length;
      script.handlers = script.handlers.filter((h) => h.event !== event);
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, removed: before - script.handlers.length, remaining: script.handlers.length });
    },
  );
}

async function upsertTyped(
  fileIO: FileIO,
  scenePath: string,
  entityId: string,
  type: string,
  patch: Record<string, unknown>,
) {
  const filename = fileIO.resolveScenePath(scenePath);
  const scene = await fileIO.readScene(filename);
  const entity = findEntity(scene, entityId);
  if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
  const existing = entity.components.find((c) => c.type === type);
  try {
    if (existing) {
      const parsed = GameKitComponentSchema.parse({ ...existing, ...patch, type });
      Object.assign(existing, parsed);
    } else {
      const defaults = { ...(DEFAULTS[type] ?? { type }) };
      if (type === "CameraFollow") defaults.targetId = entity.id;
      const parsed = GameKitComponentSchema.parse({ ...defaults, ...patch, type });
      entity.components.push(parsed);
    }
  } catch (e) {
    return toolJson({ error: e instanceof Error ? e.message : String(e) }, true);
  }
  await fileIO.writeScene(filename, scene);
  const saved = entity.components.find((c) => c.type === type);
  return toolJson({ success: true, component: saved });
}
