import { describe, expect, it } from "vitest";
import {
  GAMEKIT_SCHEMA_VERSION,
  currentSchemaVersion,
  detectSchemaVersion,
  listMigrationPath,
  listSchemaMigrations,
  migrateDocument,
  validatePrefab,
  validateProject,
  validateScene,
} from "../src/index.js";

describe("schema migrate", () => {
  it("treats missing schemaVersion as 0", () => {
    expect(detectSchemaVersion({ name: "Legacy" })).toBe(0);
    expect(detectSchemaVersion({ schemaVersion: "1" })).toBe(1);
    expect(detectSchemaVersion({ schemaVersion: 1 })).toBe(1);
    expect(detectSchemaVersion(null)).toBe(0);
  });

  it("lists a 0→1 path and rejects unknown / downgrade paths", () => {
    const path = listMigrationPath(0, 1);
    expect(path).toHaveLength(1);
    expect(path[0]?.from).toBe(0);
    expect(path[0]?.to).toBe(1);
    expect(listMigrationPath(1, 1)).toEqual([]);
    expect(() => listMigrationPath(1, 0)).toThrow(/Downgrade/);
    expect(() => listMigrationPath(1, 2)).toThrow(/No migration/);
    expect(listSchemaMigrations().some((s) => s.from === 0 && s.to === 1)).toBe(true);
    expect(currentSchemaVersion()).toBe(GAMEKIT_SCHEMA_VERSION);
  });

  it("upgrades a v0 scene: reserved blocks, component defaults, collider aliases", () => {
    const v0 = {
      id: "forest",
      name: "Forest",
      viewport: { width: 390, height: 844, background: "#000" },
      gravity: { x: 0, y: 1800 },
      entities: [
        {
          id: "hero",
          name: "Hero",
          components: [
            { type: "Transform", position: { x: 10, y: 20 } },
            { type: "Sprite", assetId: "hero", width: 32, height: 32 },
            { type: "AabbCollider", size: { x: 32, y: 32 }, static: true, trigger: false },
            { type: "RigidBody", kinematic: true },
          ],
        },
      ],
    };

    const result = migrateDocument(v0, 0, 1, "scene");
    expect(result.valid).toBe(true);
    expect(result.applied).toHaveLength(1);
    expect(validateScene(result.value).ok).toBe(true);

    const scene = result.value as {
      schemaVersion: number;
      timeline: { tracks: unknown[] };
      gui: { nodes: unknown[] };
      entities: Array<{
        components: Array<Record<string, unknown>>;
      }>;
    };
    expect(scene.schemaVersion).toBe(1);
    expect(scene.timeline.tracks).toEqual([]);
    expect(scene.gui.nodes).toEqual([]);

    const [transform, sprite, collider, body] = scene.entities[0]!.components;
    expect(transform).toMatchObject({ type: "Transform", rotation: 0, scale: { x: 1, y: 1 } });
    expect(sprite).toMatchObject({ type: "Sprite", anchor: { x: 0.5, y: 0.5 } });
    expect(collider).toMatchObject({ type: "AabbCollider", isStatic: true, isTrigger: false });
    expect(collider).not.toHaveProperty("static");
    expect(body).toMatchObject({ type: "RigidBody", isKinematic: true, mass: 1 });
    expect(body).not.toHaveProperty("kinematic");
  });

  it("upgrades a v0 project and prefab", () => {
    const project = migrateDocument(
      { name: "Old Game", scenes: ["main.scene.json"] },
      0,
      1,
      "project"
    );
    expect(project.valid).toBe(true);
    expect(validateProject(project.value).ok).toBe(true);
    expect(project.value).toMatchObject({
      schemaVersion: 1,
      name: "Old Game",
      assets: [],
      levels: [],
    });

    const prefab = migrateDocument(
      {
        name: "Coin",
        components: [{ type: "Transform", position: { x: 0, y: 0 } }],
      },
      0,
      1,
      "prefab"
    );
    expect(prefab.valid).toBe(true);
    expect(validatePrefab(prefab.value).ok).toBe(true);
    expect(prefab.value).toMatchObject({ schemaVersion: 1, id: "coin", name: "Coin" });
  });

  it("is idempotent when already at v1", () => {
    const first = migrateDocument({ name: "Game", scenes: [] }, 0, 1, "project");
    const second = migrateDocument(first.value, 0, 1, "project");
    expect(second.valid).toBe(true);
    expect(second.value).toMatchObject({ schemaVersion: 1, name: "Game" });
  });
});
