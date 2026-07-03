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

export type GameKitComponent =
  | TransformComponent
  | SpriteComponent
  | AabbColliderComponent
  | CircleColliderComponent
  | PlayerControllerComponent
  | RigidBodyComponent
  | CameraFollowComponent
  | AnimationComponent;

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
};

export type GameKitAsset = {
  id: string;
  file: string;
  kind: "image";
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
    gui: { nodes: [], componentInstances: [] }
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
    gui: validateGui(input.gui, errors)
  };

  return errors.length === 0 ? { ok: true, value: scene } : { ok: false, errors };
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
    guiComponents: validateGuiComponents(input.guiComponents, errors)
  };

  return errors.length === 0 ? { ok: true, value: project } : { ok: false, errors };
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

    if (asset.kind !== "image") {
      errors.push(`${path}.kind must be "image"`);
    }

    return {
      id: expectString(asset.id, `${path}.id`, errors),
      file: expectString(asset.file, `${path}.file`, errors),
      kind: "image",
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
