import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  createEmptyScene,
  createEntity,
  createProject,
  projectToJson,
  sceneToJson,
} from "@gamekit/schema";
import {
  createPrefabFromEntity,
  instantiatePrefab,
  listPrefabs,
  readPrefab,
  removePrefab,
  writeScene,
} from "../src/project.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-cli-prefab-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  await writeFile(join(gk, "project.json"), projectToJson(createProject("CLI Prefabs")));

  const scene = createEmptyScene("Main");
  const coin = createEntity("Coin", { x: 10, y: 20 });
  coin.components.push({
    type: "Sprite",
    assetId: "target",
    width: 24,
    height: 24,
    anchor: { x: 0.5, y: 0.5 },
  });
  scene.entities.push(coin);
  await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(scene));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("CLI prefab helpers", () => {
  it("creates, lists, instantiates, and removes prefabs", async () => {
    const scenePath = join(root, "gamekit", "scenes", "main.scene.json");
    const scene = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const entityId = scene.entities[0].id as string;

    const created = await createPrefabFromEntity(root, "main.scene.json", entityId, "Coin");
    expect(created.file).toBe("coin.prefab.json");

    const listed = await listPrefabs(root);
    expect(listed.some((p) => p.file === "coin.prefab.json")).toBe(true);

    const inst = await instantiatePrefab(root, "main.scene.json", "coin", { x: 90, y: 100 });
    expect(inst.name).toBe("Coin");

    const after = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    expect(after.entities.length).toBe(2);

    const removed = await removePrefab(root, "coin.prefab.json");
    expect(removed).toBe("coin.prefab.json");
    expect(await listPrefabs(root)).toHaveLength(0);
  });

  it("listPrefabs returns [] when prefabs dir does not exist", async () => {
    const emptyRoot = join(tmpdir(), `playroom-cli-prefab-empty-${randomUUID()}`);
    const gk = join(emptyRoot, "gamekit");
    await mkdir(join(gk, "scenes"), { recursive: true });
    await writeFile(join(gk, "project.json"), projectToJson(createProject("Empty")));
    const listed = await listPrefabs(emptyRoot);
    expect(listed).toEqual([]);
    await rm(emptyRoot, { recursive: true, force: true });
  });

  it("createPrefabFromEntity throws on non-existent entity", async () => {
    await expect(
      createPrefabFromEntity(root, "main.scene.json", "nonexistent-id", "Ghost")
    ).rejects.toThrow();
  });

  it("removePrefab throws when file does not exist", async () => {
    await expect(removePrefab(root, "nonexistent")).rejects.toThrow();
  });

  it("instantiatePrefab throws when prefab does not exist", async () => {
    await expect(
      instantiatePrefab(root, "main.scene.json", "totally-fake-prefab")
    ).rejects.toThrow();
  });

  it("instantiatePrefab with x-only overrides only x", async () => {
    const scenePath = join(root, "gamekit", "scenes", "main.scene.json");
    const scene = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const entityId = scene.entities[0].id as string;

    await createPrefabFromEntity(root, "main.scene.json", entityId, "Coin");
    await instantiatePrefab(root, "main.scene.json", "coin", { x: 500 });

    const after = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const spawned = after.entities[1];
    const transform = spawned.components.find((c: { type: string }) => c.type === "Transform");
    expect(transform.position.x).toBe(500);
    expect(transform.position.y).toBe(20); // original y preserved
  });

  it("instantiatePrefab with y-only overrides only y", async () => {
    const scenePath = join(root, "gamekit", "scenes", "main.scene.json");
    const scene = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const entityId = scene.entities[0].id as string;

    await createPrefabFromEntity(root, "main.scene.json", entityId, "Coin");
    await instantiatePrefab(root, "main.scene.json", "coin", { y: 777 });

    const after = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const spawned = after.entities[1];
    const transform = spawned.components.find((c: { type: string }) => c.type === "Transform");
    expect(transform.position.x).toBe(10); // original x preserved
    expect(transform.position.y).toBe(777);
  });

  it("instantiatePrefab deep-clones components (no mutation)", async () => {
    const scenePath = join(root, "gamekit", "scenes", "main.scene.json");
    const scene = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const entityId = scene.entities[0].id as string;

    await createPrefabFromEntity(root, "main.scene.json", entityId, "Coin");
    await instantiatePrefab(root, "main.scene.json", "coin", { x: 1, y: 2 });
    await instantiatePrefab(root, "main.scene.json", "coin", { x: 3, y: 4 });

    const after = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    expect(after.entities.length).toBe(3);
    const t1 = after.entities[1].components.find((c: { type: string }) => c.type === "Transform");
    const t2 = after.entities[2].components.find((c: { type: string }) => c.type === "Transform");
    expect(t1.position).toEqual({ x: 1, y: 2 });
    expect(t2.position).toEqual({ x: 3, y: 4 });
  });

  it("readPrefab returns valid prefab from disk", async () => {
    const scenePath = join(root, "gamekit", "scenes", "main.scene.json");
    const scene = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const entityId = scene.entities[0].id as string;

    await createPrefabFromEntity(root, "main.scene.json", entityId, "Coin");
    const prefab = await readPrefab(root, "coin.prefab.json");
    expect(prefab.name).toBe("Coin");
    expect(prefab.components.some((c) => c.type === "Sprite")).toBe(true);
  });

  it("readPrefab throws on non-existent file", async () => {
    await expect(readPrefab(root, "missing.prefab.json")).rejects.toThrow();
  });

  it("prefab summary includes componentTypes", async () => {
    const scenePath = join(root, "gamekit", "scenes", "main.scene.json");
    const scene = JSON.parse(await (await import("node:fs/promises")).readFile(scenePath, "utf8"));
    const entityId = scene.entities[0].id as string;

    await createPrefabFromEntity(root, "main.scene.json", entityId, "Coin");
    const listed = await listPrefabs(root);
    const coin = listed.find((p) => p.name === "Coin");
    expect(coin).toBeDefined();
    expect(coin!.componentTypes).toContain("Transform");
    expect(coin!.componentTypes).toContain("Sprite");
  });
});
