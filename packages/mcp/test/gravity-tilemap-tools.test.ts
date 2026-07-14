import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createEntity, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let root: string;
let server: ReturnType<typeof createMcpServer>;
let entityId: string;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-tilemap-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  await writeFile(join(root, "gamekit", "project.json"), projectToJson(createProject("Tilemap Test")));
  const scene = createEmptyScene("Main");
  const entity = createEntity("Map", { x: 0, y: 0 });
  entityId = entity.id;
  scene.entities.push(entity);
  await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(scene));
  server = createMcpServer(root);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

function tool(name: string) {
  return (server as any)._registeredTools[name];
}

describe("gravity and tilemap tool handlers", () => {
  it("updates gravity on the active scene", async () => {
    const result = await tool("set_gravity").handler({ x: 0, y: 24 });
    expect(result.isError).not.toBe(true);
    const scene = JSON.parse(await readFile(join(root, "gamekit", "scenes", "main.scene.json"), "utf8"));
    expect(scene.gravity).toEqual({ x: 0, y: 24 });
  });

  it("adds a tilemap and paints a tile", async () => {
    const add = await tool("add_tilemap").handler({ scenePath: "main.scene.json", entityId, tilesetId: "tiles", tileWidth: 16, tileHeight: 16, columns: 4, gridWidth: 2, gridHeight: 2 });
    expect(add.isError).not.toBe(true);
    const paint = await tool("paint_tile").handler({ scenePath: "main.scene.json", entityId, gridX: 1, gridY: 0, tileId: 3 });
    expect(paint.isError).not.toBe(true);
    const tilemap = JSON.parse(paint.content[0].text);
    expect(tilemap.tiles).toEqual([0, 3]);
  });

  it("rejects painting outside tilemap bounds", async () => {
    await tool("add_tilemap").handler({ scenePath: "main.scene.json", entityId, tilesetId: "tiles", tileWidth: 16, tileHeight: 16, columns: 4, gridWidth: 2, gridHeight: 2 });
    const result = await tool("paint_tile").handler({ scenePath: "main.scene.json", entityId, gridX: 2, gridY: 0, tileId: 1 });
    expect(result.content[0].text).toContain("out of bounds");
  });
});
