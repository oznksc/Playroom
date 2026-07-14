export const GAMEKIT_SCHEMA_VERSION = 1 as const;

export type Vector2 = {
  x: number;
  y: number;
};

export type Orientation = "portrait" | "landscape" | "auto";

export type SafeAreaConfig = {
  enabled: boolean;
  padding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
};

export type ResponsiveConfig = {
  mode: "fixed" | "scale" | "adaptive";
  referenceWidth: number;
  referenceHeight: number;
  orientation: Orientation;
  safeArea: SafeAreaConfig;
};

export type GameKitLevel = {
  id: string;
  name: string;
  order: number;
  sceneIds: string[];
  unlocked: boolean;
};

export type GameSavePayload = {
  version: 1;
  persistentState: Record<string, unknown>;
  levels: Array<{ id: string; unlocked: boolean }>;
  currentSceneId: string | null;
  currentLevelId: string | null;
};

export type TransformComponent = {
  type: "Transform";
  position: Vector2;
  rotation: number;
  scale: Vector2;
};

export type SpriteComponent = {
  type: "Sprite";
  assetId: string;
  width: number;
  height: number;
  anchor: Vector2;
};

export type AabbColliderComponent = {
  type: "AabbCollider";
  offset: Vector2;
  size: Vector2;
  isStatic: boolean;
  isTrigger?: boolean;
  layer?: number;
  mask?: number;
};

export type PlayerControllerComponent = {
  type: "PlayerController";
  speed: number;
  jumpVelocity: number;
  gravity: number;
};

export type CameraFollowComponent = {
  type: "CameraFollow";
  targetId: string;
  smoothing: number;
};

export type AnimationComponent = {
  type: "Animation";
  assetId: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  framesPerSecond: number;
  loop: boolean;
  currentFrame?: number;
};

export type RigidBodyComponent = {
  type: "RigidBody";
  velocity: Vector2;
  angularVelocity: number;
  mass: number;
  drag: number;
  isKinematic: boolean;
  gravityScale: number;
  useGravity: boolean;
};

export type CircleColliderComponent = {
  type: "CircleCollider";
  offset: Vector2;
  radius: number;
  isStatic: boolean;
  isTrigger: boolean;
  layer?: number;
  mask?: number;
};

export type PolygonColliderComponent = {
  type: "PolygonCollider";
  offset: Vector2;
  points: Vector2[];
  isStatic: boolean;
  isTrigger?: boolean;
  layer?: number;
  mask?: number;
};

export type TilemapComponent = {
  type: "Tilemap";
  tilesetId: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  gridWidth: number;
  gridHeight: number;
  tiles: number[];
};

export type TextComponent = {
  type: "Text";
  text: string;
  fontAssetId: string;
  size: number;
  color: string;
  align: "left" | "center" | "right";
};

export type AudioSourceComponent = {
  type: "AudioSource";
  assetId: string;
  volume: number;
  loop: boolean;
  playOnStart: boolean;
};

export type AudioListenerComponent = {
  type: "AudioListener";
  enabled: boolean;
};

export type TweenComponent = {
  type: "Tween";
  property: "position.x" | "position.y" | "rotation" | "scale.x" | "scale.y";
  startValue: number;
  endValue: number;
  duration: number;
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
  loop: boolean;
  pingPong: boolean;
  elapsed?: number;
  active?: boolean;
};

export type FollowPathComponent = {
  type: "FollowPath";
  points: Vector2[];
  speed: number;
  loop: boolean;
  currentPointIndex?: number;
  targetPointIndex?: number;
};

export type StateMachineState = {
  name: string;
  on?: Record<string, string>;
};

export type StateMachineComponent = {
  type: "StateMachine";
  initialState: string;
  currentState?: string;
  states: StateMachineState[];
};

export type ScriptAction = {
  type: string;
  [key: string]: unknown;
};

export type ScriptHandler = {
  event: string;
  actions: ScriptAction[];
};

export type ScriptComponent = {
  type: "Script";
  handlers: ScriptHandler[];
};

export type ParticleSystemComponent = {
  type: "ParticleSystem";
  maxParticles: number;
  emissionRate: number;
  lifetime: number;
  speed: number;
  gravityScale: number;
  colorStart: string;
  colorEnd: string;
  sizeStart: number;
  sizeEnd: number;
  shape: "point" | "box";
  width: number;
  height: number;
  active: boolean;
};

export type GameKitComponent =
  | TransformComponent
  | SpriteComponent
  | AabbColliderComponent
  | CircleColliderComponent
  | PolygonColliderComponent
  | PlayerControllerComponent
  | RigidBodyComponent
  | CameraFollowComponent
  | AnimationComponent
  | TilemapComponent
  | TextComponent
  | AudioSourceComponent
  | AudioListenerComponent
  | TweenComponent
  | FollowPathComponent
  | StateMachineComponent
  | ScriptComponent
  | ParticleSystemComponent;

export type GameKitEntity = {
  id: string;
  name: string;
  components: GameKitComponent[];
};

export type GuiBase = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX?: number;
  anchorY?: number;
  visible?: boolean;
  interactive?: boolean;
};

export type GuiText = GuiBase & {
  type: "Text";
  text: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

export type GuiButton = GuiBase & {
  type: "Button";
  text: string;
  action?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
};

export type GuiImage = GuiBase & {
  type: "Image";
  assetId: string;
};

export type GuiNode = GuiText | GuiButton | GuiImage;

export type GuiComponent = {
  id: string;
  name: string;
  nodes: GuiNode[];
};

export type GuiComponentInstance = {
  id: string;
  componentId: string;
  x: number;
  y: number;
  visible?: boolean;
  interactive?: boolean;
  nodeOverrides?: Record<string, Partial<GuiNode>>;
};

export type Keyframe = {
  time: number;
  value: number | number[];
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
};

export type TimelineTrack = {
  entityId: string;
  property: "position.x" | "position.y" | "rotation" | "scale.x" | "scale.y" | "alpha";
  keyframes: Keyframe[];
};

export type TimelineData = {
  tracks: TimelineTrack[];
  duration: number;
  loop: boolean;
  playing: boolean;
};

/** Maps abstract actions to keyboard keys and optional on-screen touch controls. */
export type InputActionBinding = {
  action: "move_left" | "move_right" | "jump" | string;
  keys: string[];
  touchControl?: "left" | "right" | "jump";
  gamepad?: string;
};

export type InputMapConfig = {
  bindings: InputActionBinding[];
};

export const DEFAULT_INPUT_MAP: InputMapConfig = {
  bindings: [
    { action: "move_left", keys: ["ArrowLeft", "a", "A"], touchControl: "left" },
    { action: "move_right", keys: ["ArrowRight", "d", "D"], touchControl: "right" },
    { action: "jump", keys: ["ArrowUp", " ", "w", "W"], touchControl: "jump" },
  ],
};

/** What happens when the player falls below the void threshold. */
export type FallDeathAction = "gameOver" | "respawn";

/**
 * Scene-level play rules (void death, lives, spawn). Optional on scenes for
 * backward compatibility; runtimes merge with DEFAULT_GAME_RULES.
 */
export type GameRulesConfig = {
  /** Master switch for void / fall death. Default true. */
  fallDeathEnabled?: boolean;
  /**
   * Absolute world Y at/above which the player has fallen (Y-down).
   * When omitted, runtimes use the lowest solid surface + fallMargin.
   */
  fallY?: number;
  /** Extra margin below auto-detected ground when fallY is omitted. Default 120. */
  fallMargin?: number;
  /** gameOver = end run; respawn = reset to spawn (lives permitting). Default gameOver. */
  onFall?: FallDeathAction;
  /**
   * Lives when onFall is "respawn". When depleted → game over.
   * Omit or 0 = unlimited respawns.
   */
  lives?: number;
  /** Override spawn position. When omitted, player start position at play begin is used. */
  spawnPoint?: Vector2;
  /** Overlay copy on game over. */
  gameOverMessage?: string;
  /** Overlay copy when all coins collected / goal reached (web demo). */
  winMessage?: string;
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

/** Merge scene gameRules with defaults for runtime consumption. */
export function resolveGameRules(rules?: GameRulesConfig | null): GameRulesConfig & {
  fallDeathEnabled: boolean;
  fallMargin: number;
  onFall: FallDeathAction;
  lives: number;
  gameOverMessage: string;
  winMessage: string;
} {
  return {
    fallDeathEnabled: rules?.fallDeathEnabled ?? DEFAULT_GAME_RULES.fallDeathEnabled,
    fallMargin: rules?.fallMargin ?? DEFAULT_GAME_RULES.fallMargin,
    onFall: rules?.onFall === "respawn" ? "respawn" : "gameOver",
    lives: typeof rules?.lives === "number" && Number.isFinite(rules.lives) ? Math.max(0, Math.floor(rules.lives)) : DEFAULT_GAME_RULES.lives,
    gameOverMessage: rules?.gameOverMessage?.trim() || DEFAULT_GAME_RULES.gameOverMessage,
    winMessage: rules?.winMessage?.trim() || DEFAULT_GAME_RULES.winMessage,
    ...(typeof rules?.fallY === "number" && Number.isFinite(rules.fallY) ? { fallY: rules.fallY } : {}),
    ...(rules?.spawnPoint &&
    typeof rules.spawnPoint.x === "number" &&
    typeof rules.spawnPoint.y === "number"
      ? { spawnPoint: { x: rules.spawnPoint.x, y: rules.spawnPoint.y } }
      : {}),
  };
}

/**
 * Resolve the Y threshold for fall death.
 * Prefer explicit fallY; otherwise lowest static non-trigger collider bottom + margin.
 */
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

export type GameKitScene = {
  schemaVersion: typeof GAMEKIT_SCHEMA_VERSION;
  id: string;
  name: string;
  viewport: {
    width: number;
    height: number;
    background: string;
  };
  gravity: Vector2;
  assets: string[];
  entities: GameKitEntity[];
  responsive: ResponsiveConfig;
  timeline: TimelineData;
  gui: {
    nodes: GuiNode[];
    componentInstances: GuiComponentInstance[];
  };
  /** Optional keyboard/touch action map. Defaults applied at runtime when omitted. */
  inputMap?: InputMapConfig;
  /** Optional play rules: void death, lives, spawn, messages. */
  gameRules?: GameRulesConfig;
};

export type GameKitAsset = {
  id: string;
  file: string;
  kind: "image" | "audio" | "font";
  width?: number;
  height?: number;
};

export type GameKitProject = {
  schemaVersion: typeof GAMEKIT_SCHEMA_VERSION;
  name: string;
  scenes: string[];
  levels: GameKitLevel[];
  assets: GameKitAsset[];
  guiComponents: GuiComponent[];
  /** Optional named scene transitions used by load_scene / SceneManager. */
  transitions?: SceneTransitionDef[];
  /** Last scene the editor/agent activated (filename). */
  activeScene?: string;
};

export type SceneTransitionType = "none" | "fade" | "slide";

export type SceneTransitionDef = {
  id: string;
  name: string;
  fromSceneId?: string;
  toSceneId: string;
  type: SceneTransitionType;
  duration: number;
};

/** Reusable entity template stored under gamekit/prefabs/. */
export type GameKitPrefab = {
  schemaVersion: typeof GAMEKIT_SCHEMA_VERSION;
  id: string;
  name: string;
  /** Source entity name when created from a scene entity. */
  sourceEntityName?: string;
  components: GameKitComponent[];
  createdAt?: string;
};

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
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["scene must be an object"] };
  }

  const scene: GameKitScene = {
    schemaVersion: expectSchemaVersion(input.schemaVersion, "schemaVersion", errors),
    id: expectString(input.id, "id", errors),
    name: expectString(input.name, "name", errors),
    viewport: validateViewport(input.viewport, errors),
    gravity: validateVector(input.gravity, "gravity", errors),
    assets: validateStringArray(input.assets, "assets", errors),
    entities: validateEntities(input.entities, errors),
    responsive: validateResponsive(input.responsive, input.viewport, errors),
    timeline: validateTimeline(input.timeline, errors),
    gui: validateGui(input.gui, errors),
    ...(input.inputMap !== undefined
      ? { inputMap: validateInputMap(input.inputMap, errors) }
      : {}),
    ...(input.gameRules !== undefined
      ? { gameRules: validateGameRules(input.gameRules, errors) }
      : {}),
  };

  return errors.length === 0 ? { ok: true, value: scene } : { ok: false, errors };
}

function validateGameRules(input: unknown, errors: string[]): GameRulesConfig {
  if (!isRecord(input)) {
    errors.push("gameRules must be an object");
    return {};
  }
  const rules: GameRulesConfig = {};
  if (input.fallDeathEnabled !== undefined) {
    if (typeof input.fallDeathEnabled !== "boolean") {
      errors.push("gameRules.fallDeathEnabled must be a boolean");
    } else {
      rules.fallDeathEnabled = input.fallDeathEnabled;
    }
  }
  if (input.fallY !== undefined) {
    rules.fallY = expectNumber(input.fallY, "gameRules.fallY", errors);
  }
  if (input.fallMargin !== undefined) {
    rules.fallMargin = expectNumber(input.fallMargin, "gameRules.fallMargin", errors);
  }
  if (input.onFall !== undefined) {
    if (input.onFall !== "gameOver" && input.onFall !== "respawn") {
      errors.push('gameRules.onFall must be "gameOver" or "respawn"');
    } else {
      rules.onFall = input.onFall;
    }
  }
  if (input.lives !== undefined) {
    const lives = expectNumber(input.lives, "gameRules.lives", errors);
    if (Number.isFinite(lives) && lives < 0) {
      errors.push("gameRules.lives must be >= 0");
    } else if (Number.isFinite(lives)) {
      rules.lives = Math.floor(lives);
    }
  }
  if (input.spawnPoint !== undefined) {
    rules.spawnPoint = validateVector(input.spawnPoint, "gameRules.spawnPoint", errors);
  }
  if (input.gameOverMessage !== undefined) {
    rules.gameOverMessage = expectString(input.gameOverMessage, "gameRules.gameOverMessage", errors);
  }
  if (input.winMessage !== undefined) {
    rules.winMessage = expectString(input.winMessage, "gameRules.winMessage", errors);
  }
  return rules;
}

function validateInputMap(input: unknown, errors: string[]): InputMapConfig {
  if (!isRecord(input)) {
    errors.push("inputMap must be an object");
    return { bindings: [...DEFAULT_INPUT_MAP.bindings] };
  }
  if (!Array.isArray(input.bindings)) {
    errors.push("inputMap.bindings must be an array");
    return { bindings: [...DEFAULT_INPUT_MAP.bindings] };
  }
  const bindings: InputActionBinding[] = input.bindings.map((binding, index) => {
    const path = `inputMap.bindings[${index}]`;
    if (!isRecord(binding)) {
      errors.push(`${path} must be an object`);
      return { action: "unknown", keys: [] };
    }
    const keys = Array.isArray(binding.keys)
      ? (binding.keys as unknown[]).map((k, i) => expectString(k, `${path}.keys[${i}]`, errors))
      : (errors.push(`${path}.keys must be an array`), []);
    const touch = binding.touchControl;
    const touchControl =
      touch === "left" || touch === "right" || touch === "jump" ? touch : undefined;
    if (binding.touchControl !== undefined && !touchControl) {
      errors.push(`${path}.touchControl must be "left", "right", or "jump"`);
    }
    return {
      action: expectString(binding.action, `${path}.action`, errors),
      keys,
      ...(touchControl ? { touchControl } : {}),
      ...(binding.gamepad !== undefined
        ? { gamepad: expectString(binding.gamepad, `${path}.gamepad`, errors) }
        : {}),
    };
  });
  return { bindings };
}

export function validateProject(input: unknown): ValidationResult<GameKitProject> {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["project must be an object"] };
  }

  const project: GameKitProject = {
    schemaVersion: expectSchemaVersion(input.schemaVersion, "schemaVersion", errors),
    name: expectString(input.name, "name", errors),
    scenes: validateStringArray(input.scenes, "scenes", errors),
    levels: validateLevels(input.levels, errors),
    assets: validateAssets(input.assets, errors),
    guiComponents: validateGuiComponents(input.guiComponents, errors),
    ...(input.transitions !== undefined
      ? { transitions: validateTransitions(input.transitions, errors) }
      : {}),
    ...(input.activeScene !== undefined
      ? { activeScene: expectString(input.activeScene, "activeScene", errors) }
      : {}),
  };

  return errors.length === 0 ? { ok: true, value: project } : { ok: false, errors };
}

function validateTransitions(input: unknown, errors: string[]): SceneTransitionDef[] {
  if (!Array.isArray(input)) {
    errors.push("transitions must be an array");
    return [];
  }
  return input.map((item, index) => {
    const path = `transitions[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${path} must be an object`);
      return {
        id: "",
        name: "",
        toSceneId: "",
        type: "none" as const,
        duration: 0,
      };
    }
    const typeRaw = item.type;
    const type: SceneTransitionType =
      typeRaw === "fade" || typeRaw === "slide" || typeRaw === "none" ? typeRaw : "none";
    if (item.type !== undefined && type !== item.type) {
      errors.push(`${path}.type must be "none", "fade", or "slide"`);
    }
    return {
      id: expectString(item.id, `${path}.id`, errors),
      name: expectString(item.name, `${path}.name`, errors),
      toSceneId: expectString(item.toSceneId, `${path}.toSceneId`, errors),
      type,
      duration: expectNumber(item.duration, `${path}.duration`, errors),
      ...(item.fromSceneId !== undefined
        ? { fromSceneId: expectString(item.fromSceneId, `${path}.fromSceneId`, errors) }
        : {}),
    };
  });
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
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["prefab must be an object"] };
  }
  const prefab: GameKitPrefab = {
    schemaVersion: expectSchemaVersion(input.schemaVersion, "schemaVersion", errors),
    id: expectString(input.id, "id", errors),
    name: expectString(input.name, "name", errors),
    components: validateComponents(input.components, "prefab", errors),
    ...(input.sourceEntityName !== undefined
      ? { sourceEntityName: expectString(input.sourceEntityName, "sourceEntityName", errors) }
      : {}),
    ...(input.createdAt !== undefined
      ? { createdAt: expectString(input.createdAt, "createdAt", errors) }
      : {}),
  };
  return errors.length === 0 ? { ok: true, value: prefab } : { ok: false, errors };
}

function validateViewport(input: unknown, errors: string[]): GameKitScene["viewport"] {
  if (!isRecord(input)) {
    errors.push("viewport must be an object");
    return { width: 390, height: 844, background: "#101820" };
  }

  return {
    width: expectNumber(input.width, "viewport.width", errors),
    height: expectNumber(input.height, "viewport.height", errors),
    background: expectString(input.background, "viewport.background", errors)
  };
}

function validateEntities(input: unknown, errors: string[]): GameKitEntity[] {
  if (!Array.isArray(input)) {
    errors.push("entities must be an array");
    return [];
  }

  return input.map((entity, index) => {
    const path = `entities[${index}]`;
    if (!isRecord(entity)) {
      errors.push(`${path} must be an object`);
      return { id: "", name: "", components: [] };
    }

    return {
      id: expectString(entity.id, `${path}.id`, errors),
      name: expectString(entity.name, `${path}.name`, errors),
      components: validateComponents(entity.components, path, errors)
    };
  });
}

function validateComponents(input: unknown, entityPath: string, errors: string[]): GameKitComponent[] {
  if (!Array.isArray(input)) {
    errors.push(`${entityPath}.components must be an array`);
    return [];
  }

  const components: GameKitComponent[] = [];

  input.forEach((component, index) => {
    const path = `${entityPath}.components[${index}]`;
    if (!isRecord(component)) {
      errors.push(`${path} must be an object`);
      return;
    }

    switch (component.type) {
      case "Transform":
        components.push({
          type: "Transform",
          position: validateVector(component.position, `${path}.position`, errors),
          rotation: expectNumber(component.rotation, `${path}.rotation`, errors),
          scale: validateVector(component.scale, `${path}.scale`, errors)
        });
        return;
      case "Sprite":
        components.push({
          type: "Sprite",
          assetId: expectString(component.assetId, `${path}.assetId`, errors),
          width: expectNumber(component.width, `${path}.width`, errors),
          height: expectNumber(component.height, `${path}.height`, errors),
          anchor: validateVector(component.anchor, `${path}.anchor`, errors)
        });
        return;
      case "AabbCollider":
        components.push({
          type: "AabbCollider",
          offset: validateVector(component.offset, `${path}.offset`, errors),
          size: validateVector(component.size, `${path}.size`, errors),
          isStatic: expectBoolean(component.isStatic, `${path}.isStatic`, errors),
          ...(component.isTrigger !== undefined ? { isTrigger: expectBoolean(component.isTrigger, `${path}.isTrigger`, errors) } : {}),
          ...(component.layer !== undefined ? { layer: expectNumber(component.layer, `${path}.layer`, errors) } : {}),
          ...(component.mask !== undefined ? { mask: expectNumber(component.mask, `${path}.mask`, errors) } : {}),
        });
        return;
      case "PlayerController":
        components.push({
          type: "PlayerController",
          speed: expectNumber(component.speed, `${path}.speed`, errors),
          jumpVelocity: expectNumber(component.jumpVelocity, `${path}.jumpVelocity`, errors),
          gravity: expectNumber(component.gravity, `${path}.gravity`, errors)
        });
        return;
      case "CameraFollow":
        components.push({
          type: "CameraFollow",
          targetId: expectString(component.targetId, `${path}.targetId`, errors),
          smoothing: expectNumber(component.smoothing, `${path}.smoothing`, errors)
        });
        return;
      case "Animation":
        components.push({
          type: "Animation",
          assetId: expectString(component.assetId, `${path}.assetId`, errors),
          frameWidth: expectNumber(component.frameWidth, `${path}.frameWidth`, errors),
          frameHeight: expectNumber(component.frameHeight, `${path}.frameHeight`, errors),
          totalFrames: expectNumber(component.totalFrames, `${path}.totalFrames`, errors),
          framesPerSecond: expectNumber(component.framesPerSecond, `${path}.framesPerSecond`, errors),
          loop: expectBoolean(component.loop, `${path}.loop`, errors),
          ...(component.currentFrame !== undefined ? { currentFrame: expectNumber(component.currentFrame, `${path}.currentFrame`, errors) } : {}),
        });
        return;
      case "RigidBody":
        components.push({
          type: "RigidBody",
          velocity: validateVector(component.velocity, `${path}.velocity`, errors),
          angularVelocity: expectNumber(component.angularVelocity, `${path}.angularVelocity`, errors),
          mass: expectNumber(component.mass, `${path}.mass`, errors),
          drag: expectNumber(component.drag, `${path}.drag`, errors),
          isKinematic: expectBoolean(component.isKinematic, `${path}.isKinematic`, errors),
          gravityScale: expectNumber(component.gravityScale, `${path}.gravityScale`, errors),
          useGravity: expectBoolean(component.useGravity, `${path}.useGravity`, errors),
        });
        return;
      case "CircleCollider":
        components.push({
          type: "CircleCollider",
          offset: validateVector(component.offset, `${path}.offset`, errors),
          radius: expectNumber(component.radius, `${path}.radius`, errors),
          isStatic: expectBoolean(component.isStatic, `${path}.isStatic`, errors),
          isTrigger: expectBoolean(component.isTrigger, `${path}.isTrigger`, errors),
          ...(component.layer !== undefined ? { layer: expectNumber(component.layer, `${path}.layer`, errors) } : {}),
          ...(component.mask !== undefined ? { mask: expectNumber(component.mask, `${path}.mask`, errors) } : {}),
        });
        return;
      case "PolygonCollider":
        components.push({
          type: "PolygonCollider",
          offset: validateVector(component.offset, `${path}.offset`, errors),
          points: (component.points as Vector2[] ?? []).map((p: Vector2, i: number) =>
            validateVector(p, `${path}.points[${i}]`, errors)
          ),
          isStatic: expectBoolean(component.isStatic, `${path}.isStatic`, errors),
          ...(component.isTrigger !== undefined ? { isTrigger: expectBoolean(component.isTrigger, `${path}.isTrigger`, errors) } : {}),
          ...(component.layer !== undefined ? { layer: expectNumber(component.layer, `${path}.layer`, errors) } : {}),
          ...(component.mask !== undefined ? { mask: expectNumber(component.mask, `${path}.mask`, errors) } : {}),
        });
        return;
      case "Tilemap":
        components.push({
          type: "Tilemap",
          tilesetId: expectString(component.tilesetId, `${path}.tilesetId`, errors),
          tileWidth: expectNumber(component.tileWidth, `${path}.tileWidth`, errors),
          tileHeight: expectNumber(component.tileHeight, `${path}.tileHeight`, errors),
          columns: expectNumber(component.columns, `${path}.columns`, errors),
          gridWidth: expectNumber(component.gridWidth, `${path}.gridWidth`, errors),
          gridHeight: expectNumber(component.gridHeight, `${path}.gridHeight`, errors),
          tiles: Array.isArray(component.tiles)
            ? (component.tiles as unknown[]).map((t: unknown, i: number) => expectNumber(t, `${path}.tiles[${i}]`, errors))
            : (errors.push(`${path}.tiles must be an array`), []),
        });
        return;
      case "Text":
        // Empty fontAssetId means "use platform default / system font".
        if (typeof component.fontAssetId !== "string") {
          errors.push(`${path}.fontAssetId must be a string (empty string = system font)`);
        }
        components.push({
          type: "Text",
          text: expectString(component.text, `${path}.text`, errors),
          fontAssetId: typeof component.fontAssetId === "string" ? component.fontAssetId : "",
          size: expectNumber(component.size, `${path}.size`, errors),
          color: expectString(component.color, `${path}.color`, errors),
          align: (component.align === "center" || component.align === "right") ? component.align : "left"
        });
        return;
      case "AudioSource":
        components.push({
          type: "AudioSource",
          assetId: expectString(component.assetId, `${path}.assetId`, errors),
          volume: expectNumber(component.volume, `${path}.volume`, errors),
          loop: expectBoolean(component.loop, `${path}.loop`, errors),
          playOnStart: expectBoolean(component.playOnStart, `${path}.playOnStart`, errors)
        });
        return;
      case "AudioListener":
        components.push({
          type: "AudioListener",
          enabled: expectBoolean(component.enabled, `${path}.enabled`, errors)
        });
        return;
      case "Tween":
        const prop = component.property;
        const targetProp = (prop === "position.x" || prop === "position.y" || prop === "rotation" || prop === "scale.x" || prop === "scale.y") ? prop : "position.x";
        if (prop !== targetProp) {
          errors.push(`${path}.property must be "position.x", "position.y", "rotation", "scale.x", or "scale.y"`);
        }
        const ease = component.easing;
        const targetEase = (ease === "linear" || ease === "easeIn" || ease === "easeOut" || ease === "easeInOut") ? ease : "linear";
        if (ease !== targetEase) {
          errors.push(`${path}.easing must be "linear", "easeIn", "easeOut", or "easeInOut"`);
        }
        components.push({
          type: "Tween",
          property: targetProp,
          startValue: expectNumber(component.startValue, `${path}.startValue`, errors),
          endValue: expectNumber(component.endValue, `${path}.endValue`, errors),
          duration: expectNumber(component.duration, `${path}.duration`, errors),
          easing: targetEase,
          loop: expectBoolean(component.loop, `${path}.loop`, errors),
          pingPong: expectBoolean(component.pingPong, `${path}.pingPong`, errors),
          ...(component.elapsed !== undefined ? { elapsed: expectNumber(component.elapsed, `${path}.elapsed`, errors) } : {}),
          ...(component.active !== undefined ? { active: expectBoolean(component.active, `${path}.active`, errors) } : {})
        });
        return;
      case "FollowPath":
        components.push({
          type: "FollowPath",
          points: (Array.isArray(component.points) ? component.points : []).map((p, i) => validateVector(p, `${path}.points[${i}]`, errors)),
          speed: expectNumber(component.speed, `${path}.speed`, errors),
          loop: expectBoolean(component.loop, `${path}.loop`, errors),
          ...(component.currentPointIndex !== undefined ? { currentPointIndex: expectNumber(component.currentPointIndex, `${path}.currentPointIndex`, errors) } : {}),
          ...(component.targetPointIndex !== undefined ? { targetPointIndex: expectNumber(component.targetPointIndex, `${path}.targetPointIndex`, errors) } : {})
        });
        if (!Array.isArray(component.points)) {
          errors.push(`${path}.points must be an array`);
        }
        return;
      case "StateMachine":
        const states: StateMachineState[] = [];
        if (Array.isArray(component.states)) {
          component.states.forEach((s: unknown, i: number) => {
            const spath = `${path}.states[${i}]`;
            if (!isRecord(s)) {
              errors.push(`${spath} must be an object`);
              return;
            }
            const stateName = expectString(s.name, `${spath}.name`, errors);
            const onRecord: Record<string, string> = {};
            if (s.on !== undefined) {
              if (isRecord(s.on)) {
                for (const k of Object.keys(s.on)) {
                  onRecord[k] = expectString(s.on[k], `${spath}.on.${k}`, errors);
                }
              } else {
                errors.push(`${spath}.on must be an object`);
              }
            }
            states.push({
              name: stateName,
              ...(s.on !== undefined ? { on: onRecord } : {})
            });
          });
        } else {
          errors.push(`${path}.states must be an array`);
        }
        components.push({
          type: "StateMachine",
          initialState: expectString(component.initialState, `${path}.initialState`, errors),
          ...(component.currentState !== undefined ? { currentState: expectString(component.currentState, `${path}.currentState`, errors) } : {}),
          states
        });
        return;
      case "Script":
        const handlers: ScriptHandler[] = [];
        if (Array.isArray(component.handlers)) {
          component.handlers.forEach((h: unknown, i: number) => {
            const hpath = `${path}.handlers[${i}]`;
            if (!isRecord(h)) {
              errors.push(`${hpath} must be an object`);
              return;
            }
            const eventName = expectString(h.event, `${hpath}.event`, errors);
            const actions: ScriptAction[] = [];
            if (Array.isArray(h.actions)) {
              h.actions.forEach((a: unknown, j: number) => {
                const apath = `${hpath}.actions[${j}]`;
                if (!isRecord(a)) {
                  errors.push(`${apath} must be an object`);
                  return;
                }
                const aType = expectString(a.type, `${apath}.type`, errors);
                const action: ScriptAction = { type: aType };
                for (const key of Object.keys(a)) {
                  if (key !== "type") {
                    action[key] = a[key];
                  }
                }
                actions.push(action);
              });
            } else {
              errors.push(`${hpath}.actions must be an array`);
            }
            handlers.push({
              event: eventName,
              actions
            });
          });
        } else {
          errors.push(`${path}.handlers must be an array`);
        }
        components.push({
          type: "Script",
          handlers
        });
        return;
      case "ParticleSystem": {
        const shape =
          component.shape === "box" || component.shape === "point" ? component.shape : "point";
        if (component.shape !== undefined && shape !== component.shape) {
          errors.push(`${path}.shape must be "point" or "box"`);
        }
        components.push({
          type: "ParticleSystem",
          maxParticles: expectNumber(component.maxParticles, `${path}.maxParticles`, errors),
          emissionRate: expectNumber(component.emissionRate, `${path}.emissionRate`, errors),
          lifetime: expectNumber(component.lifetime, `${path}.lifetime`, errors),
          speed: expectNumber(component.speed, `${path}.speed`, errors),
          gravityScale: expectNumber(component.gravityScale, `${path}.gravityScale`, errors),
          colorStart: expectString(component.colorStart, `${path}.colorStart`, errors),
          colorEnd: expectString(component.colorEnd, `${path}.colorEnd`, errors),
          sizeStart: expectNumber(component.sizeStart, `${path}.sizeStart`, errors),
          sizeEnd: expectNumber(component.sizeEnd, `${path}.sizeEnd`, errors),
          shape,
          width: expectNumber(component.width ?? 0, `${path}.width`, errors),
          height: expectNumber(component.height ?? 0, `${path}.height`, errors),
          active: expectBoolean(component.active ?? true, `${path}.active`, errors),
        });
        return;
      }
      default:
        errors.push(`${path}.type has unsupported component type: ${String((component as Record<string, unknown>).type ?? "unknown")}`);
    }
  });

  return components;
}

function validateAssets(input: unknown, errors: string[]): GameKitAsset[] {
  if (!Array.isArray(input)) {
    errors.push("assets must be an array");
    return [];
  }

  return input.map((asset, index) => {
    const path = `assets[${index}]`;
    if (!isRecord(asset)) {
      errors.push(`${path} must be an object`);
      return { id: "", file: "", kind: "image" };
    }

    const kind = asset.kind;
    if (kind !== "image" && kind !== "audio" && kind !== "font") {
      errors.push(`${path}.kind must be "image", "audio", or "font"`);
    }

    return {
      id: expectString(asset.id, `${path}.id`, errors),
      file: expectString(asset.file, `${path}.file`, errors),
      kind: (kind === "audio" || kind === "font") ? kind : "image",
      width: optionalNumber(asset.width, `${path}.width`, errors),
      height: optionalNumber(asset.height, `${path}.height`, errors)
    };
  });
}

function validateTimeline(input: unknown, errors: string[]): GameKitScene["timeline"] {
  const defaults: GameKitScene["timeline"] = { tracks: [], duration: 0, loop: false, playing: false };
  if (input === undefined) return defaults;
  if (!isRecord(input)) {
    errors.push("timeline must be an object");
    return defaults;
  }

  const duration = input.duration !== undefined ? expectNumber(input.duration, "timeline.duration", errors) : 0;
  const loop = input.loop !== undefined ? expectBoolean(input.loop, "timeline.loop", errors) : false;
  const playing = input.playing !== undefined ? expectBoolean(input.playing, "timeline.playing", errors) : false;
  const tracks: TimelineTrack[] = [];

  const rawTracks = input.tracks;
  if (!Array.isArray(rawTracks)) {
    errors.push("timeline.tracks must be an array");
    return { ...defaults, duration, loop, playing, tracks };
  }

  for (let i = 0; i < rawTracks.length; i++) {
    const track = rawTracks[i];
    if (!isRecord(track)) {
      errors.push(`timeline.tracks[${i}] must be an object`);
      continue;
    }
    const keyframes: Keyframe[] = [];
    const rawKfs = track.keyframes;
    if (Array.isArray(rawKfs)) {
      for (let j = 0; j < rawKfs.length; j++) {
        const kf = rawKfs[j];
        if (!isRecord(kf)) {
          errors.push(`timeline.tracks[${i}].keyframes[${j}] must be an object`);
          continue;
        }
        keyframes.push({
          time: expectNumber(kf.time, `timeline.tracks[${i}].keyframes[${j}].time`, errors),
          value: expectNumberOrArray(kf.value, `timeline.tracks[${i}].keyframes[${j}].value`, errors),
          easing: kf.easing !== undefined ? expectEasing(kf.easing, `timeline.tracks[${i}].keyframes[${j}].easing`, errors) : undefined,
        });
      }
    }
    const validProperties = ["position.x", "position.y", "rotation", "scale.x", "scale.y", "alpha"];
    const prop = track.property;
    if (typeof prop !== "string" || !validProperties.includes(prop)) {
      errors.push(`timeline.tracks[${i}].property must be one of: ${validProperties.join(", ")}`);
    }
    tracks.push({
      entityId: expectString(track.entityId, `timeline.tracks[${i}].entityId`, errors),
      property: (typeof prop === "string" && validProperties.includes(prop) ? prop : "position.x") as TimelineTrack["property"],
      keyframes: keyframes.sort((a, b) => a.time - b.time),
    });
  }

  return { tracks, duration, loop, playing };
}

function validateGui(input: unknown, errors: string[]): GameKitScene["gui"] {
  if (input === undefined) return { nodes: [], componentInstances: [] };
  if (!isRecord(input)) {
    errors.push("gui must be an object");
    return { nodes: [], componentInstances: [] };
  }

  const nodes = validateGuiNodesArray(input.nodes, "gui.nodes", errors);
  const componentInstances = validateGuiComponentInstances(input.componentInstances, errors);

  return { nodes, componentInstances };
}

function validateGuiNodesArray(input: unknown, path: string, errors: string[]): GuiNode[] {
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return [];
  }

  const nodes: GuiNode[] = [];
  for (let i = 0; i < input.length; i++) {
    const node = input[i];
    if (!isRecord(node) || typeof node.type !== "string") {
      errors.push(`${path}[${i}].type is required`);
      continue;
    }
    const common = {
      id: expectString(node.id, `${path}[${i}].id`, errors),
      x: expectNumber(node.x, `${path}[${i}].x`, errors),
      y: expectNumber(node.y, `${path}[${i}].y`, errors),
      width: expectNumber(node.width, `${path}[${i}].width`, errors),
      height: expectNumber(node.height, `${path}[${i}].height`, errors),
      visible: node.visible !== undefined ? expectBoolean(node.visible, `${path}[${i}].visible`, errors) : undefined,
      interactive: node.interactive !== undefined ? expectBoolean(node.interactive, `${path}[${i}].interactive`, errors) : undefined,
      anchorX: node.anchorX !== undefined ? expectNumber(node.anchorX, `${path}[${i}].anchorX`, errors) : undefined,
      anchorY: node.anchorY !== undefined ? expectNumber(node.anchorY, `${path}[${i}].anchorY`, errors) : undefined,
    };

    switch (node.type) {
      case "Text":
        nodes.push({
          ...common,
          type: "Text",
          text: expectString(node.text, `${path}[${i}].text`, errors),
          fontSize: node.fontSize !== undefined ? expectNumber(node.fontSize, `${path}[${i}].fontSize`, errors) : undefined,
          color: node.color !== undefined ? expectString(node.color, `${path}[${i}].color`, errors) : undefined,
          align: node.align !== undefined ? expectString(node.align, `${path}[${i}].align`, errors) as "left" | "center" | "right" : undefined,
        });
        break;
      case "Button":
        nodes.push({
          ...common,
          type: "Button",
          text: expectString(node.text, `${path}[${i}].text`, errors),
          action: node.action !== undefined ? expectString(node.action, `${path}[${i}].action`, errors) : undefined,
          fontSize: node.fontSize !== undefined ? expectNumber(node.fontSize, `${path}[${i}].fontSize`, errors) : undefined,
          color: node.color !== undefined ? expectString(node.color, `${path}[${i}].color`, errors) : undefined,
          backgroundColor: node.backgroundColor !== undefined ? expectString(node.backgroundColor, `${path}[${i}].backgroundColor`, errors) : undefined,
        });
        break;
      case "Image":
        nodes.push({
          ...common,
          type: "Image",
          assetId: expectString(node.assetId, `${path}[${i}].assetId`, errors),
        });
        break;
      default:
        errors.push(`${path}[${i}].type "${node.type}" is not a supported GUI node type`);
    }
  }

  return nodes;
}

function validateGuiComponentInstances(input: unknown, errors: string[]): GuiComponentInstance[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    errors.push("gui.componentInstances must be an array");
    return [];
  }

  return input.map((inst, index) => {
    const path = `gui.componentInstances[${index}]`;
    if (!isRecord(inst)) {
      errors.push(`${path} must be an object`);
      return { id: "", componentId: "", x: 0, y: 0 };
    }
    return {
      id: expectString(inst.id, `${path}.id`, errors),
      componentId: expectString(inst.componentId, `${path}.componentId`, errors),
      x: expectNumber(inst.x, `${path}.x`, errors),
      y: expectNumber(inst.y, `${path}.y`, errors),
      visible: inst.visible !== undefined ? expectBoolean(inst.visible, `${path}.visible`, errors) : undefined,
      interactive: inst.interactive !== undefined ? expectBoolean(inst.interactive, `${path}.interactive`, errors) : undefined,
      nodeOverrides: undefined,
    };
  });
}

function validateGuiComponents(input: unknown, errors: string[]): GuiComponent[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    errors.push("guiComponents must be an array");
    return [];
  }

  return input.map((comp, index) => {
    const path = `guiComponents[${index}]`;
    if (!isRecord(comp)) {
      errors.push(`${path} must be an object`);
      return { id: "", name: "", nodes: [] };
    }
    return {
      id: expectString(comp.id, `${path}.id`, errors),
      name: expectString(comp.name, `${path}.name`, errors),
      nodes: validateGuiNodesArray(comp.nodes, `${path}.nodes`, errors),
    };
  });
}

function validateReservedArray(input: unknown, path: string, key: string, errors: string[]): unknown[] {
  if (input === undefined) {
    return [];
  }

  if (!isRecord(input)) {
    errors.push(`${path} must be an object`);
    return [];
  }

  if (!Array.isArray(input[key])) {
    errors.push(`${path}.${key} must be an array`);
    return [];
  }

  return input[key];
}

function validateVector(input: unknown, path: string, errors: string[]): Vector2 {
  if (!isRecord(input)) {
    errors.push(`${path} must be an object`);
    return { x: 0, y: 0 };
  }

  return {
    x: expectNumber(input.x, `${path}.x`, errors),
    y: expectNumber(input.y, `${path}.y`, errors)
  };
}

function validateStringArray(input: unknown, path: string, errors: string[]): string[] {
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return [];
  }

  return input.map((value, index) => expectString(value, `${path}[${index}]`, errors));
}

function expectSchemaVersion(input: unknown, path: string, errors: string[]): typeof GAMEKIT_SCHEMA_VERSION {
  if (input !== GAMEKIT_SCHEMA_VERSION) {
    errors.push(`${path} must be ${GAMEKIT_SCHEMA_VERSION}`);
  }
  return GAMEKIT_SCHEMA_VERSION;
}

function expectString(input: unknown, path: string, errors: string[]): string {
  if (typeof input !== "string" || input.length === 0) {
    errors.push(`${path} must be a non-empty string`);
    return "";
  }
  return input;
}

function expectNumber(input: unknown, path: string, errors: string[]): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    errors.push(`${path} must be a finite number`);
    return 0;
  }
  return input;
}

function optionalNumber(input: unknown, path: string, errors: string[]): number | undefined {
  if (input === undefined) {
    return undefined;
  }
  return expectNumber(input, path, errors);
}

function expectBoolean(input: unknown, path: string, errors: string[]): boolean {
  if (typeof input !== "boolean") {
    errors.push(`${path} must be a boolean`);
    return false;
  }
  return input;
}

function expectNumberOrArray(input: unknown, path: string, errors: string[]): number | number[] {
  if (typeof input === "number") return input;
  if (Array.isArray(input)) {
    return input.map((v, idx) => expectNumber(v, `${path}[${idx}]`, errors));
  }
  errors.push(`${path} must be a number or array of numbers`);
  return 0;
}

function expectEasing(input: unknown, path: string, errors: string[]): "linear" | "easeIn" | "easeOut" | "easeInOut" {
  if (input === "linear" || input === "easeIn" || input === "easeOut" || input === "easeInOut") return input;
  errors.push(`${path} must be linear, easeIn, easeOut, or easeInOut`);
  return "linear";
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function validateResponsive(input: unknown, viewport: unknown, errors: string[]): ResponsiveConfig {
  const defaults: ResponsiveConfig = {
    mode: "scale",
    referenceWidth: 390,
    referenceHeight: 844,
    orientation: "portrait",
    safeArea: {
      enabled: true,
      padding: { top: 0, bottom: 0, left: 0, right: 0 }
    }
  };

  if (input === undefined || input === null) {
    if (isRecord(viewport)) {
      defaults.referenceWidth = expectNumber(viewport.width, "responsive.referenceWidth (from viewport)", errors);
      defaults.referenceHeight = expectNumber(viewport.height, "responsive.referenceHeight (from viewport)", errors);
    }
    return defaults;
  }

  if (!isRecord(input)) {
    errors.push("responsive must be an object");
    return defaults;
  }

  const mode = input.mode;
  if (mode !== "fixed" && mode !== "scale" && mode !== "adaptive") {
    errors.push('responsive.mode must be "fixed", "scale", or "adaptive"');
  }

  const orientation = input.orientation;
  if (orientation !== "portrait" && orientation !== "landscape" && orientation !== "auto") {
    errors.push('responsive.orientation must be "portrait", "landscape", or "auto"');
  }

  return {
    mode: (mode as ResponsiveConfig["mode"]) ?? defaults.mode,
    referenceWidth: optionalNumber(input.referenceWidth, "responsive.referenceWidth", errors) ?? defaults.referenceWidth,
    referenceHeight: optionalNumber(input.referenceHeight, "responsive.referenceHeight", errors) ?? defaults.referenceHeight,
    orientation: (orientation as ResponsiveConfig["orientation"]) ?? defaults.orientation,
    safeArea: validateSafeArea(input.safeArea, errors)
  };
}

function validateSafeArea(input: unknown, errors: string[]): SafeAreaConfig {
  const defaults: SafeAreaConfig = {
    enabled: true,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  };

  if (input === undefined || input === null) {
    return defaults;
  }

  if (!isRecord(input)) {
    errors.push("responsive.safeArea must be an object");
    return defaults;
  }

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : defaults.enabled,
    padding: isRecord(input.padding)
      ? {
          top: optionalNumber(input.padding.top, "responsive.safeArea.padding.top", errors) ?? 0,
          bottom: optionalNumber(input.padding.bottom, "responsive.safeArea.padding.bottom", errors) ?? 0,
          left: optionalNumber(input.padding.left, "responsive.safeArea.padding.left", errors) ?? 0,
          right: optionalNumber(input.padding.right, "responsive.safeArea.padding.right", errors) ?? 0
        }
      : defaults.padding
  };
}

function validateLevels(input: unknown, errors: string[]): GameKitLevel[] {
  if (input === undefined || input === null) {
    return [];
  }

  if (!Array.isArray(input)) {
    errors.push("levels must be an array");
    return [];
  }

  return input.map((level, index) => {
    const path = `levels[${index}]`;
    if (!isRecord(level)) {
      errors.push(`${path} must be an object`);
      return { id: "", name: "", order: 0, sceneIds: [], unlocked: false };
    }

    return {
      id: expectString(level.id, `${path}.id`, errors),
      name: expectString(level.name, `${path}.name`, errors),
      order: expectNumber(level.order, `${path}.order`, errors),
      sceneIds: validateStringArray(level.sceneIds, `${path}.sceneIds`, errors),
      unlocked: typeof level.unlocked === "boolean" ? level.unlocked : false
    };
  });
}
