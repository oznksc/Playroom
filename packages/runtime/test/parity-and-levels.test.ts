import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createEntity,
  createLevel,
  validateScene,
} from "@gamekit/schema";
import { loadScene } from "../src/scene.js";
import { simulateSceneSteps } from "../src/simulate.js";
import {
  InMemoryStorage,
  SceneManager,
} from "../src/manager.js";
import {
  createParticleEmitter,
  updateParticleEmitter,
} from "../src/particles.js";

/** Shared platformer-like fixture used for physics parity smoke tests. */
export function createParityPlatformerFixture() {
  const scene = createEmptyScene("Parity Platformer");
  scene.viewport = { width: 844, height: 390, background: "#0b1220" };
  scene.gravity = { x: 0, y: 1800 };
  scene.responsive.orientation = "landscape";
  scene.responsive.referenceWidth = 844;
  scene.responsive.referenceHeight = 390;

  const ground = createEntity("Ground", { x: 422, y: 360 });
  ground.components.push({
    type: "AabbCollider",
    offset: { x: -422, y: -20 },
    size: { x: 844, y: 40 },
    isStatic: true,
  });

  const player = createEntity("Player", { x: 100, y: 200 });
  player.components.push({
    type: "AabbCollider",
    offset: { x: -20, y: -20 },
    size: { x: 40, y: 40 },
    isStatic: false,
  });
  player.components.push({
    type: "PlayerController",
    speed: 240,
    jumpVelocity: 500,
    gravity: 1800,
  });
  player.components.push({
    type: "RigidBody",
    velocity: { x: 0, y: 0 },
    angularVelocity: 0,
    mass: 1,
    drag: 0.05,
    isKinematic: false,
    gravityScale: 1,
    useGravity: true,
  });

  scene.entities.push(ground, player);
  return scene;
}

describe("physics parity fixture", () => {
  it("validates and is deterministic under gravity", () => {
    const scene = createParityPlatformerFixture();
    expect(validateScene(scene).ok).toBe(true);

    const a = simulateSceneSteps(scene, { steps: 90 });
    const b = simulateSceneSteps(scene, { steps: 90 });
    const playerA = a.entitySummaries.find((e) => e.name === "Player")!;
    const playerB = b.entitySummaries.find((e) => e.name === "Player")!;
    expect(playerA.position).toEqual(playerB.position);
    // Gravity pulls player downward from the spawn y
    expect(playerA.position.y).toBeGreaterThan(200);
  });

  it("moves right when holding right input", () => {
    const scene = createParityPlatformerFixture();
    const idle = simulateSceneSteps(scene, { steps: 60 });
    const moving = simulateSceneSteps(scene, { steps: 60, input: { right: true } });
    const idleX = idle.entitySummaries.find((e) => e.name === "Player")!.position.x;
    const moveX = moving.entitySummaries.find((e) => e.name === "Player")!.position.x;
    expect(moveX).toBeGreaterThan(idleX);
  });
});

describe("SceneManager levels + save", () => {
  it("blocks locked levels and unlocks via completeLevel", async () => {
    const sceneA = loadScene(createEmptyScene("A"));
    const sceneB = loadScene(createEmptyScene("B"));
    const levels = [
      createLevel("Level 1", 1, ["a.scene.json"]),
      createLevel("Level 2", 2, ["b.scene.json"]),
    ];
    const storage = new InMemoryStorage();
    const manager = new SceneManager(
      {
        scenes: {
          "a.scene.json": sceneA,
          "b.scene.json": sceneB,
        },
        transition: { type: "none", duration: 0 },
      },
      levels,
      storage,
    );

    expect(manager.isLevelUnlocked("level-1")).toBe(true);
    expect(manager.isLevelUnlocked("level-2")).toBe(false);
    expect(manager.switchLevel("level-2")).toBe(false);

    const unlocked = manager.completeLevel("level-1");
    expect(unlocked).toBe("level-2");
    expect(manager.isLevelUnlocked("level-2")).toBe(true);
    expect(manager.switchLevel("level-2")).toBe(true);
    expect(manager.getState().currentSceneId).toBe("b.scene.json");

    manager.setPersistentVar("coins", 3);
    await manager.saveGame("slot1");

    // Reset progress
    manager.clearPersistentState();
    manager.unlockLevel("level-2"); // already unlocked, no-op
    // Relock by reconstructing is hard; load should restore unlock + scene
    const manager2 = new SceneManager(
      {
        scenes: {
          "a.scene.json": sceneA,
          "b.scene.json": sceneB,
        },
        transition: { type: "none", duration: 0 },
      },
      [
        createLevel("Level 1", 1, ["a.scene.json"]),
        createLevel("Level 2", 2, ["b.scene.json"]),
      ],
      storage,
    );
    expect(manager2.isLevelUnlocked("level-2")).toBe(false);
    expect(await manager2.loadGame("slot1")).toBe(true);
    expect(manager2.getPersistentVar("coins")).toBe(3);
    expect(manager2.isLevelUnlocked("level-2")).toBe(true);
    expect(manager2.getState().currentSceneId).toBe("b.scene.json");
  });
});

describe("particles", () => {
  it("emits and ages particles", () => {
    const emitter = createParticleEmitter();
    const component = {
      type: "ParticleSystem" as const,
      maxParticles: 20,
      emissionRate: 50,
      lifetime: 0.5,
      speed: 40,
      gravityScale: 0,
      colorStart: "#fff",
      colorEnd: "#000",
      sizeStart: 4,
      sizeEnd: 0,
      shape: "point" as const,
      width: 0,
      height: 0,
      active: true,
    };
    const particles = updateParticleEmitter(emitter, component, { x: 10, y: 10 }, 0, 0.2);
    expect(particles.length).toBeGreaterThan(0);
    const later = updateParticleEmitter(emitter, component, { x: 10, y: 10 }, 0, 1);
    // Old particles expire within ~0.5s lifetime
    expect(later.every((p) => p.age < p.lifetime)).toBe(true);
  });
});
