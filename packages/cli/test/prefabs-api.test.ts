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
});
