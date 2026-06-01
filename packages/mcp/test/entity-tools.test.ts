import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, createEntity, projectToJson, sceneToJson } from "@gamekit/schema";
import { FileIO } from "../src/utils/file-io.js";

let tmpDir: string;
let fileIO: FileIO;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-test-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  const scenesDir = join(gkDir, "scenes");
  const assetsDir = join(gkDir, "assets");

  await mkdir(scenesDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const project = createProject("Test Project");
  await writeFile(join(gkDir, "project.json"), projectToJson(project));

  const scene = createEmptyScene("Main");
  await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

  fileIO = new FileIO(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("entity tools", () => {
  it("adds an entity to a scene", async () => {
    const scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Player");
    entity.components.push({
      type: "Transform",
      position: { x: 100, y: 200 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    });
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    expect(loaded.entities).toHaveLength(1);
    expect(loaded.entities[0].name).toBe("Player");
  });

  it("removes an entity from a scene", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Enemy");
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const index = scene.entities.findIndex((e) => e.id === entity.id);
    scene.entities.splice(index, 1);
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    expect(loaded.entities).toHaveLength(0);
  });

  it("adds RigidBody component to an entity", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Box");
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const box = scene.entities[0];
    box.components.push({
      type: "RigidBody",
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      mass: 2,
      drag: 0.1,
      isKinematic: false,
      gravityScale: 1,
      useGravity: true,
    });
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const rb = loaded.entities[0].components.find((c) => c.type === "RigidBody");
    expect(rb).toBeDefined();
    if (rb && rb.type === "RigidBody") {
      expect(rb.mass).toBe(2);
      expect(rb.drag).toBe(0.1);
      expect(rb.gravityScale).toBe(1);
    }
  });

  it("adds CircleCollider component to an entity", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Ball");
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const ball = scene.entities[0];
    ball.components.push({
      type: "CircleCollider",
      offset: { x: 0, y: 0 },
      radius: 16,
      isStatic: false,
      isTrigger: false,
    });
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const cc = loaded.entities[0].components.find((c) => c.type === "CircleCollider");
    expect(cc).toBeDefined();
    if (cc && cc.type === "CircleCollider") {
      expect(cc.radius).toBe(16);
      expect(cc.isTrigger).toBe(false);
    }
  });

  it("validates scene with RigidBody and CircleCollider components", async () => {
    let scene = await fileIO.readScene("main.scene.json");

    const ball = createEntity("Ball");
    ball.components = [
      { type: "Transform", position: { x: 100, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } },
      { type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 16, isStatic: false, isTrigger: false },
      { type: "RigidBody", velocity: { x: 0, y: 0 }, angularVelocity: 0, mass: 1, drag: 0, isKinematic: false, gravityScale: 1, useGravity: true },
    ];
    scene.entities.push(ball);

    const wall = createEntity("Wall");
    wall.components = [
      { type: "Transform", position: { x: 0, y: 500 }, rotation: 0, scale: { x: 1, y: 1 } },
      { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 800, y: 32 }, isStatic: true, layer: 1 },
    ];
    scene.entities.push(wall);

    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    expect(loaded.entities).toHaveLength(2);

    const loadedBall = loaded.entities.find((e) => e.name === "Ball")!;
    expect(loadedBall.components.some((c) => c.type === "RigidBody")).toBe(true);
    expect(loadedBall.components.some((c) => c.type === "CircleCollider")).toBe(true);

    const loadedWall = loaded.entities.find((e) => e.name === "Wall")!;
    const wallCollider = loadedWall.components.find((c) => c.type === "AabbCollider");
    expect(wallCollider).toBeDefined();
    if (wallCollider && wallCollider.type === "AabbCollider") {
      expect(wallCollider.isStatic).toBe(true);
    }
  });
});
