import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createPrefab, prefabToJson } from "@gamekit/schema";
import { migrateProject } from "../src/migrate.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-migrate-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "prefabs"), { recursive: true });
  await writeFile(
    join(gk, "project.json"),
    JSON.stringify({ name: "Legacy", scenes: ["main.scene.json"] })
  );
  await writeFile(
    join(gk, "scenes", "main.scene.json"),
    JSON.stringify({
      id: "main",
      name: "Main",
      viewport: { width: 390, height: 844, background: "#101820" },
      gravity: { x: 0, y: 1800 },
      entities: [
        {
          id: "block",
          name: "Block",
          components: [
            { type: "Transform", position: { x: 0, y: 0 } },
            { type: "AabbCollider", size: { x: 16, y: 16 }, static: true },
          ],
        },
      ],
    })
  );
  await writeFile(
    join(gk, "prefabs", "coin.prefab.json"),
    JSON.stringify({
      name: "Coin",
      components: [{ type: "Transform", position: { x: 1, y: 2 } }],
    })
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("migrateProject", () => {
  it("upgrades project, scenes, and prefabs from 0 to 1", async () => {
    const result = await migrateProject(root, 0, 1);
    expect(result.errors).toBe(0);
    expect(result.migrated).toBe(3);

    const project = JSON.parse(await readFile(join(root, "gamekit/project.json"), "utf8"));
    expect(project.schemaVersion).toBe(1);
    expect(project.assets).toEqual([]);

    const scene = JSON.parse(await readFile(join(root, "gamekit/scenes/main.scene.json"), "utf8"));
    expect(scene.schemaVersion).toBe(1);
    expect(scene.timeline.tracks).toEqual([]);
    const collider = scene.entities[0].components.find(
      (c: { type: string }) => c.type === "AabbCollider"
    );
    expect(collider.isStatic).toBe(true);
    expect(collider.static).toBeUndefined();

    const prefab = JSON.parse(
      await readFile(join(root, "gamekit/prefabs/coin.prefab.json"), "utf8")
    );
    expect(prefab.schemaVersion).toBe(1);
    expect(prefab.id).toBe("coin");
  });

  it("dry-run does not write files", async () => {
    const before = await readFile(join(root, "gamekit/project.json"), "utf8");
    const result = await migrateProject(root, 0, 1, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.migrated).toBeGreaterThan(0);
    const after = await readFile(join(root, "gamekit/project.json"), "utf8");
    expect(after).toBe(before);
  });

  it("skips files already at the target version", async () => {
    await migrateProject(root, 0, 1);
    const result = await migrateProject(root, 0, 1);
    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(3);
  });

  it("rejects unknown target versions before writing", async () => {
    await expect(migrateProject(root, 0, 99)).rejects.toThrow(/No migration/);
    const project = JSON.parse(await readFile(join(root, "gamekit/project.json"), "utf8"));
    expect(project.schemaVersion).toBeUndefined();
  });

  it("force-migrates a current v1 prefab without destroying it", async () => {
    const gk = join(root, "gamekit");
    await writeFile(
      join(gk, "prefabs", "player.prefab.json"),
      prefabToJson(
        createPrefab("Player", [
          { type: "Transform", position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        ])
      )
    );
    const result = await migrateProject(root, 1, 1, { force: true });
    expect(result.errors).toBe(0);
    const player = JSON.parse(await readFile(join(gk, "prefabs", "player.prefab.json"), "utf8"));
    expect(player.schemaVersion).toBe(1);
    expect(player.name).toBe("Player");
  });
});
