import { GAMEKIT_SCHEMA_VERSION, validatePrefab, validateProject, validateScene } from "./index.js";

export type SchemaDocumentKind = "project" | "scene" | "prefab";

export type SchemaMigration = {
  from: number;
  to: number;
  description: string;
  migrate: (doc: unknown, kind: SchemaDocumentKind) => unknown;
};

export type MigrateDocumentResult = {
  value: unknown;
  applied: string[];
  from: number;
  to: number;
  valid: boolean;
  errors: string[];
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function slugifyLocal(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Read `schemaVersion` from a document. Missing / unparsable values are version 0
 * (pre-contract JSON that predates `GAMEKIT_SCHEMA_VERSION`).
 */
export function detectSchemaVersion(input: unknown): number {
  if (!isObject(input)) return 0;
  const raw = input.schemaVersion;
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) return Number(raw.trim());
  return 0;
}

function migrateSceneV0(doc: JsonObject): unknown {
  const name = typeof doc.name === "string" && doc.name.trim() ? doc.name : "Untitled Scene";
  const id = typeof doc.id === "string" && doc.id.trim() ? doc.id : slugifyLocal(name) || "main";

  const viewport = isObject(doc.viewport)
    ? {
        width: typeof doc.viewport.width === "number" ? doc.viewport.width : 390,
        height: typeof doc.viewport.height === "number" ? doc.viewport.height : 844,
        background:
          typeof doc.viewport.background === "string" && doc.viewport.background
            ? doc.viewport.background
            : "#101820",
      }
    : { width: 390, height: 844, background: "#101820" };

  const gravity = isObject(doc.gravity)
    ? {
        x: typeof doc.gravity.x === "number" ? doc.gravity.x : 0,
        y: typeof doc.gravity.y === "number" ? doc.gravity.y : 1800,
      }
    : { x: 0, y: 1800 };

  const entities = Array.isArray(doc.entities)
    ? doc.entities.map((entity) => migrateEntityV0(entity))
    : [];

  const patched: JsonObject = {
    ...doc,
    schemaVersion: 1,
    id,
    name,
    viewport,
    gravity,
    assets: Array.isArray(doc.assets) ? doc.assets : [],
    entities,
    responsive: isObject(doc.responsive)
      ? doc.responsive
      : {
          mode: "scale",
          referenceWidth: viewport.width,
          referenceHeight: viewport.height,
          orientation: "portrait",
          safeArea: {
            enabled: true,
            padding: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
    timeline: isObject(doc.timeline)
      ? {
          tracks: Array.isArray(doc.timeline.tracks) ? doc.timeline.tracks : [],
          duration: typeof doc.timeline.duration === "number" ? doc.timeline.duration : 0,
          loop: typeof doc.timeline.loop === "boolean" ? doc.timeline.loop : false,
          playing: typeof doc.timeline.playing === "boolean" ? doc.timeline.playing : false,
        }
      : { tracks: [], duration: 0, loop: false, playing: false },
    gui: isObject(doc.gui)
      ? {
          nodes: Array.isArray(doc.gui.nodes) ? doc.gui.nodes : [],
          componentInstances: Array.isArray(doc.gui.componentInstances)
            ? doc.gui.componentInstances
            : [],
        }
      : { nodes: [], componentInstances: [] },
  };

  if (isObject(doc.gameRules)) {
    patched.gameRules = migrateGameRulesV0(doc.gameRules);
  }

  const parsed = validateScene(patched);
  return parsed.ok ? parsed.value : patched;
}

function migrateGameRulesV0(rules: JsonObject): JsonObject {
  const hazards = Array.isArray(rules.hazards) ? [...rules.hazards] : [];
  if (hazards.length === 0 && rules.fallDeathEnabled !== false) {
    hazards.push({
      id: "fall",
      type: "fall",
      onTrigger: rules.onFall === "respawn" ? "respawn" : "gameOver",
    });
  }
  return { ...rules, hazards };
}

function migrateEntityV0(entity: unknown): unknown {
  if (!isObject(entity)) return entity;
  const name = typeof entity.name === "string" && entity.name.trim() ? entity.name : "Entity";
  const id =
    typeof entity.id === "string" && entity.id.trim() ? entity.id : slugifyLocal(name) || "entity";
  const components = Array.isArray(entity.components)
    ? entity.components.map((component) => migrateComponentV0(component))
    : [];
  return { ...entity, id, name, components };
}

function migrateComponentV0(component: unknown): unknown {
  if (!isObject(component) || typeof component.type !== "string") return component;
  const next: JsonObject = { ...component };

  // Historical field aliases from pre-1 JSON.
  if (typeof next.isStatic !== "boolean" && typeof next.static === "boolean") {
    next.isStatic = next.static;
    delete next.static;
  }
  if (typeof next.isTrigger !== "boolean" && typeof next.trigger === "boolean") {
    next.isTrigger = next.trigger;
    delete next.trigger;
  }
  if (typeof next.isKinematic !== "boolean" && typeof next.kinematic === "boolean") {
    next.isKinematic = next.kinematic;
    delete next.kinematic;
  }

  switch (next.type) {
    case "Transform": {
      if (!isObject(next.position)) next.position = { x: 0, y: 0 };
      if (typeof next.rotation !== "number") next.rotation = 0;
      if (!isObject(next.scale)) next.scale = { x: 1, y: 1 };
      break;
    }
    case "Sprite": {
      if (!isObject(next.anchor)) next.anchor = { x: 0.5, y: 0.5 };
      break;
    }
    case "AabbCollider": {
      if (!isObject(next.offset)) next.offset = { x: 0, y: 0 };
      if (typeof next.isStatic !== "boolean") next.isStatic = false;
      break;
    }
    case "CircleCollider": {
      if (!isObject(next.offset)) next.offset = { x: 0, y: 0 };
      if (typeof next.isStatic !== "boolean") next.isStatic = false;
      if (typeof next.isTrigger !== "boolean") next.isTrigger = false;
      break;
    }
    case "PolygonCollider": {
      if (!isObject(next.offset)) next.offset = { x: 0, y: 0 };
      if (!Array.isArray(next.points)) next.points = [];
      if (typeof next.isStatic !== "boolean") next.isStatic = false;
      break;
    }
    case "RigidBody": {
      if (!isObject(next.velocity)) next.velocity = { x: 0, y: 0 };
      if (typeof next.angularVelocity !== "number") next.angularVelocity = 0;
      if (typeof next.mass !== "number") next.mass = 1;
      if (typeof next.drag !== "number") next.drag = 0;
      if (typeof next.isKinematic !== "boolean") next.isKinematic = false;
      if (typeof next.gravityScale !== "number") next.gravityScale = 1;
      if (typeof next.useGravity !== "boolean") next.useGravity = true;
      break;
    }
    case "Animation": {
      if (typeof next.loop !== "boolean") next.loop = true;
      break;
    }
    case "Tilemap": {
      if (!Array.isArray(next.tiles)) next.tiles = [];
      if (typeof next.solid !== "boolean") next.solid = false;
      break;
    }
    case "Text": {
      if (typeof next.size !== "number") next.size = 16;
      if (typeof next.color !== "string") next.color = "#ffffff";
      if (typeof next.align !== "string") next.align = "left";
      if (typeof next.fontAssetId !== "string") next.fontAssetId = "";
      break;
    }
    case "AudioSource": {
      if (typeof next.volume !== "number") next.volume = 1;
      if (typeof next.loop !== "boolean") next.loop = false;
      if (typeof next.playOnStart !== "boolean") next.playOnStart = true;
      break;
    }
    case "AudioListener": {
      if (typeof next.enabled !== "boolean") next.enabled = true;
      break;
    }
    case "Tween": {
      if (typeof next.easing !== "string") next.easing = "linear";
      if (typeof next.loop !== "boolean") next.loop = false;
      if (typeof next.pingPong !== "boolean") next.pingPong = false;
      break;
    }
    case "FollowPath": {
      if (typeof next.loop !== "boolean") next.loop = true;
      if (!Array.isArray(next.points)) next.points = [];
      break;
    }
    case "ParticleSystem": {
      if (typeof next.maxParticles !== "number") next.maxParticles = 32;
      if (typeof next.emissionRate !== "number") next.emissionRate = 12;
      if (typeof next.lifetime !== "number") next.lifetime = 0.8;
      if (typeof next.speed !== "number") next.speed = 60;
      if (typeof next.gravityScale !== "number") next.gravityScale = 0.4;
      if (typeof next.colorStart !== "string") next.colorStart = "#00f0ff";
      if (typeof next.colorEnd !== "string") next.colorEnd = "#8b5cf6";
      if (typeof next.sizeStart !== "number") next.sizeStart = 4;
      if (typeof next.sizeEnd !== "number") next.sizeEnd = 0;
      if (typeof next.shape !== "string") next.shape = "point";
      if (typeof next.width !== "number") next.width = 0;
      if (typeof next.height !== "number") next.height = 0;
      if (typeof next.active !== "boolean") next.active = true;
      break;
    }
    case "Light2D": {
      if (typeof next.kind !== "string") next.kind = "point";
      if (typeof next.range !== "number") next.range = 200;
      if (typeof next.intensity !== "number") next.intensity = 1;
      if (typeof next.color !== "string") next.color = "#ffffff";
      break;
    }
    case "NineSlice": {
      if (typeof next.width !== "number") next.width = 100;
      if (typeof next.height !== "number") next.height = 100;
      if (typeof next.leftWidth !== "number") next.leftWidth = 10;
      if (typeof next.rightWidth !== "number") next.rightWidth = 10;
      if (typeof next.topHeight !== "number") next.topHeight = 10;
      if (typeof next.bottomHeight !== "number") next.bottomHeight = 10;
      break;
    }
    default:
      break;
  }

  return next;
}

function migrateProjectV0(doc: JsonObject): unknown {
  const name = typeof doc.name === "string" && doc.name.trim() ? doc.name : "Playroom Game";
  const patched: JsonObject = {
    ...doc,
    schemaVersion: 1,
    name,
    scenes: Array.isArray(doc.scenes) ? doc.scenes : [],
    levels: Array.isArray(doc.levels) ? doc.levels : [],
    assets: Array.isArray(doc.assets) ? doc.assets : [],
    guiComponents: Array.isArray(doc.guiComponents) ? doc.guiComponents : [],
  };
  const parsed = validateProject(patched);
  return parsed.ok ? parsed.value : patched;
}

function migratePrefabV0(doc: JsonObject): unknown {
  const name = typeof doc.name === "string" && doc.name.trim() ? doc.name : "Prefab";
  const id = typeof doc.id === "string" && doc.id.trim() ? doc.id : slugifyLocal(name) || "prefab";
  const components = Array.isArray(doc.components)
    ? doc.components.map((component) => migrateComponentV0(component))
    : [];
  const patched: JsonObject = {
    ...doc,
    schemaVersion: 1,
    id,
    name,
    components,
  };
  const parsed = validatePrefab(patched);
  return parsed.ok ? parsed.value : patched;
}

function migrateV0ToV1(doc: unknown, kind: SchemaDocumentKind): unknown {
  const obj = isObject(doc) ? doc : {};
  if (kind === "scene") return migrateSceneV0(obj);
  if (kind === "project") return migrateProjectV0(obj);
  return migratePrefabV0(obj);
}

export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
  {
    from: 0,
    to: 1,
    description:
      "Introduce schemaVersion 1; fill reserved scene/project/prefab blocks, component defaults, and collider/body field aliases",
    migrate: migrateV0ToV1,
  },
];

export function listSchemaMigrations(): Array<{ from: number; to: number; description: string }> {
  return SCHEMA_MIGRATIONS.map(({ from, to, description }) => ({ from, to, description }));
}

/**
 * Walk the registered chain from `from` to `to`. Throws if a step is missing
 * or if a downgrade is requested.
 */
export function listMigrationPath(from: number, to: number): SchemaMigration[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0) {
    throw new Error("Migration versions must be non-negative integers");
  }
  if (from === to) return [];
  if (from > to) {
    throw new Error(`Downgrade from schemaVersion ${from} to ${to} is not supported`);
  }

  const path: SchemaMigration[] = [];
  let current = from;
  const available = SCHEMA_MIGRATIONS.map((m) => `${m.from}→${m.to}`).join(", ") || "(none)";
  while (current < to) {
    const step = SCHEMA_MIGRATIONS.find((migration) => migration.from === current);
    if (!step) {
      throw new Error(
        `No migration from schemaVersion ${current} toward ${to}. Available steps: ${available}`
      );
    }
    path.push(step);
    current = step.to;
    if (path.length > 64) {
      throw new Error(`Migration path from ${from} to ${to} did not terminate`);
    }
  }
  if (current !== to) {
    throw new Error(
      `Migration path from ${from} ends at schemaVersion ${current}, not ${to}. Available steps: ${available}`
    );
  }
  return path;
}

function validateKind(
  value: unknown,
  kind: SchemaDocumentKind
): { ok: true } | { ok: false; errors: string[] } {
  if (kind === "scene") return validateScene(value);
  if (kind === "project") return validateProject(value);
  return validatePrefab(value);
}

/**
 * Apply the registered migration chain to a single JSON document.
 * `from`/`to` are the schema versions to walk; the document's own
 * `schemaVersion` is not consulted here (callers use `detectSchemaVersion`).
 */
export function migrateDocument(
  input: unknown,
  from: number,
  to: number,
  kind: SchemaDocumentKind
): MigrateDocumentResult {
  const steps = listMigrationPath(from, to);
  let value = input;
  const applied: string[] = [];
  for (const step of steps) {
    value = step.migrate(value, kind);
    applied.push(`${step.from}→${step.to}: ${step.description}`);
  }
  const validated = validateKind(value, kind);
  return {
    value,
    applied,
    from,
    to,
    valid: validated.ok,
    errors: validated.ok ? [] : validated.errors,
  };
}

export function currentSchemaVersion(): number {
  return GAMEKIT_SCHEMA_VERSION;
}
