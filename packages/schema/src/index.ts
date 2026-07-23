import { z } from "zod";

export const GAMEKIT_SCHEMA_VERSION = 1 as const;

export const Vector2Schema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Vector2 = z.infer<typeof Vector2Schema>;

export const OrientationSchema = z.enum(["portrait", "landscape", "auto"]);
export type Orientation = z.infer<typeof OrientationSchema>;

export const SafeAreaConfigSchema = z.object({
  enabled: z.boolean(),
  padding: z.object({
    top: z.number(),
    bottom: z.number(),
    left: z.number(),
    right: z.number(),
  }),
});
export type SafeAreaConfig = z.infer<typeof SafeAreaConfigSchema>;

export const ResponsiveConfigSchema = z.object({
  mode: z.enum(["fixed", "scale", "adaptive"]),
  referenceWidth: z.number(),
  referenceHeight: z.number(),
  orientation: OrientationSchema,
  safeArea: SafeAreaConfigSchema,
});
export type ResponsiveConfig = z.infer<typeof ResponsiveConfigSchema>;

export const GameKitLevelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
  sceneIds: z.array(z.string().min(1)),
  unlocked: z.boolean(),
  /** Actions run after the level is completed (default runtime behavior unlocks the next level). */
  onComplete: z.array(z.lazy(() => ScriptActionSchema)).optional(),
  /** Partial rules overlaid on scene.gameRules when this level is active (level wins per key). */
  rules: z.lazy(() => GameRulesConfigSchema.partial()).optional(),
});
export type GameKitLevel = z.infer<typeof GameKitLevelSchema>;

export const GameSavePayloadSchema = z.object({
  version: z.literal(1),
  persistentState: z.record(z.unknown()),
  levels: z.array(z.object({ id: z.string().min(1), unlocked: z.boolean() })),
  currentSceneId: z.string().min(1).nullable(),
  currentLevelId: z.string().min(1).nullable(),
});
export type GameSavePayload = z.infer<typeof GameSavePayloadSchema>;

export const TransformComponentSchema = z.object({
  type: z.literal("Transform"),
  position: Vector2Schema,
  rotation: z.number().default(0),
  scale: Vector2Schema.default({ x: 1, y: 1 }),
});
export type TransformComponent = z.infer<typeof TransformComponentSchema>;

export const SpriteComponentSchema = z.object({
  type: z.literal("Sprite"),
  assetId: z.string().min(1),
  width: z.number(),
  height: z.number(),
  anchor: Vector2Schema.default({ x: 0.5, y: 0.5 }),
});
export type SpriteComponent = z.infer<typeof SpriteComponentSchema>;

export const AabbColliderComponentSchema = z.object({
  type: z.literal("AabbCollider"),
  offset: Vector2Schema.default({ x: 0, y: 0 }),
  size: Vector2Schema,
  isStatic: z.boolean().default(false),
  isTrigger: z.boolean().optional(),
  layer: z.number().optional(),
  mask: z.number().optional(),
});
export type AabbColliderComponent = z.infer<typeof AabbColliderComponentSchema>;

export const PlayerControllerComponentSchema = z.object({
  type: z.literal("PlayerController"),
  speed: z.number(),
  jumpVelocity: z.number(),
  gravity: z.number(),
});
export type PlayerControllerComponent = z.infer<typeof PlayerControllerComponentSchema>;

export const CameraFollowComponentSchema = z.object({
  type: z.literal("CameraFollow"),
  targetId: z.string().min(1),
  smoothing: z.number(),
});
export type CameraFollowComponent = z.infer<typeof CameraFollowComponentSchema>;

export const AnimationComponentSchema = z.object({
  type: z.literal("Animation"),
  assetId: z.string().min(1),
  frameWidth: z.number(),
  frameHeight: z.number(),
  totalFrames: z.number(),
  framesPerSecond: z.number(),
  loop: z.boolean().default(true),
  currentFrame: z.number().optional(),
});
export type AnimationComponent = z.infer<typeof AnimationComponentSchema>;

export const RigidBodyComponentSchema = z.object({
  type: z.literal("RigidBody"),
  velocity: Vector2Schema.default({ x: 0, y: 0 }),
  angularVelocity: z.number().default(0),
  mass: z.number().default(1),
  drag: z.number().default(0),
  isKinematic: z.boolean().default(false),
  gravityScale: z.number().default(1),
  useGravity: z.boolean().default(true),
});
export type RigidBodyComponent = z.infer<typeof RigidBodyComponentSchema>;

export const CircleColliderComponentSchema = z.object({
  type: z.literal("CircleCollider"),
  offset: Vector2Schema.default({ x: 0, y: 0 }),
  radius: z.number(),
  isStatic: z.boolean().default(false),
  isTrigger: z.boolean(),
  layer: z.number().optional(),
  mask: z.number().optional(),
});
export type CircleColliderComponent = z.infer<typeof CircleColliderComponentSchema>;

export const PolygonColliderComponentSchema = z.object({
  type: z.literal("PolygonCollider"),
  offset: Vector2Schema.default({ x: 0, y: 0 }),
  points: z.array(Vector2Schema),
  isStatic: z.boolean(),
  isTrigger: z.boolean().optional(),
  layer: z.number().optional(),
  mask: z.number().optional(),
});
export type PolygonColliderComponent = z.infer<typeof PolygonColliderComponentSchema>;

export const TilemapComponentSchema = z.object({
  type: z.literal("Tilemap"),
  tilesetId: z.string().min(1),
  tileWidth: z.number(),
  tileHeight: z.number(),
  columns: z.number(),
  gridWidth: z.number(),
  gridHeight: z.number(),
  tiles: z.array(z.number()).default([]),
});
export type TilemapComponent = z.infer<typeof TilemapComponentSchema>;

export const TextComponentSchema = z.object({
  type: z.literal("Text"),
  text: z.string(),
  fontAssetId: z.string(), // Can be empty
  size: z.number().default(16),
  color: z.string().default("#ffffff"),
  align: z.enum(["left", "center", "right"]).default("left"),
});
export type TextComponent = z.infer<typeof TextComponentSchema>;

export const AudioSourceComponentSchema = z.object({
  type: z.literal("AudioSource"),
  assetId: z.string().min(1),
  volume: z.number().default(1),
  loop: z.boolean().default(false),
  playOnStart: z.boolean().default(true),
});
export type AudioSourceComponent = z.infer<typeof AudioSourceComponentSchema>;

export const AudioListenerComponentSchema = z.object({
  type: z.literal("AudioListener"),
  enabled: z.boolean().default(true),
});
export type AudioListenerComponent = z.infer<typeof AudioListenerComponentSchema>;

export const TweenComponentSchema = z.object({
  type: z.literal("Tween"),
  property: z.enum(["position.x", "position.y", "rotation", "scale.x", "scale.y"]),
  startValue: z.number(),
  endValue: z.number(),
  duration: z.number(),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).default("linear"),
  loop: z.boolean().default(false),
  pingPong: z.boolean().default(false),
  elapsed: z.number().optional(),
  active: z.boolean().optional().default(true),
});
export type TweenComponent = z.infer<typeof TweenComponentSchema>;

export const FollowPathComponentSchema = z.object({
  type: z.literal("FollowPath"),
  points: z.array(Vector2Schema),
  speed: z.number(),
  loop: z.boolean().default(true),
  currentPointIndex: z.number().optional(),
  targetPointIndex: z.number().optional(),
});
export type FollowPathComponent = z.infer<typeof FollowPathComponentSchema>;

export const StateMachineStateSchema = z.object({
  name: z.string().min(1),
  on: z.record(z.string().min(1)).optional(),
});
export type StateMachineState = z.infer<typeof StateMachineStateSchema>;

export const StateMachineComponentSchema = z.object({
  type: z.literal("StateMachine"),
  initialState: z.string().min(1),
  currentState: z.string().min(1).optional(),
  states: z.array(StateMachineStateSchema),
});
export type StateMachineComponent = z.infer<typeof StateMachineComponentSchema>;

export const ScriptActionSchema = z.object({
  type: z.string().min(1),
}).catchall(z.unknown());
export type ScriptAction = z.infer<typeof ScriptActionSchema>;

export const ScriptHandlerSchema = z.object({
  event: z.string().min(1),
  actions: z.array(ScriptActionSchema),
});
export type ScriptHandler = z.infer<typeof ScriptHandlerSchema>;

export const ScriptComponentSchema = z.object({
  type: z.literal("Script"),
  handlers: z.array(ScriptHandlerSchema),
});
export type ScriptComponent = z.infer<typeof ScriptComponentSchema>;

export const ParticleSystemComponentSchema = z.object({
  type: z.literal("ParticleSystem"),
  maxParticles: z.number().default(32),
  emissionRate: z.number().default(12),
  lifetime: z.number().default(0.8),
  speed: z.number().default(60),
  gravityScale: z.number().default(0.4),
  colorStart: z.string().default("#00f0ff"),
  colorEnd: z.string().default("#8b5cf6"),
  sizeStart: z.number().default(4),
  sizeEnd: z.number().default(0),
  shape: z.enum(["point", "box"]).default("point"),
  width: z.number().default(0),
  height: z.number().default(0),
  active: z.boolean().default(true),
});
export type ParticleSystemComponent = z.infer<typeof ParticleSystemComponentSchema>;

export const Light2DComponentSchema = z.object({
  type: z.literal("Light2D"),
  kind: z.enum(["point", "spot"]).default("point"),
  range: z.number().default(200),
  intensity: z.number().default(1),
  color: z.string().default("#ffffff"),
});
export type Light2DComponent = z.infer<typeof Light2DComponentSchema>;

export const NineSliceComponentSchema = z.object({
  type: z.literal("NineSlice"),
  assetId: z.string().min(1),
  width: z.number().default(100),
  height: z.number().default(100),
  leftWidth: z.number().default(10),
  rightWidth: z.number().default(10),
  topHeight: z.number().default(10),
  bottomHeight: z.number().default(10),
});
export type NineSliceComponent = z.infer<typeof NineSliceComponentSchema>;

export const GameKitComponentSchema = z.discriminatedUnion("type", [
  TransformComponentSchema,
  SpriteComponentSchema,
  AabbColliderComponentSchema,
  CircleColliderComponentSchema,
  PolygonColliderComponentSchema,
  PlayerControllerComponentSchema,
  RigidBodyComponentSchema,
  CameraFollowComponentSchema,
  AnimationComponentSchema,
  TilemapComponentSchema,
  TextComponentSchema,
  AudioSourceComponentSchema,
  AudioListenerComponentSchema,
  TweenComponentSchema,
  FollowPathComponentSchema,
  StateMachineComponentSchema,
  ScriptComponentSchema,
  ParticleSystemComponentSchema,
  Light2DComponentSchema,
  NineSliceComponentSchema,
]);
export type GameKitComponent = z.infer<typeof GameKitComponentSchema>;

export const ComponentTypeSchema = z.enum([
  "Transform",
  "Sprite",
  "AabbCollider",
  "CircleCollider",
  "PolygonCollider",
  "PlayerController",
  "RigidBody",
  "CameraFollow",
  "Animation",
  "Tilemap",
  "Text",
  "AudioSource",
  "AudioListener",
  "Tween",
  "FollowPath",
  "StateMachine",
  "Script",
  "ParticleSystem",
  "Light2D",
  "NineSlice",
]);

export const GameKitEntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  components: z.array(GameKitComponentSchema),
  /** Gameplay tags for rules (collect/reach/hazard). e.g. ["coin"], ["goal"]. */
  tags: z.array(z.string().min(1)).optional(),
});
export type GameKitEntity = z.infer<typeof GameKitEntitySchema>;

export const GuiBaseSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  anchorX: z.number().optional(),
  anchorY: z.number().optional(),
  visible: z.boolean().optional(),
  interactive: z.boolean().optional(),
});
export type GuiBase = z.infer<typeof GuiBaseSchema>;

export const GuiTextSchema = GuiBaseSchema.extend({
  type: z.literal("Text"),
  text: z.string(),
  fontSize: z.number().optional(),
  color: z.string().min(1).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});
export type GuiText = z.infer<typeof GuiTextSchema>;

export const GuiButtonSchema = GuiBaseSchema.extend({
  type: z.literal("Button"),
  text: z.string(),
  action: z.string().min(1).optional(),
  fontSize: z.number().optional(),
  color: z.string().min(1).optional(),
  backgroundColor: z.string().min(1).optional(),
});
export type GuiButton = z.infer<typeof GuiButtonSchema>;

export const GuiImageSchema = GuiBaseSchema.extend({
  type: z.literal("Image"),
  assetId: z.string().min(1),
});
export type GuiImage = z.infer<typeof GuiImageSchema>;

export const GuiNodeSchema = z.discriminatedUnion("type", [
  GuiTextSchema,
  GuiButtonSchema,
  GuiImageSchema,
]);
export type GuiNode = z.infer<typeof GuiNodeSchema>;

export const GuiComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(GuiNodeSchema),
});
export type GuiComponent = z.infer<typeof GuiComponentSchema>;

export const GuiComponentInstanceSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  visible: z.boolean().optional(),
  interactive: z.boolean().optional(),
  nodeOverrides: z.record(z.record(z.unknown()).or(z.any())).optional(),
});
export type GuiComponentInstance = z.infer<typeof GuiComponentInstanceSchema>;

export const KeyframeSchema = z.object({
  time: z.number(),
  value: z.number().or(z.array(z.number())),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).optional(),
});
export type Keyframe = z.infer<typeof KeyframeSchema>;

export const TimelineTrackSchema = z.object({
  entityId: z.string().min(1),
  property: z.enum(["position.x", "position.y", "rotation", "scale.x", "scale.y", "alpha"]),
  keyframes: z.array(KeyframeSchema),
});
export type TimelineTrack = z.infer<typeof TimelineTrackSchema>;

export const TimelineDataSchema = z.object({
  tracks: z.array(TimelineTrackSchema).default([]),
  duration: z.number().default(0),
  loop: z.boolean().default(false),
  playing: z.boolean().default(false),
});
export type TimelineData = z.infer<typeof TimelineDataSchema>;

/** On-screen touch controls. left/right feed the joystick axis; jump/fire/action are discrete buttons. */
export const TouchControlSchema = z.enum(["left", "right", "jump", "fire", "action"]);
export type TouchControl = z.infer<typeof TouchControlSchema>;

export const InputActionBindingSchema = z.object({
  action: z.string().min(1),
  keys: z.array(z.string().min(1)),
  touchControl: TouchControlSchema.optional(),
  gamepad: z.string().min(1).optional(),
});
export type InputActionBinding = z.infer<typeof InputActionBindingSchema>;

export const InputMapConfigSchema = z.object({
  bindings: z.array(InputActionBindingSchema),
});
export type InputMapConfig = z.infer<typeof InputMapConfigSchema>;

export const FallDeathActionSchema = z.enum(["gameOver", "respawn"]);
export type FallDeathAction = z.infer<typeof FallDeathActionSchema>;

/** How a hazard reacts when it fires (legacy fall + extensible hazards). */
export const HazardOnTriggerSchema = z.enum(["respawn", "gameOver", "actions"]);
export type HazardOnTrigger = z.infer<typeof HazardOnTriggerSchema>;

export const GameRuleHazardSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
  })
  .catchall(z.unknown());
export type GameRuleHazard = z.infer<typeof GameRuleHazardSchema>;

export const ObjectiveCompareOpSchema = z.enum(["eq", "gte", "lte", "truthy"]);
export type ObjectiveCompareOp = z.infer<typeof ObjectiveCompareOpSchema>;

export const GameRuleObjectiveSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
  })
  .catchall(z.unknown());
export type GameRuleObjective = z.infer<typeof GameRuleObjectiveSchema>;

export const ObjectiveModeSchema = z.enum(["all", "any"]);
export type ObjectiveMode = z.infer<typeof ObjectiveModeSchema>;

export const GameRulesConfigSchema = z.object({
  // --- Session / legacy fall fields (kept for backward compatibility) ---
  fallDeathEnabled: z.boolean().default(true),
  fallY: z.number().optional(),
  fallMargin: z.number().default(120),
  onFall: FallDeathActionSchema.default("gameOver"),
  lives: z.number().default(3).transform((v) => Math.max(0, Math.floor(v))),
  spawnPoint: Vector2Schema.optional(),
  gameOverMessage: z.string().default("Game Over").transform((v) => v.trim() || "Game Over"),
  winMessage: z.string().default("You win!").transform((v) => v.trim() || "You win!"),
  // --- Programmable rules ---
  hazards: z.array(GameRuleHazardSchema).default([]),
  objectives: z.array(GameRuleObjectiveSchema).default([]),
  objectiveMode: ObjectiveModeSchema.default("all"),
  onStart: z.array(ScriptActionSchema).default([]),
  onWin: z.array(ScriptActionSchema).default([]),
  onLose: z.array(ScriptActionSchema).default([]),
});
export type GameRulesConfig = z.infer<typeof GameRulesConfigSchema>;

export const DEFAULT_INPUT_MAP: InputMapConfig = {
  bindings: [
    { action: "move_left", keys: ["ArrowLeft", "a", "A"], touchControl: "left", gamepad: "LEFT_STICK_X_NEG" },
    { action: "move_right", keys: ["ArrowRight", "d", "D"], touchControl: "right", gamepad: "LEFT_STICK_X_POS" },
    { action: "jump", keys: ["ArrowUp", " ", "w", "W"], touchControl: "jump", gamepad: "A" },
    { action: "fire", keys: ["j", "J"], touchControl: "fire", gamepad: "B" },
    { action: "action", keys: ["k", "K"], touchControl: "action", gamepad: "X" },
  ],
};

export const DEFAULT_GAME_RULES: GameRulesConfig = {
  fallDeathEnabled: true,
  fallMargin: 120,
  onFall: "gameOver",
  lives: 3,
  gameOverMessage: "Game Over",
  winMessage: "You win!",
  hazards: [],
  objectives: [],
  objectiveMode: "all",
  onStart: [],
  onWin: [],
  onLose: [],
};

/**
 * Normalize rules: parse defaults, and if `hazards` is empty synthesize a fall hazard
 * from legacy fallDeath* fields so old scenes keep working.
 */
export function resolveGameRules(rules?: GameRulesConfig | null): GameRulesConfig {
  const parsed = GameRulesConfigSchema.parse(rules ?? {});
  if (parsed.hazards.length === 0 && parsed.fallDeathEnabled !== false) {
    parsed.hazards = [
      {
        id: "fall",
        type: "fall",
        enabled: true,
        fallY: parsed.fallY,
        fallMargin: parsed.fallMargin,
        onTrigger: parsed.onFall === "respawn" ? "respawn" : "gameOver",
      },
    ];
  }
  return parsed;
}

/** Shallow-merge project/level partial rules under scene rules, then resolve. */
export function mergeGameRules(
  ...layers: Array<Partial<GameRulesConfig> | GameRulesConfig | null | undefined>
): GameRulesConfig {
  const merged: Record<string, unknown> = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) continue;
      // Arrays and objects from later layers replace earlier ones entirely.
      merged[key] = value;
    }
  }
  return resolveGameRules(merged as GameRulesConfig);
}

/** True if entity carries the given tag (case-sensitive). */
export function entityHasTag(entity: { tags?: string[] | null; name?: string }, tag: string): boolean {
  if (entity.tags?.includes(tag)) return true;
  return false;
}

/**
 * Legacy bridge: infer tags from entity name for older scenes that never set `tags`.
 * Does not mutate; returns effective tags.
 */
export function effectiveEntityTags(entity: { tags?: string[] | null; name: string }): string[] {
  if (entity.tags && entity.tags.length > 0) return entity.tags;
  const name = entity.name.toLowerCase();
  const tags: string[] = [];
  if (/(coin|pickup|gem|target)/.test(name)) tags.push("coin");
  if (/(goal|flag|finish)/.test(name)) tags.push("goal");
  if (/(hazard|spike|lava|kill)/.test(name)) tags.push("hazard");
  return tags;
}

export function resolveFallDeathY(
  scene: {
    viewport: { height: number };
    entities: GameKitEntity[];
    gameRules?: GameRulesConfig;
  },
  rules?: GameRulesConfig,
): number {
  const r = resolveGameRules(rules ?? scene.gameRules);
  if (typeof r.fallY === "number") return r.fallY;

  let maxBottom = Number.NEGATIVE_INFINITY;
  for (const entity of scene.entities) {
    const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
    const aabb = entity.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
    if (!transform || !aabb || !aabb.isStatic || aabb.isTrigger) continue;
    const bottom = transform.position.y + aabb.offset.y + aabb.size.y;
    if (bottom > maxBottom) maxBottom = bottom;
  }
  if (!Number.isFinite(maxBottom)) {
    maxBottom = scene.viewport.height;
  }
  return maxBottom + r.fallMargin;
}

export const GameKitSceneSchema = z.object({
  schemaVersion: z.literal(GAMEKIT_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    background: z.string().min(1),
  }),
  gravity: Vector2Schema,
  assets: z.array(z.string().min(1)).default([]),
  entities: z.array(GameKitEntitySchema).default([]),
  responsive: ResponsiveConfigSchema.default({
    mode: "scale",
    referenceWidth: 390,
    referenceHeight: 844,
    orientation: "portrait",
    safeArea: {
      enabled: true,
      padding: { top: 0, bottom: 0, left: 0, right: 0 }
    }
  }),
  timeline: TimelineDataSchema.default({ tracks: [], duration: 0, loop: false, playing: false }),
  gui: z.object({
    nodes: z.array(GuiNodeSchema).default([]),
    componentInstances: z.array(GuiComponentInstanceSchema).default([]),
  }).default({ nodes: [], componentInstances: [] }),
  inputMap: InputMapConfigSchema.optional(),
  gameRules: GameRulesConfigSchema.optional(),
});
export type GameKitScene = z.infer<typeof GameKitSceneSchema>;

export const GameKitAssetSchema = z.object({
  id: z.string().min(1),
  file: z.string().min(1),
  kind: z.enum(["image", "audio", "font"]),
  width: z.number().optional(),
  height: z.number().optional(),
});
export type GameKitAsset = z.infer<typeof GameKitAssetSchema>;

export const SceneTransitionTypeSchema = z.enum(["none", "fade", "slide"]);
export type SceneTransitionType = z.infer<typeof SceneTransitionTypeSchema>;

export const SceneTransitionDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fromSceneId: z.string().min(1).optional(),
  toSceneId: z.string().min(1),
  type: SceneTransitionTypeSchema,
  duration: z.number(),
});
export type SceneTransitionDef = z.infer<typeof SceneTransitionDefSchema>;

export const GameKitProjectSchema = z.object({
  schemaVersion: z.literal(GAMEKIT_SCHEMA_VERSION),
  name: z.string().min(1),
  scenes: z.array(z.string().min(1)),
  levels: z.array(GameKitLevelSchema).default([]),
  assets: z.array(GameKitAssetSchema).default([]),
  guiComponents: z.array(GuiComponentSchema).default([]),
  transitions: z.array(SceneTransitionDefSchema).optional(),
  activeScene: z.string().min(1).optional(),
});
export type GameKitProject = z.infer<typeof GameKitProjectSchema>;

export const GameKitPrefabSchema = z.object({
  schemaVersion: z.literal(GAMEKIT_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1),
  sourceEntityName: z.string().min(1).optional(),
  components: z.array(GameKitComponentSchema),
  createdAt: z.string().min(1).optional(),
});
export type GameKitPrefab = z.infer<typeof GameKitPrefabSchema>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export function createEmptyScene(name = "Main Scene"): GameKitScene {
  return {
    schemaVersion: GAMEKIT_SCHEMA_VERSION,
    id: slugify(name) || "main",
    name,
    viewport: {
      width: 390,
      height: 844,
      background: "#101820"
    },
    gravity: { x: 0, y: 1800 },
    assets: [],
    entities: [],
    responsive: {
      mode: "scale",
      referenceWidth: 390,
      referenceHeight: 844,
      orientation: "portrait",
      safeArea: {
        enabled: true,
        padding: { top: 0, bottom: 0, left: 0, right: 0 }
      }
    },
    timeline: { tracks: [], duration: 0, loop: false, playing: false },
    gui: { nodes: [], componentInstances: [] },
    inputMap: { bindings: [...DEFAULT_INPUT_MAP.bindings] },
    gameRules: {
      ...DEFAULT_GAME_RULES,
      hazards: [],
      objectives: [],
      onStart: [],
      onWin: [],
      onLose: [],
    },
  };
}

export function createProject(name = "Playroom Game"): GameKitProject {
  return {
    schemaVersion: GAMEKIT_SCHEMA_VERSION,
    name,
    scenes: ["menu.scene.json", "settings.scene.json", "main.scene.json"],
    activeScene: "menu.scene.json",
    levels: [
      {
        id: "level-1",
        name: "Level 1",
        order: 1,
        sceneIds: ["main"],
        unlocked: true
      }
    ],
    assets: [],
    guiComponents: createDefaultGuiComponents(),
    transitions: createDefaultMenuTransitions(),
  };
}

export function createEntity(name: string, position: Vector2 = { x: 0, y: 0 }): GameKitEntity {
  return {
    id: createId(name),
    name,
    components: [
      {
        type: "Transform",
        position,
        rotation: 0,
        scale: { x: 1, y: 1 }
      }
    ]
  };
}

export function createLevel(name: string, order: number, sceneIds: string[] = []): GameKitLevel {
  return {
    id: slugify(name) || `level-${order}`,
    name,
    order,
    sceneIds,
    unlocked: order === 1,
  };
}

/** Normalize scene file keys so "main" and "main.scene.json" compare equal. */
export function normalizeSceneFileId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return trimmed;
  return trimmed.endsWith(".scene.json") ? trimmed : `${trimmed}.scene.json`;
}

/**
 * Find the project level that owns a scene (by scene id or file name).
 * Prefers the lowest `order` when multiple levels share a scene.
 */
export function findLevelForScene(
  levels: GameKitLevel[],
  sceneIdOrFile: string | null | undefined,
): GameKitLevel | null {
  if (!sceneIdOrFile) return null;
  const target = normalizeSceneFileId(sceneIdOrFile);
  const bare = target.replace(/\.scene\.json$/, "");
  const matches = levels.filter((level) =>
    level.sceneIds.some((sid) => {
      const n = normalizeSceneFileId(sid);
      return n === target || sid === bare || sid === sceneIdOrFile;
    }),
  );
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => a.order - b.order)[0] ?? null;
}

export function createGuiComponent(name: string): GuiComponent {
  return {
    id: slugify(name) || `component-${Math.random().toString(36).slice(2, 8)}`,
    name,
    nodes: []
  };
}

export function createGuiComponentInstance(
  componentId: string,
  position: Vector2 = { x: 0, y: 0 }
): GuiComponentInstance {
  return {
    id: createId("inst"),
    componentId,
    x: position.x,
    y: position.y,
    visible: true
  };
}

/** Canonical GUI button action event names for starter menu flow. */
export const GUI_MENU_EVENTS = {
  startGame: "startGame",
  openSettings: "openSettings",
  backToMenu: "backToMenu",
  resumeGame: "resumeGame",
  restartLevel: "restartLevel",
  retryGame: "retryGame",
  nextLevel: "nextLevel",
  toggleMusic: "toggleMusic",
  toggleSfx: "toggleSfx",
  cycleQuality: "cycleQuality",
} as const;

const MENU_VIEWPORT = {
  width: 390,
  height: 844,
  background: "#06090e",
} as const;

const PAD = 24;
const CONTENT_W = MENU_VIEWPORT.width - PAD * 2;
const BTN_W = 280;
const BTN_H = 52;
const BTN_X = Math.round((MENU_VIEWPORT.width - BTN_W) / 2);
const PANEL_X = PAD;
const PANEL_W = CONTENT_W;

/** Design tokens aligned with editor brief (Cyber Cyan / dark stack). */
const C = {
  bg: "#06090e",
  panel: "#0f1520",
  panelBorder: "#1a2332",
  surface: "#121824",
  btn: "#1a2332",
  btnPrimary: "#0d3d42",
  btnPrimaryText: "#00f0ff",
  btnSecondary: "#1a1f35",
  btnSecondaryText: "#c4b5fd",
  btnDanger: "#2a1520",
  text: "#f1f5f9",
  muted: "#94a3b8",
  dim: "#64748b",
  cyan: "#00f0ff",
  violet: "#8b5cf6",
  gold: "#ffb300",
  green: "#10b981",
} as const;

function menuControllerEntity(
  id: string,
  name: string,
  handlers: Array<{ event: string; actions: ScriptAction[] }>,
): GameKitEntity {
  return {
    id,
    name,
    components: [
      {
        type: "Transform",
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      {
        type: "Script",
        handlers,
      },
    ],
  };
}

function guiButton(
  id: string,
  text: string,
  y: number,
  action: string | undefined,
  opts?: {
    width?: number;
    height?: number;
    x?: number;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    interactive?: boolean;
  },
): GuiNode {
  const width = opts?.width ?? BTN_W;
  const height = opts?.height ?? BTN_H;
  const x = opts?.x ?? BTN_X;
  return {
    id,
    type: "Button",
    x,
    y,
    width,
    height,
    text,
    ...(action ? { action } : {}),
    fontSize: opts?.fontSize ?? 16,
    color: opts?.color ?? C.text,
    backgroundColor: opts?.backgroundColor ?? C.btn,
    interactive: opts?.interactive ?? Boolean(action),
    visible: true,
  };
}

function guiText(
  id: string,
  text: string,
  y: number,
  opts?: {
    fontSize?: number;
    color?: string;
    height?: number;
    align?: "left" | "center" | "right";
    x?: number;
    width?: number;
  },
): GuiNode {
  return {
    id,
    type: "Text",
    x: opts?.x ?? PAD,
    y,
    width: opts?.width ?? CONTENT_W,
    height: opts?.height ?? 40,
    text,
    fontSize: opts?.fontSize ?? 18,
    color: opts?.color ?? C.text,
    align: opts?.align ?? "center",
    visible: true,
  };
}

/** Non-interactive panel chrome drawn as a full-width Button without action. */
function guiPanel(
  id: string,
  y: number,
  height: number,
  opts?: { x?: number; width?: number; backgroundColor?: string },
): GuiNode {
  return guiButton(id, " ", y, undefined, {
    x: opts?.x ?? PANEL_X,
    width: opts?.width ?? PANEL_W,
    height,
    backgroundColor: opts?.backgroundColor ?? C.panel,
    fontSize: 1,
    color: C.panel,
    interactive: false,
  });
}

/** Full-screen start menu with a filled example UI layout. */
export function createMenuScene(projectName = "Playroom Game"): GameKitScene {
  const scene = createEmptyScene("Menu");
  scene.id = "menu";
  scene.name = "Menu";
  scene.viewport = { ...MENU_VIEWPORT, background: C.bg };
  scene.gravity = { x: 0, y: 0 };
  scene.gui = {
    nodes: [
      // Top brand strip
      guiPanel("menu-top-bar", 0, 56, { x: 0, width: MENU_VIEWPORT.width, backgroundColor: C.surface }),
      guiText("menu-brand", "PLAYROOM", 16, {
        fontSize: 12,
        color: C.cyan,
        height: 24,
        align: "left",
        x: PAD,
      }),
      guiText("menu-version", "v0.1 demo", 16, {
        fontSize: 11,
        color: C.dim,
        height: 24,
        align: "right",
        x: PAD,
      }),

      // Hero card
      guiPanel("menu-hero-panel", 88, 200),
      guiText("menu-hero-kicker", "START SCREEN", 104, {
        fontSize: 11,
        color: C.violet,
        height: 20,
      }),
      guiText("title-game", projectName, 132, {
        fontSize: 30,
        color: C.cyan,
        height: 44,
      }),
      guiText("subtitle-tagline", "Build · Play · Ship", 180, {
        fontSize: 15,
        color: C.muted,
        height: 24,
      }),
      guiText("subtitle-hint", "Edit this layout in the GUI panel", 212, {
        fontSize: 12,
        color: C.dim,
        height: 22,
      }),
      guiText("menu-progress", "Progress  ·  Level 1 unlocked", 244, {
        fontSize: 12,
        color: C.gold,
        height: 22,
      }),

      // Primary actions
      guiButton("btn-play", "▶  Play", 316, GUI_MENU_EVENTS.startGame, {
        height: 56,
        fontSize: 18,
        color: C.btnPrimaryText,
        backgroundColor: C.btnPrimary,
      }),
      guiButton("btn-settings", "⚙  Settings", 384, GUI_MENU_EVENTS.openSettings, {
        height: 48,
        fontSize: 15,
        color: C.btnSecondaryText,
        backgroundColor: C.btnSecondary,
      }),

      // How to play card
      guiPanel("menu-howto-panel", 456, 168),
      guiText("menu-howto-title", "HOW TO PLAY", 472, {
        fontSize: 11,
        color: C.cyan,
        height: 20,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("menu-howto-move", "Move     A / D  or  ← →", 500, {
        fontSize: 13,
        color: C.text,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("menu-howto-jump", "Jump     Space  /  W  /  ↑", 528, {
        fontSize: 13,
        color: C.text,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("menu-howto-fire", "Fire      J     ·  Action  K", 556, {
        fontSize: 13,
        color: C.text,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("menu-howto-touch", "Touch    left stick  ·  right buttons", 584, {
        fontSize: 12,
        color: C.muted,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),

      // Footer
      guiPanel("menu-footer", 780, 64, { x: 0, width: MENU_VIEWPORT.width, backgroundColor: C.surface }),
      guiText("menu-footer-credits", "Made with Playroom  ·  Double-click labels to edit", 800, {
        fontSize: 11,
        color: C.dim,
        height: 24,
      }),
    ],
    componentInstances: [],
  };
  scene.entities = [
    menuControllerEntity("menu-controller", "Menu Controller", [
      {
        event: GUI_MENU_EVENTS.startGame,
        actions: [{ type: "switchScene", sceneId: "main" }],
      },
      {
        event: GUI_MENU_EVENTS.openSettings,
        actions: [{ type: "switchScene", sceneId: "settings" }],
      },
    ]),
  ];
  scene.gameRules = {
    ...DEFAULT_GAME_RULES,
    fallDeathEnabled: false,
    hazards: [],
    objectives: [],
    onStart: [],
    onWin: [],
    onLose: [],
  };
  return scene;
}

/** Full-screen settings with filled Audio / Display / Controls sections. */
export function createSettingsScene(): GameKitScene {
  const scene = createEmptyScene("Settings");
  scene.id = "settings";
  scene.name = "Settings";
  scene.viewport = { ...MENU_VIEWPORT, background: C.bg };
  scene.gravity = { x: 0, y: 0 };

  const rowH = 44;
  const toggleW = 72;
  const toggleX = MENU_VIEWPORT.width - PAD - toggleW;

  scene.gui = {
    nodes: [
      // Header
      guiPanel("settings-header", 0, 72, { x: 0, width: MENU_VIEWPORT.width, backgroundColor: C.surface }),
      guiText("title-settings", "Settings", 22, {
        fontSize: 24,
        color: C.cyan,
        height: 36,
        align: "left",
        x: PAD,
      }),

      // ── Audio ──
      guiPanel("settings-audio-panel", 96, 168),
      guiText("settings-audio-title", "AUDIO", 112, {
        fontSize: 11,
        color: C.violet,
        height: 18,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("label-music", "Music", 148, {
        fontSize: 15,
        color: C.text,
        height: rowH,
        align: "left",
        x: PAD + 16,
        width: 160,
      }),
      guiText("value-music", "On", 148, {
        fontSize: 13,
        color: C.muted,
        height: rowH,
        align: "right",
        x: PAD + 16,
        width: CONTENT_W - 32 - toggleW - 12,
      }),
      guiButton("btn-music", "On", 152, GUI_MENU_EVENTS.toggleMusic, {
        x: toggleX,
        width: toggleW,
        height: 36,
        fontSize: 13,
        color: C.green,
        backgroundColor: "#0f2a22",
      }),
      guiText("label-sfx", "Sound FX", 200, {
        fontSize: 15,
        color: C.text,
        height: rowH,
        align: "left",
        x: PAD + 16,
        width: 160,
      }),
      guiText("value-sfx", "On", 200, {
        fontSize: 13,
        color: C.muted,
        height: rowH,
        align: "right",
        x: PAD + 16,
        width: CONTENT_W - 32 - toggleW - 12,
      }),
      guiButton("btn-sfx", "On", 204, GUI_MENU_EVENTS.toggleSfx, {
        x: toggleX,
        width: toggleW,
        height: 36,
        fontSize: 13,
        color: C.green,
        backgroundColor: "#0f2a22",
      }),

      // ── Display ──
      guiPanel("settings-display-panel", 288, 148),
      guiText("settings-display-title", "DISPLAY", 304, {
        fontSize: 11,
        color: C.violet,
        height: 18,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("label-quality", "Quality", 340, {
        fontSize: 15,
        color: C.text,
        height: rowH,
        align: "left",
        x: PAD + 16,
        width: 140,
      }),
      guiText("value-quality", "High", 340, {
        fontSize: 13,
        color: C.muted,
        height: rowH,
        align: "right",
        x: PAD + 16,
        width: CONTENT_W - 32 - 96 - 12,
      }),
      guiButton("btn-quality", "High", 344, GUI_MENU_EVENTS.cycleQuality, {
        x: MENU_VIEWPORT.width - PAD - 96,
        width: 96,
        height: 36,
        fontSize: 13,
        color: C.cyan,
        backgroundColor: C.btnPrimary,
      }),
      guiText("label-safe-area", "Safe area padding enabled", 392, {
        fontSize: 12,
        color: C.dim,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),

      // ── Controls ──
      guiPanel("settings-controls-panel", 460, 200),
      guiText("settings-controls-title", "CONTROLS", 476, {
        fontSize: 11,
        color: C.violet,
        height: 18,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("label-controls-move", "Move     A D  ·  Arrow keys", 508, {
        fontSize: 13,
        color: C.text,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("label-controls-jump", "Jump     Space  ·  W  ·  ↑", 536, {
        fontSize: 13,
        color: C.text,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("label-controls-fire", "Fire      J  ·  Gamepad B", 564, {
        fontSize: 13,
        color: C.text,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("label-controls-action", "Action   K  ·  Gamepad X", 592, {
        fontSize: 13,
        color: C.text,
        height: 22,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),
      guiText("label-controls-hint", "Edit bindings in Scene Settings → Input Map", 624, {
        fontSize: 11,
        color: C.dim,
        height: 20,
        align: "left",
        x: PAD + 16,
        width: CONTENT_W - 32,
      }),

      // Back
      guiButton("btn-back", "←  Back to Menu", 700, GUI_MENU_EVENTS.backToMenu, {
        height: 52,
        fontSize: 16,
        color: C.text,
        backgroundColor: C.btn,
      }),
      guiText("settings-footer", "Toggles store vars (musicOn, sfxOn, quality) — wire audio later", 768, {
        fontSize: 10,
        color: C.dim,
        height: 36,
      }),
    ],
    componentInstances: [],
  };
  scene.entities = [
    menuControllerEntity("settings-controller", "Settings Controller", [
      {
        event: GUI_MENU_EVENTS.backToMenu,
        actions: [{ type: "switchScene", sceneId: "menu" }],
      },
      {
        event: GUI_MENU_EVENTS.toggleMusic,
        actions: [{ type: "setVariable", key: "musicOn", value: true }],
      },
      {
        event: GUI_MENU_EVENTS.toggleSfx,
        actions: [{ type: "setVariable", key: "sfxOn", value: true }],
      },
      {
        event: GUI_MENU_EVENTS.cycleQuality,
        actions: [{ type: "setVariable", key: "quality", value: "high" }],
      },
    ]),
  ];
  scene.gameRules = {
    ...DEFAULT_GAME_RULES,
    fallDeathEnabled: false,
    hazards: [],
    objectives: [],
    onStart: [],
    onWin: [],
    onLose: [],
  };
  return scene;
}

/** Reusable overlay/HUD definitions for the starter project library. */
export function createDefaultGuiComponents(): GuiComponent[] {
  const overlayW = 300;
  const overlayX = Math.round((MENU_VIEWPORT.width - overlayW) / 2);
  const overlayBtn = (id: string, text: string, y: number, action: string, opts?: { color?: string; backgroundColor?: string }) =>
    guiButton(id, text, y, action, {
      width: overlayW - 40,
      x: overlayX + 20,
      height: 44,
      fontSize: 15,
      color: opts?.color ?? C.text,
      backgroundColor: opts?.backgroundColor ?? C.btn,
    });

  return [
    {
      id: "hud",
      name: "HUD",
      nodes: [
        guiPanel("hud-bar", 0, 48, { x: 0, width: MENU_VIEWPORT.width, backgroundColor: C.surface }),
        guiText("hud-score", "Coins: 0", 12, {
          fontSize: 15,
          color: C.gold,
          height: 28,
          align: "left",
          x: 16,
          width: 160,
        }),
        guiText("hud-lives", "Lives: 3", 12, {
          fontSize: 15,
          color: C.text,
          height: 28,
          align: "right",
          x: MENU_VIEWPORT.width - 120,
          width: 104,
        }),
      ],
    },
    {
      id: "pause-menu",
      name: "Pause Menu",
      nodes: [
        guiPanel("pause-backdrop", 180, 320, { x: overlayX, width: overlayW, backgroundColor: C.panel }),
        guiText("pause-title", "Paused", 208, { fontSize: 26, color: C.cyan, height: 36 }),
        guiText("pause-sub", "Game is frozen — edit this overlay", 250, {
          fontSize: 12,
          color: C.muted,
          height: 22,
        }),
        overlayBtn("btn-resume", "Resume", 290, GUI_MENU_EVENTS.resumeGame, {
          color: C.btnPrimaryText,
          backgroundColor: C.btnPrimary,
        }),
        overlayBtn("btn-restart", "Restart", 346, GUI_MENU_EVENTS.restartLevel),
        overlayBtn("btn-pause-menu", "Main Menu", 402, GUI_MENU_EVENTS.backToMenu, {
          color: C.btnSecondaryText,
          backgroundColor: C.btnSecondary,
        }),
      ],
    },
    {
      id: "game-over",
      name: "Game Over",
      nodes: [
        guiPanel("gameover-backdrop", 200, 280, { x: overlayX, width: overlayW, backgroundColor: C.panel }),
        guiText("gameover-title", "Game Over", 228, { fontSize: 26, color: "#f87171", height: 36 }),
        guiText("gameover-sub", "Try again or return to menu", 270, {
          fontSize: 12,
          color: C.muted,
          height: 22,
        }),
        overlayBtn("btn-retry", "Retry", 310, GUI_MENU_EVENTS.retryGame, {
          color: C.btnPrimaryText,
          backgroundColor: C.btnPrimary,
        }),
        overlayBtn("btn-gameover-menu", "Main Menu", 366, GUI_MENU_EVENTS.backToMenu),
      ],
    },
    {
      id: "you-win",
      name: "You Win",
      nodes: [
        guiPanel("win-backdrop", 200, 280, { x: overlayX, width: overlayW, backgroundColor: C.panel }),
        guiText("win-title", "You Win!", 228, { fontSize: 26, color: C.green, height: 36 }),
        guiText("win-sub", "Level complete", 270, {
          fontSize: 12,
          color: C.muted,
          height: 22,
        }),
        overlayBtn("btn-next", "Next Level", 310, GUI_MENU_EVENTS.nextLevel, {
          color: C.btnPrimaryText,
          backgroundColor: C.btnPrimary,
        }),
        overlayBtn("btn-win-menu", "Main Menu", 366, GUI_MENU_EVENTS.backToMenu),
      ],
    },
  ];
}

/** Default fade transitions between menu, settings, and main. */
export function createDefaultMenuTransitions(): SceneTransitionDef[] {
  return [
    {
      id: "to-main",
      name: "Menu → Game",
      fromSceneId: "menu",
      toSceneId: "main",
      type: "fade",
      duration: 0.35,
    },
    {
      id: "to-menu",
      name: "Back to Menu",
      toSceneId: "menu",
      type: "fade",
      duration: 0.25,
    },
    {
      id: "to-settings",
      name: "Open Settings",
      fromSceneId: "menu",
      toSceneId: "settings",
      type: "fade",
      duration: 0.25,
    },
  ];
}

/**
 * Gameplay starter entities (player / ground / camera) plus HUD instance.
 * Used by CLI init for main.scene.json.
 */
export function createStarterGameplayScene(): GameKitScene {
  const scene = createEmptyScene("Main Scene");
  scene.id = "main";
  scene.name = "Main Scene";
  scene.entities = [
    {
      id: "player",
      name: "Player",
      components: [
        {
          type: "Transform",
          position: { x: 120, y: 360 },
          rotation: 0,
          scale: { x: 1, y: 1 },
        },
        {
          type: "Sprite",
          assetId: "player",
          width: 48,
          height: 64,
          anchor: { x: 0.5, y: 1 },
        },
        {
          type: "AabbCollider",
          offset: { x: -24, y: -64 },
          size: { x: 48, y: 64 },
          isStatic: false,
        },
        {
          type: "PlayerController",
          speed: 240,
          jumpVelocity: 620,
          gravity: 1800,
        },
      ],
    },
    {
      id: "ground",
      name: "Ground",
      components: [
        {
          type: "Transform",
          position: { x: 0, y: 520 },
          rotation: 0,
          scale: { x: 1, y: 1 },
        },
        {
          type: "AabbCollider",
          offset: { x: 0, y: 0 },
          size: { x: 900, y: 48 },
          isStatic: true,
        },
      ],
    },
    {
      id: "camera",
      name: "Camera",
      components: [
        {
          type: "Transform",
          position: { x: 0, y: 0 },
          rotation: 0,
          scale: { x: 1, y: 1 },
        },
        {
          type: "CameraFollow",
          targetId: "player",
          smoothing: 0.18,
        },
      ],
    },
    menuControllerEntity("game-controller", "Game Controller", [
      {
        event: GUI_MENU_EVENTS.backToMenu,
        actions: [{ type: "switchScene", sceneId: "menu" }],
      },
      {
        event: GUI_MENU_EVENTS.restartLevel,
        actions: [{ type: "switchScene", sceneId: "main" }],
      },
      {
        event: GUI_MENU_EVENTS.retryGame,
        actions: [{ type: "switchScene", sceneId: "main" }],
      },
      {
        event: GUI_MENU_EVENTS.nextLevel,
        actions: [{ type: "nextLevel" }],
      },
      {
        event: GUI_MENU_EVENTS.resumeGame,
        actions: [],
      },
    ]),
  ];
  scene.gui = {
    nodes: [],
    componentInstances: [
      {
        id: "inst-hud",
        componentId: "hud",
        x: 0,
        y: 0,
        visible: true,
      },
    ],
  };
  return scene;
}

export function parseScene(input: unknown): GameKitScene {
  const result = validateScene(input);
  if (!result.ok) {
    throw new Error(`Invalid Playroom scene:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }
  return result.value;
}

export function validateScene(input: unknown): ValidationResult<GameKitScene> {
  const parsed = GameKitSceneSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return { ok: false, errors: formatZodError(parsed.error) };
}

export function validateProject(input: unknown): ValidationResult<GameKitProject> {
  const parsed = GameKitProjectSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return { ok: false, errors: formatZodError(parsed.error) };
}

export function sceneToJson(scene: GameKitScene): string {
  return `${JSON.stringify(scene, null, 2)}\n`;
}

export function projectToJson(project: GameKitProject): string {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createId(value: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slugify(value) || "entity"}-${suffix}`;
}

export function createPrefab(
  name: string,
  components: GameKitComponent[],
  sourceEntityName?: string,
): GameKitPrefab {
  return {
    schemaVersion: GAMEKIT_SCHEMA_VERSION,
    id: slugify(name) || createId("prefab"),
    name,
    sourceEntityName,
    components: structuredClone(components),
    createdAt: new Date().toISOString(),
  };
}

export function prefabToJson(prefab: GameKitPrefab): string {
  return `${JSON.stringify(prefab, null, 2)}\n`;
}

export function parsePrefab(input: unknown): GameKitPrefab {
  const result = validatePrefab(input);
  if (!result.ok) {
    throw new Error(`Invalid Playroom prefab:\n${result.errors.map((e) => `- ${e}`).join("\n")}`);
  }
  return result.value;
}

export function validatePrefab(input: unknown): ValidationResult<GameKitPrefab> {
  const parsed = GameKitPrefabSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  return { ok: false, errors: formatZodError(parsed.error) };
}

function formatZodError(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const pathStr = err.path.join(".");
    
    // Handle exact custom validation checks
    if (pathStr === "viewport.width") {
      return "viewport.width must be a finite number";
    }
    if (pathStr === "gameRules.onFall") {
      return 'gameRules.onFall must be "gameOver" or "respawn"';
    }

    if (err.message.includes("at least 1 character")) {
      return `${pathStr} must be a non-empty string`;
    }

    // Generic fallback formatting that mimics the old manual style:
    if (err.code === "invalid_type") {
      if (err.expected === "number") {
        return `${pathStr} must be a finite number`;
      }
      if (err.expected === "string") {
        return `${pathStr} must be a non-empty string`;
      }
      if (err.expected === "boolean") {
        return `${pathStr} must be a boolean`;
      }
    }
    
    return `${pathStr ? pathStr + " " : ""}must be valid: ${err.message}`;
  });
}
