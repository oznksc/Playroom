import { describe, expect, it } from "vitest";
import { createEmptyScene, createEntity } from "@gamekit/schema";
import { SceneManager, InMemoryStorage } from "../src/manager.js";
import { createCameraFollow } from "../src/camera.js";
import { getEntityPolygon, intersectsAabb, intersectsPolygonAabb, intersectsPolygonCircle, applyAabbCollisions, applyPolygonCollisions, updateCollisionEvents, updateTriggerEvents } from "../src/collision.js";
import { createPlayerController } from "../src/player.js";
import { createRigidBody, RIGID_BODY_SLEEP_DELAY } from "../src/rigid-body.js";
import { loadScene } from "../src/scene.js";

describe("runtime scene loading", () => {
  it("parses valid scenes", () => {
    const loaded = loadScene(createEmptyScene("Main"));

    expect(loaded.scene.name).toBe("Main");
  });
});

describe("aabb collision", () => {
  it("detects intersections", () => {
    expect(intersectsAabb(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 9, y: 9, width: 10, height: 10 }
    )).toBe(true);
  });

  it("resolves vertical ground collisions", () => {
    const result = applyAabbCollisions(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 0, y: 10 },
      [{ x: 0, y: 15, width: 100, height: 10, layer: 1 }]
    );

    expect(result.position.y).toBe(5);
    expect(result.velocity.y).toBe(0);
    expect(result.grounded).toBe(true);
  });
});

describe("player and camera helpers", () => {
  it("updates horizontal velocity from input", () => {
    const player = createPlayerController({
      type: "PlayerController",
      speed: 240,
      jumpVelocity: 620,
      gravity: 1800
    });

    expect(player.update({ left: false, right: true, jump: false }, 1 / 60).velocity.x).toBe(240);
  });

  it("follows a target with smoothing", () => {
    const camera = createCameraFollow({ viewport: { x: 100, y: 100 }, smoothing: 1 });

    expect(camera.update({ x: 200, y: 150 }).position).toEqual({ x: 150, y: 100 });
  });
});

describe("polygon collision", () => {
  it("getEntityPolygon returns correct world-space points from transform + PolygonCollider", () => {
    const entity = createEntity("Shield", { x: 100, y: 200 });
    entity.components.push({
      type: "PolygonCollider",
      offset: { x: 10, y: 20 },
      points: [
        { x: 0, y: -32 },
        { x: 32, y: 0 },
        { x: 0, y: 32 },
        { x: -32, y: 0 },
      ],
      isStatic: false,
    });

    const poly = getEntityPolygon(entity)!;
    expect(poly).toBeDefined();
    expect(poly.x).toBe(110);
    expect(poly.y).toBe(220);
    expect(poly.points).toHaveLength(4);
    expect(poly.points[0]).toEqual({ x: 110, y: 188 });
    expect(poly.points[1]).toEqual({ x: 142, y: 220 });
    expect(poly.points[2]).toEqual({ x: 110, y: 252 });
    expect(poly.points[3]).toEqual({ x: 78, y: 220 });
  });

  it("intersectsPolygonAabb returns true for overlapping polygon and AABB", () => {
    const poly = {
      x: 100,
      y: 100,
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 },
      ],
    };

    const overlapping = { x: 150, y: 150, width: 50, height: 50 };
    const nonOverlapping = { x: 300, y: 300, width: 10, height: 10 };

    expect(intersectsPolygonAabb(poly, overlapping)).toBe(true);
    expect(intersectsPolygonAabb(poly, nonOverlapping)).toBe(false);
  });

  it("uses SAT rather than polygon bounds for AABB intersections", () => {
    const triangle = {
      x: 5,
      y: 5,
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }],
    };

    expect(intersectsPolygonAabb(triangle, { x: 8, y: 8, width: 2, height: 2 })).toBe(false);
  });

  it("detects a circle fully inside a polygon", () => {
    const square = {
      x: 10,
      y: 10,
      points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }],
    };

    expect(intersectsPolygonCircle(square, { x: 10, y: 10, radius: 1 })).toBe(true);
  });

  it("resolves a falling polygon against a static floor", () => {
    const result = applyPolygonCollisions(
      { x: 5, y: 5, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
      { x: 0, y: 8 },
      [{ x: -20, y: 15, width: 100, height: 10, layer: 1 }],
    );

    expect(result.position).toEqual({ x: 5, y: 10 });
    expect(result.velocity).toEqual({ x: 0, y: 0 });
    expect(result.grounded).toBe(true);
  });

  it("honors collision masks when resolving polygons", () => {
    const result = applyPolygonCollisions(
      { x: 5, y: 5, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
      { x: 0, y: 8 },
      [{ x: -20, y: 15, width: 100, height: 10, layer: 2 }],
      1,
    );

    expect(result.position).toEqual({ x: 5, y: 13 });
    expect(result.velocity).toEqual({ x: 0, y: 8 });
    expect(result.grounded).toBe(false);
  });
});

describe("trigger events", () => {
  function createBox(name: string, x: number, isTrigger = false, layer = 1, mask = 1) {
    const entity = createEntity(name, { x, y: 0 });
    entity.components.push({
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 10, y: 10 },
      isStatic: isTrigger,
      isTrigger,
      layer,
      mask,
    });
    return entity;
  }

  it("emits enter once while an entity remains inside a trigger", () => {
    const trigger = createBox("Trigger", 0, true);
    const player = createBox("Player", 5);

    const first = updateTriggerEvents([trigger, player]);
    const second = updateTriggerEvents([trigger, player], first.active);

    expect(first.events).toEqual([{
      type: "enter",
      triggerEntityId: trigger.id,
      otherEntityId: player.id,
    }]);
    expect(second.events).toEqual([]);
  });

  it("emits exit after an overlapping entity leaves", () => {
    const trigger = createBox("Trigger", 0, true);
    const player = createBox("Player", 5);
    const first = updateTriggerEvents([trigger, player]);
    const transform = player.components.find((component) => component.type === "Transform");
    if (transform?.type === "Transform") transform.position.x = 20;

    const second = updateTriggerEvents([trigger, player], first.active);

    expect(second.events).toEqual([{
      type: "exit",
      triggerEntityId: trigger.id,
      otherEntityId: player.id,
    }]);
  });

  it("filters trigger overlaps using both collider masks", () => {
    const trigger = createBox("Trigger", 0, true, 1, 2);
    const ignored = createBox("Ignored", 5, false, 4, 1);

    expect(updateTriggerEvents([trigger, ignored]).events).toEqual([]);
  });
});

describe("rigid body sleeping", () => {
  function createBody() {
    return createRigidBody({
      type: "RigidBody",
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      mass: 1,
      drag: 0,
      isKinematic: false,
      gravityScale: 1,
      useGravity: true,
    });
  }

  it("sleeps after remaining supported and still for the delay", () => {
    const body = createBody();

    body.updateSleep(RIGID_BODY_SLEEP_DELAY / 2, true);
    expect(body.state.sleeping).toBe(false);
    body.updateSleep(RIGID_BODY_SLEEP_DELAY / 2, true);

    expect(body.state.sleeping).toBe(true);
    expect(body.state.velocity).toEqual({ x: 0, y: 0 });
  });

  it("does not sleep while unsupported or moving", () => {
    const body = createBody();
    body.updateSleep(RIGID_BODY_SLEEP_DELAY, false);
    body.state.velocity.x = 1;
    body.updateSleep(RIGID_BODY_SLEEP_DELAY, true);

    expect(body.state.sleeping).toBe(false);
    expect(body.state.sleepTimer).toBe(0);
  });

  it("wakes when an impulse is applied", () => {
    const body = createBody();
    body.sleep();
    body.applyImpulse({ x: 2, y: -1 });

    expect(body.state.sleeping).toBe(false);
    expect(body.state.velocity).toEqual({ x: 2, y: -1 });
  });

  it("skips force and position integration while sleeping", () => {
    const body = createBody();
    body.sleep();
    body.integrateForces(1, { x: 0, y: 100 });

    expect(body.state.velocity).toEqual({ x: 0, y: 0 });
    expect(body.integratePosition({ x: 10, y: 20 }, 1)).toEqual({ x: 10, y: 20 });
  });
});

describe("collision events", () => {
  it("reports the static entity contacted during collision resolution", () => {
    const result = applyAabbCollisions(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 0, y: 10 },
      [{ x: 0, y: 15, width: 100, height: 10, layer: 1, entityId: "floor" }],
    );

    expect(result.collisionEntityIds).toEqual(["floor"]);
  });

  it("emits enter only on the first frame of a continuous contact", () => {
    const contacts = [{ entityId: "player", otherEntityId: "floor" }];
    const first = updateCollisionEvents(contacts);
    const second = updateCollisionEvents(contacts, first.active);

    expect(first.events).toEqual(contacts);
    expect(second.events).toEqual([]);
  });

  it("emits enter again after contact ends and later resumes", () => {
    const contacts = [{ entityId: "player", otherEntityId: "floor" }];
    const first = updateCollisionEvents(contacts);
    const separated = updateCollisionEvents([], first.active);
    const resumed = updateCollisionEvents(contacts, separated.active);

    expect(resumed.events).toEqual(contacts);
  });
});

describe("SceneManager persistent state", () => {
  it("manages and persists state variables correctly", async () => {
    const scene = createEmptyScene("Main");
    const loaded = loadScene(scene);
    const storage = new InMemoryStorage();
    const manager = new SceneManager({
      scenes: { "main": loaded },
      transition: { type: "none", duration: 0 }
    }, [], storage);

    // Initial state
    expect(manager.getPersistentVar("score")).toBeUndefined();
    expect(manager.getPersistentVar("score", 10)).toBe(10);

    // Set variable
    manager.setPersistentVar("score", 100);
    manager.setPersistentVar("name", "Alice");
    expect(manager.getPersistentVar("score")).toBe(100);

    // Save game
    await manager.saveGame("slot1");

    // Clear state
    manager.clearPersistentState();
    expect(manager.getPersistentVar("score")).toBeUndefined();

    // Load game
    const success = await manager.loadGame("slot1");
    expect(success).toBe(true);
    expect(manager.getPersistentVar("score")).toBe(100);
    expect(manager.getPersistentVar("name")).toBe("Alice");
  });

  it("returns false if loading an empty or non-existent slot", async () => {
    const manager = new SceneManager({
      scenes: {},
      transition: { type: "none", duration: 0 }
    });

    const success = await manager.loadGame("nonexistent");
    expect(success).toBe(false);
  });
});
