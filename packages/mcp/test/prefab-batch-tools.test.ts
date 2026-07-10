import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readdir } from "node:fs/promises";
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
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-prefab-test-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });
  await writeFile(join(gkDir, "project.json"), projectToJson(createProject("Prefab")));

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
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(scene));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("prefab tools", () => {
  it("creates and instantiates a prefab", async () => {
    const scene = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(tmpDir, "gamekit", "scenes", "main.scene.json"),
        "utf8",
      ),
    );
    const coinId = scene.entities[0].id;

    const createTool = (server as any)._registeredTools.create_prefab;
    const created = JSON.parse(
      (await createTool.handler({ scenePath: "main.scene.json", entityId: coinId, name: "Coin" }))
        .content[0].text,
    );
    expect(created.success).toBe(true);
    expect(created.file).toBe("coin.prefab.json");

    const files = await readdir(join(tmpDir, "gamekit", "prefabs"));
    expect(files).toContain("coin.prefab.json");

    const instTool = (server as any)._registeredTools.instantiate_prefab;
    const inst = JSON.parse(
      (
        await instTool.handler({
          scenePath: "main.scene.json",
          prefabId: "coin",
          x: 100,
          y: 200,
        })
      ).content[0].text,
    );
    expect(inst.success).toBe(true);
    expect(inst.entity.name).toBe("Coin");

    const after = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(tmpDir, "gamekit", "scenes", "main.scene.json"),
        "utf8",
      ),
    );
    expect(after.entities.length).toBe(2);
    const spawned = after.entities.find((e: { id: string }) => e.id === inst.entity.id);
    const transform = spawned.components.find((c: { type: string }) => c.type === "Transform");
    expect(transform.position).toEqual({ x: 100, y: 200 });
  });
});

describe("batch_apply_edit", () => {
  it("applies multiple ops atomically", async () => {
    const scene = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(tmpDir, "gamekit", "scenes", "main.scene.json"),
        "utf8",
      ),
    );
    const id = scene.entities[0].id;

    const tool = (server as any)._registeredTools.batch_apply_edit;
    const result = JSON.parse(
      (
        await tool.handler({
          scenePath: "main.scene.json",
          ops: [
            { op: "set_name", entityId: id, name: "GoldCoin" },
            {
              op: "update_transform",
              entityId: id,
              position: { x: 55, y: 66 },
            },
          ],
        })
      ).content[0].text,
    );
    expect(result.ok).toBe(true);
    expect(result.applied).toBe(2);

    const after = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(tmpDir, "gamekit", "scenes", "main.scene.json"),
        "utf8",
      ),
    );
    expect(after.entities[0].name).toBe("GoldCoin");
    const t = after.entities[0].components.find((c: { type: string }) => c.type === "Transform");
    expect(t.position).toEqual({ x: 55, y: 66 });
  });
});

describe("load_scene", () => {
  it("sets project.activeScene", async () => {
    const tool = (server as any)._registeredTools.load_scene;
    const result = JSON.parse(
      (await tool.handler({ scenePath: "main.scene.json", transition: "fade" })).content[0].text,
    );
    expect(result.success).toBe(true);
    expect(result.activeScene).toBe("main.scene.json");

    const project = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(tmpDir, "gamekit", "project.json"),
        "utf8",
      ),
    );
    expect(project.activeScene).toBe("main.scene.json");
  });
});
