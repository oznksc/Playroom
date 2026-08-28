import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
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

let root: string;
let server: ReturnType<typeof createMcpServer>;
let entityId: string;
/** First declared scene (project.scenes[0]) — what set_gravity targets. */
let sceneFile: string;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-tilemap-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  const project = createProject("Tilemap Test");
  await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));
  const scene = createEmptyScene("Main");
  const entity = createEntity("Map", { x: 0, y: 0 });
  entityId = entity.id;
  scene.entities.push(entity);
  sceneFile = project.scenes[0] ?? "main.scene.json";
  await writeFile(join(root, "gamekit", "scenes", sceneFile), sceneToJson(scene));
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
    const scene = JSON.parse(await readFile(join(root, "gamekit", "scenes", sceneFile), "utf8"));
    expect(scene.gravity).toEqual({ x: 0, y: 24 });
  });

  it("adds a tilemap and paints a tile", async () => {
    const add = await tool("add_tilemap").handler({
      scenePath: sceneFile,
      entityId,
      tilesetId: "tiles",
      tileWidth: 16,
      tileHeight: 16,
      columns: 4,
      gridWidth: 2,
      gridHeight: 2,
    });
    expect(add.isError).not.toBe(true);
    const paint = await tool("paint_tile").handler({
      scenePath: sceneFile,
      entityId,
      gridX: 1,
      gridY: 0,
      tileId: 3,
    });
    expect(paint.isError).not.toBe(true);
    const tilemap = JSON.parse(paint.content[0].text);
    expect(tilemap.tiles).toEqual([0, 3]);
  });

  it("paints a rectangle of tiles", async () => {
    await tool("add_tilemap").handler({
      scenePath: sceneFile,
      entityId,
      tilesetId: "tiles",
      tileWidth: 16,
      tileHeight: 16,
      columns: 4,
      gridWidth: 4,
      gridHeight: 3,
    });
    const result = await tool("paint_tiles").handler({
      scenePath: sceneFile,
      entityId,
      mode: "rect",
      tileId: 2,
      x: 1,
      y: 1,
      width: 2,
      height: 1,
    });
    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.tiles[1 * 4 + 1]).toBe(2);
    expect(payload.tiles[1 * 4 + 2]).toBe(2);
    expect(payload.tiles[0]).toBe(0);
  });

  it("rejects painting outside tilemap bounds", async () => {
    await tool("add_tilemap").handler({
      scenePath: sceneFile,
      entityId,
      tilesetId: "tiles",
      tileWidth: 16,
      tileHeight: 16,
      columns: 4,
      gridWidth: 2,
      gridHeight: 2,
    });
    const result = await tool("paint_tile").handler({
      scenePath: sceneFile,
      entityId,
      gridX: 2,
      gridY: 0,
      tileId: 1,
    });
    expect(result.content[0].text).toContain("out of bounds");
  });
});
