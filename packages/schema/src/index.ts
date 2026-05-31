export const GAMEKIT_SCHEMA_VERSION = 1 as const;

export type Vector2 = {
  x: number;
  y: number;
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

export type GameKitComponent =
  | TransformComponent
  | SpriteComponent
  | AabbColliderComponent
  | PlayerControllerComponent
  | CameraFollowComponent;

export type GameKitEntity = {
  id: string;
  name: string;
  components: GameKitComponent[];
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
  timeline: {
    tracks: unknown[];
  };
  gui: {
    nodes: unknown[];
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
  assets: GameKitAsset[];
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
    timeline: { tracks: [] },
    gui: { nodes: [] }
  };
}

export function createProject(name = "GameKit Game"): GameKitProject {
  return {
    schemaVersion: GAMEKIT_SCHEMA_VERSION,
    name,
    scenes: ["main.scene.json"],
    assets: []
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

export function parseScene(input: unknown): GameKitScene {
  const result = validateScene(input);
  if (!result.ok) {
    throw new Error(`Invalid GameKit scene:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
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
    assets: validateAssets(input.assets, errors)
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
          isStatic: expectBoolean(component.isStatic, `${path}.isStatic`, errors)
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
      default:
        errors.push(`${path}.type has unsupported component type`);
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
  return { tracks: validateReservedArray(input, "timeline", "tracks", errors) };
}

function validateGui(input: unknown, errors: string[]): GameKitScene["gui"] {
  return { nodes: validateReservedArray(input, "gui", "nodes", errors) };
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

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
