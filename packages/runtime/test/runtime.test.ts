import { describe, expect, it } from "vitest";
import { createEmptyScene, createEntity } from "@gamekit/schema";
import { SceneManager, InMemoryStorage } from "../src/manager.js";
import { updateTween } from "../src/tween.js";
import { updateFollowPath } from "../src/path.js";
import { executeActions, transitionFsm } from "../src/script.js";
import { createCameraFollow } from "../src/camera.js";
import { getEntityPolygon, intersectsAabb, intersectsPolygonAabb, intersectsPolygonCircle, applyAabbCollisions, applyCircleCollisions, applyPolygonCollisions, updateCollisionEvents, updateTriggerEvents, type CollisionSolid } from "../src/collision.js";
import { createPlayerController } from "../src/player.js";
import { computeNineSliceRegions } from "../src/nineslice.js";
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
    player.setGrounded(true);

    expect(player.update({ left: false, right: true, jump: false }, 1 / 60).velocity.x).toBe(240);
  });

  it("applies air control damping while airborne", () => {
    const player = createPlayerController({
      type: "PlayerController",
      speed: 240,
      jumpVelocity: 620,
      gravity: 1800
    });

    expect(player.update({ left: false, right: true, jump: false }, 1 / 60).velocity.x).toBe(240 * 0.85);
  });

  it("grants coyote time after leaving the ground", () => {
    const player = createPlayerController({
      type: "PlayerController",
      speed: 240,
      jumpVelocity: 620,
      gravity: 1800
    });
    player.setGrounded(true);
    player.update({ left: false, right: false, jump: false }, 1 / 60);
    // Walk off the platform: coyote window keeps "grounded" for a few frames.
    player.setGrounded(false);
    player.update({ left: false, right: false, jump: false }, 1 / 60);
    player.setGrounded(false);

    const jumped = player.update({ left: false, right: false, jump: true }, 1 / 60);
    expect(jumped.velocity.y).toBe(-620);
  });

  it("buffers a jump pressed just before landing", () => {
    const player = createPlayerController({
      type: "PlayerController",
      speed: 240,
      jumpVelocity: 620,
      gravity: 1800
    });
    // Press jump while airborne (buffer starts), then land within the buffer window.
    player.update({ left: false, right: false, jump: true }, 1 / 60);
    player.setGrounded(true);

    const landed = player.update({ left: false, right: false, jump: false }, 1 / 60);
    expect(landed.velocity.y).toBe(-620);
  });

  it("only jumps once per press (edge-triggered)", () => {
    const player = createPlayerController({
      type: "PlayerController",
      speed: 240,
      jumpVelocity: 620,
      gravity: 1800
    });
    player.setGrounded(true);
    const first = player.update({ left: false, right: false, jump: true }, 1 / 60);
    expect(first.velocity.y).toBe(-620);

    // Holding the key must not re-apply the impulse.
    player.setGrounded(false);
    const held = player.update({ left: false, right: false, jump: true }, 1 / 60);
    expect(held.velocity.y).not.toBe(-620);
  });

  it("caps upward velocity to keep the player on screen", () => {
    const player = createPlayerController({
      type: "PlayerController",
      speed: 240,
      jumpVelocity: 100,
      gravity: 1800
    });
    player.setGrounded(true);
    // An external impulse (e.g. launch pad) below the cap floor is clamped to -200.
    player.state.velocity.y = -500;
    const result = player.update({ left: false, right: false, jump: false }, 1 / 60);

    expect(result.velocity.y).toBe(-200);
  });

  it("uses 4-way movement when gravity is zero", () => {
    const player = createPlayerController({
      type: "PlayerController",
      speed: 200,
      jumpVelocity: 0,
      gravity: 0,
    });
    const moved = player.update(
      { left: false, right: true, jump: false, up: true, down: false },
      1 / 60,
    );
    expect(moved.velocity.x).toBeCloseTo(200 / Math.SQRT2, 5);
    expect(moved.velocity.y).toBeCloseTo(-200 / Math.SQRT2, 5);
  });

  it("follows a target with smoothing", () => {
    const camera = createCameraFollow({ viewport: { x: 100, y: 100 }, smoothing: 1 });

    expect(camera.update({ x: 200, y: 150 }).position).toEqual({ x: 150, y: 100 });
  });

  it("applies a pure exponential lerp per frame (0 < smoothing < 1)", () => {
    const camera = createCameraFollow({ viewport: { x: 100, y: 100 }, smoothing: 0.5 });

    const first = { ...camera.update({ x: 200, y: 150 }).position };
    const second = { ...camera.update({ x: 200, y: 150 }).position };

    expect(first).toEqual({ x: 75, y: 50 });
    expect(second.x).toBeCloseTo(75 + (150 - 75) * 0.5, 5);
    expect(second.y).toBeCloseTo(50 + (100 - 50) * 0.5, 5);
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

  it("getEntityPolygon applies rotation and scale to points", () => {
    const entity = createEntity("Shield", { x: 100, y: 200 });
    const transform = entity.components.find((c) => c.type === "Transform")!;
    transform.rotation = 90;
    transform.scale = { x: 2, y: 1 };
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
    expect(poly.points[0].x).toBeCloseTo(142, 5);
    expect(poly.points[0].y).toBeCloseTo(220, 5);
    expect(poly.points[1].x).toBeCloseTo(110, 5);
    expect(poly.points[1].y).toBeCloseTo(284, 5);
    expect(poly.points[2].x).toBeCloseTo(78, 5);
    expect(poly.points[2].y).toBeCloseTo(220, 5);
    expect(poly.points[3].x).toBeCloseTo(110, 5);
    expect(poly.points[3].y).toBeCloseTo(156, 5);
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

  it("resolves an AABB dynamic body against a static polygon solid (Phaser parity)", () => {
    // A static convex ramp polygon. applyAabbCollisions resolves the polygon via
    // its bounding box (solidAabb), matching the Skia runtime exactly.
    const ramp: CollisionSolid = {
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 10 },
        { x: 100, y: 10 },
        { x: 100, y: 20 },
      ],
      layer: 1,
      entityId: "ramp",
    };

    // Body falling straight down into the polygon's upper bound (y=10).
    const result = applyAabbCollisions(
      { x: 20, y: 0, width: 10, height: 10 },
      { x: 0, y: 11 },
      [ramp],
    );

    expect(result.collisionEntityIds).toContain("ramp");
    expect(result.grounded).toBe(true);
    expect(result.velocity.y).toBe(0);
    expect(result.position.y).toBe(0);
  });

  it("resolves a circle dynamic body against a static polygon solid (Phaser parity)", () => {
    // A static convex polygon wall spanning x=10..20.
    const wall: CollisionSolid = {
      x: 0,
      y: 0,
      points: [
        { x: 10, y: 0 },
        { x: 10, y: 50 },
        { x: 20, y: 50 },
        { x: 20, y: 0 },
      ],
      layer: 1,
      entityId: "wall",
    };

    // Circle pushed right into the wall.
    const result = applyCircleCollisions(
      { x: 5, y: 25, radius: 4 },
      { x: 10, y: 0 },
      [wall],
    );

    expect(result.collisionEntityIds).toContain("wall");
    expect(result.velocity.x).toBe(0);
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

describe("behavior systems runtime logic", () => {
  it("executes updateTween correctly over time", () => {
    const transform = {
      type: "Transform" as const,
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 }
    };

    const tween = {
      type: "Tween" as const,
      property: "position.x" as const,
      startValue: 0,
      endValue: 100,
      duration: 2.0,
      easing: "linear" as const,
      loop: false,
      pingPong: false,
      active: true
    };

    // First frame (1s elapsed out of 2s duration)
    updateTween(tween, transform, 1.0);
    expect(transform.position.x).toBe(50);
    expect(tween.active).toBe(true);

    // Second frame (reaches end)
    updateTween(tween, transform, 1.0);
    expect(transform.position.x).toBe(100);
    expect(tween.active).toBe(false);
  });

  it("executes updateFollowPath correctly step-by-step", () => {
    const transform = {
      type: "Transform" as const,
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 }
    };

    const followPath = {
      type: "FollowPath" as const,
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
      speed: 10,
      loop: false
    };

    // First step: move towards point index 1 (x: 10, y: 0)
    updateFollowPath(followPath, transform, 0.5);
    expect(transform.position).toEqual({ x: 5, y: 0 });
    expect(followPath.currentPointIndex).toBe(0);
    expect(followPath.targetPointIndex).toBe(1);

    // Second step: reach point index 1
    updateFollowPath(followPath, transform, 0.5);
    expect(transform.position).toEqual({ x: 10, y: 0 });
    expect(followPath.currentPointIndex).toBe(1);
    expect(followPath.targetPointIndex).toBe(2);
  });

  it("handles state transitions and DSL actions", () => {
    const mockStorage = new InMemoryStorage();
    const sceneManager = new SceneManager({
      scenes: {},
      transition: { type: "none", duration: 0 }
    }, [], mockStorage);

    const entity = {
      id: "bot",
      name: "Robot",
      components: [
        {
          type: "StateMachine" as const,
          initialState: "idle",
          currentState: "idle",
          states: [
            { name: "idle", on: { "collisionEnter": "walking" } },
            { name: "walking" }
          ]
        },
        {
          type: "Script" as const,
          handlers: [
            {
              event: "enter:walking",
              actions: [
                { type: "setVariable", key: "walk_triggered", value: true }
              ]
            }
          ]
        }
      ]
    };

    const context = {
      entityId: "bot",
      entities: [entity],
      sceneManager
    };

    // Trigger transition to walking state
    const sm = entity.components[0] as StateMachineComponent;
    transitionFsm(sm, "walking", context);

    expect(sm.currentState).toBe("walking");
    expect(sceneManager.getPersistentVar("walk_triggered")).toBe(true);
  });
});

describe("nine-slice regions", () => {
  const base = {
    type: "NineSlice" as const,
    assetId: "panel",
    width: 100,
    height: 60,
    leftWidth: 10,
    rightWidth: 10,
    topHeight: 8,
    bottomHeight: 8,
  };

  it("lays out 9 regions for a natural source matching the component size", () => {
    const regions = computeNineSliceRegions(base, 0, 0, 100, 60);
    expect(regions).toHaveLength(9);

    const center = regions.find((r) => r.w === 80 && r.h === 44)!;
    expect(center.sx).toBe(10);
    expect(center.sy).toBe(8);
    expect(center.sw).toBe(80);
    expect(center.sh).toBe(44);
    expect(center.x).toBe(10);
    expect(center.y).toBe(8);
  });

  it("stretches edges and center when the component is larger than the source", () => {
    const big = { ...base, width: 200, height: 120 };
    const regions = computeNineSliceRegions(big, 0, 0, 100, 60);
    expect(regions).toHaveLength(9);

    const center = regions.find((r) => r.w === 180 && r.h === 104)!;
    expect(center.sw).toBe(80);
    expect(center.sh).toBe(44);
    // Corners keep source size.
    const topLeft = regions.find((r) => r.w === 10 && r.h === 8)!;
    expect(topLeft.sw).toBe(10);
    expect(topLeft.sh).toBe(8);
  });

  it("anchors target regions at the top-left corner", () => {
    const regions = computeNineSliceRegions(base, 50, 30, 100, 60);
    const topLeft = regions.find((r) => r.w === 10 && r.h === 8)!;
    expect(topLeft.x).toBe(50);
    expect(topLeft.y).toBe(30);
  });

  it("collapses to a single center region when borders are zero", () => {
    const noBorders = { ...base, leftWidth: 0, rightWidth: 0, topHeight: 0, bottomHeight: 0 };
    const regions = computeNineSliceRegions(noBorders, 0, 0, 100, 60);
    expect(regions).toHaveLength(1);
    expect(regions[0].w).toBe(100);
    expect(regions[0].h).toBe(60);
  });
});
