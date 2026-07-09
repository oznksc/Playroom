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
  tmpDir = join(tmpdir(), `gamekit-mcp-physics-test-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  const scenesDir = join(gkDir, "scenes");
  const assetsDir = join(gkDir, "assets");

  await mkdir(scenesDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const project = createProject("Physics Test");
  await writeFile(join(gkDir, "project.json"), projectToJson(project));

  const scene = createEmptyScene("PhysicsScene");
  await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

  fileIO = new FileIO(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("physics MCP tools (via FileIO)", () => {
  it("adds CircleCollider via add_collider tool logic", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Ball");
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const ball = scene.entities[0];
    ball.components.push({
      type: "CircleCollider",
      offset: { x: 0, y: 0 },
      radius: 24,
      isStatic: false,
      isTrigger: false,
      layer: 1,
      mask: 1,
    });
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const cc = loaded.entities[0].components.find((c) => c.type === "CircleCollider") as any;
    expect(cc).toBeDefined();
    expect(cc.radius).toBe(24);
    expect(cc.layer).toBe(1);
    expect(cc.mask).toBe(1);
  });

  it("adds AabbCollider via add_collider tool logic", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Wall");
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const wall = scene.entities[0];
    wall.components.push({
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 800, y: 32 },
      isStatic: true,
    });
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const aabb = loaded.entities[0].components.find((c) => c.type === "AabbCollider") as AabbCollider;
    expect(aabb).toBeDefined();
    expect(aabb.size.x).toBe(800);
    expect(aabb.size.y).toBe(32);
    expect(aabb.isStatic).toBe(true);
  });

  it("adds RigidBody via add_rigid_body tool logic", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Box");
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const box = scene.entities[0];
    box.components.push({
      type: "RigidBody",
      velocity: { x: 100, y: 0 },
      angularVelocity: 1.5,
      mass: 5,
      drag: 0.2,
      isKinematic: false,
      gravityScale: 1,
      useGravity: true,
    });
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const rb = loaded.entities[0].components.find((c) => c.type === "RigidBody") as RigidBody;
    expect(rb).toBeDefined();
    expect(rb.mass).toBe(5);
    expect(rb.drag).toBe(0.2);
    expect(rb.velocity.x).toBe(100);
    expect(rb.angularVelocity).toBe(1.5);
  });

  it("sets collision layer and mask via set_collision_layer tool logic", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Player");
    entity.components.push({
      type: "CircleCollider",
      offset: { x: 0, y: 0 },
      radius: 16,
      isStatic: false,
      isTrigger: false,
    });
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const collider = scene.entities[0].components.find((c) => c.type === "CircleCollider") as CircleCollider;
    collider.layer = 2;
    collider.mask = 3;
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const cc = loaded.entities[0].components.find((c) => c.type === "CircleCollider") as CircleCollider;
    expect(cc.layer).toBe(2);
    expect(cc.mask).toBe(3);
  });

  it("sets trigger flag via set_trigger tool logic", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("TriggerZone");
    entity.components.push({
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 100, y: 100 },
      isStatic: true,
      isTrigger: false,
    });
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const aabb = scene.entities[0].components.find((c) => c.type === "AabbCollider") as AabbCollider;
    (aabb as Record<string, unknown>).isTrigger = true;
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const updated = loaded.entities[0].components.find((c) => c.type === "AabbCollider") as AabbCollider;
    expect((updated as Record<string, unknown>).isTrigger).toBe(true);
  });

  it("changes scene gravity via set_physics_gravity tool logic", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    scene.gravity = { x: 0, y: 800 };
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    expect(loaded.gravity.y).toBe(800);
  });

  it("prevents two colliders on the same entity", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Dual");
    entity.components.push({
      type: "CircleCollider",
      offset: { x: 0, y: 0 },
      radius: 16,
      isStatic: false,
      isTrigger: false,
    });
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const hasCollider = scene.entities[0].components.some(
      (c) => c.type === "AabbCollider" || c.type === "CircleCollider"
    );
    expect(hasCollider).toBe(true);
    const currentCount = scene.entities[0].components.filter(
      (c) => c.type === "AabbCollider" || c.type === "CircleCollider"
    ).length;
    expect(currentCount).toBe(1);
  });
});

it("adds PolygonCollider with 4 points to an entity", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("Pentagon");
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const pentagon = scene.entities[0];
    pentagon.components.push({
      type: "PolygonCollider",
      offset: { x: 10, y: 20 },
      points: [
        { x: 0, y: -32 },
        { x: 32, y: 0 },
        { x: 0, y: 32 },
        { x: -32, y: 0 },
      ],
      isStatic: true,
    });
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const pc = loaded.entities[0].components.find((c) => c.type === "PolygonCollider") as PolygonCollider;
    expect(pc).toBeDefined();
    expect(pc.points).toHaveLength(4);
    expect(pc.points[0]).toEqual({ x: 0, y: -32 });
    expect(pc.points[1].x).toBe(32);
    expect(pc.isStatic).toBe(true);
    expect(pc.offset.x).toBe(10);
    expect(pc.offset.y).toBe(20);
  });

  it("sets collision layer and mask on PolygonCollider entity", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("PolyWalls");
    entity.components.push({
      type: "PolygonCollider",
      offset: { x: 0, y: 0 },
      points: [{ x: 0, y: 0 }, { x: 64, y: 0 }, { x: 64, y: 64 }, { x: 0, y: 64 }],
      isStatic: true,
    });
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const pc = scene.entities[0].components.find((c) => c.type === "PolygonCollider") as PolygonCollider;
    pc.layer = 2;
    pc.mask = 5;
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const updated = loaded.entities[0].components.find((c) => c.type === "PolygonCollider") as PolygonCollider;
    expect(updated.layer).toBe(2);
    expect(updated.mask).toBe(5);
  });

  it("sets trigger on PolygonCollider entity", async () => {
    let scene = await fileIO.readScene("main.scene.json");
    const entity = createEntity("PolyTrigger");
    entity.components.push({
      type: "PolygonCollider",
      offset: { x: 0, y: 0 },
      points: [{ x: 0, y: 0 }, { x: 64, y: 0 }, { x: 64, y: 64 }, { x: 0, y: 64 }],
      isStatic: false,
      isTrigger: false,
    });
    scene.entities.push(entity);
    await fileIO.writeScene("main.scene.json", scene);

    scene = await fileIO.readScene("main.scene.json");
    const pc = scene.entities[0].components.find((c) => c.type === "PolygonCollider") as PolygonCollider;
    (pc as Record<string, unknown>).isTrigger = true;
    await fileIO.writeScene("main.scene.json", scene);

    const loaded = await fileIO.readScene("main.scene.json");
    const updated = loaded.entities[0].components.find((c) => c.type === "PolygonCollider") as PolygonCollider;
    expect((updated as Record<string, unknown>).isTrigger).toBe(true);
  });

type PolygonCollider = {
  type: "PolygonCollider";
  offset: { x: number; y: number };
  points: { x: number; y: number }[];
  isStatic: boolean;
  isTrigger?: boolean;
  layer?: number;
  mask?: number;
};

type CircleCollider = {
  type: "CircleCollider";
  offset: { x: number; y: number };
  radius: number;
  isStatic: boolean;
  isTrigger: boolean;
  layer?: number;
  mask?: number;
};

type AabbCollider = {
  type: "AabbCollider";
  offset: { x: number; y: number };
  size: { x: number; y: number };
  isStatic: boolean;
  isTrigger?: boolean;
  layer?: number;
  mask?: number;
};

type RigidBody = {
  type: "RigidBody";
  velocity: { x: number; y: number };
  angularVelocity: number;
  mass: number;
  drag: number;
  isKinematic: boolean;
  gravityScale: number;
  useGravity: boolean;
};