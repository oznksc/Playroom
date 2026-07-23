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

export const GameRulesConfigSchema = z.object({
  fallDeathEnabled: z.boolean().default(true),
  fallY: z.number().optional(),
  fallMargin: z.number().default(120),
  onFall: FallDeathActionSchema.default("gameOver"),
  lives: z.number().default(3).transform((v) => Math.max(0, Math.floor(v))),
  spawnPoint: Vector2Schema.optional(),
  gameOverMessage: z.string().default("Game Over").transform((v) => v.trim() || "Game Over"),
  winMessage: z.string().default("You win!").transform((v) => v.trim() || "You win!"),
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

export const DEFAULT_GAME_RULES: Required<
  Pick<
    GameRulesConfig,
    "fallDeathEnabled" | "fallMargin" | "onFall" | "lives" | "gameOverMessage" | "winMessage"
  >
> &
  GameRulesConfig = {
  fallDeathEnabled: true,
  fallMargin: 120,
  onFall: "gameOver",
  lives: 3,
  gameOverMessage: "Game Over",
  winMessage: "You win!",
};

export function resolveGameRules(rules?: GameRulesConfig | null): GameRulesConfig {
  return GameRulesConfigSchema.parse(rules ?? {});
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
      fallDeathEnabled: DEFAULT_GAME_RULES.fallDeathEnabled,
      fallMargin: DEFAULT_GAME_RULES.fallMargin,
      onFall: DEFAULT_GAME_RULES.onFall,
      lives: DEFAULT_GAME_RULES.lives,
      gameOverMessage: DEFAULT_GAME_RULES.gameOverMessage,
      winMessage: DEFAULT_GAME_RULES.winMessage,
    },
  };
}

export function createProject(name = "Playroom Game"): GameKitProject {
  return {
    schemaVersion: GAMEKIT_SCHEMA_VERSION,
    name,
    scenes: ["main.scene.json"],
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
    guiComponents: []
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
    unlocked: order === 1
  };
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
