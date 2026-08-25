import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createEntity,
  type PlayerControllerComponent,
  type RigidBodyComponent,
  type AabbColliderComponent,
  type ParticleSystemComponent,
} from "@gamekit/schema";
import { simulateSceneSteps } from "../src/simulate.js";
import { createRng } from "../src/rng.js";
import { createParticleEmitter, updateParticleEmitter } from "../src/particles.js";

describe("Deterministic Simulation Snapshot Suite", () => {
  function buildTestScene() {
    const scene = createEmptyScene("Deterministic Physics Lab");
    scene.gravity = { x: 0, y: 980 };

    // Player Entity
    const player = createEntity("Player", { x: 50, y: 100 });
    player.id = "player-1";
    const playerController: PlayerControllerComponent = {
      type: "PlayerController",
      speed: 200,
      jumpVelocity: 450,
      gravity: 980,
    };
    const playerCollider: AabbColliderComponent = {
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 32, y: 48 },
      isStatic: false,
    };
    player.components.push(playerController, playerCollider);
    scene.entities.push(player);

    // Falling RigidBody Box
    const box = createEntity("DynamicBox", { x: 150, y: 50 });
    box.id = "box-1";
    const rb: RigidBodyComponent = {
      type: "RigidBody",
      velocity: { x: 20, y: 0 },
      angularVelocity: 0,
      mass: 2,
      drag: 0.05,
      isKinematic: false,
      gravityScale: 1,
      useGravity: true,
    };
    const boxCollider: AabbColliderComponent = {
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 30, y: 30 },
      isStatic: false,
    };
    box.components.push(rb, boxCollider);
    scene.entities.push(box);

    // Solid Floor Platform
    const floor = createEntity("Floor", { x: 0, y: 300 });
    floor.id = "floor-1";
    const floorCollider: AabbColliderComponent = {
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 800, y: 40 },
      isStatic: true,
    };
    floor.components.push(floorCollider);
    scene.entities.push(floor);

    return scene;
  }

  it("produces bit-for-bit identical simulation results across repeated runs with same seed", () => {
    const sceneA = buildTestScene();
    const sceneB = buildTestScene();

    const inputSequence = [
      { right: true },
      { right: true },
      { right: true, jump: true },
      { right: true },
      { right: true },
      {},
      {},
      { left: true },
      { left: true },
    ];

    const resultA = simulateSceneSteps(sceneA, {
      steps: 60,
      inputSequence,
      seed: "golden-sim-seed-2026",
      runRules: true,
    });

    const resultB = simulateSceneSteps(sceneB, {
      steps: 60,
      inputSequence,
      seed: "golden-sim-seed-2026",
      runRules: true,
    });

    expect(resultA.entitySummaries).toEqual(resultB.entitySummaries);
    expect(resultA.rulesOutcome).toEqual(resultB.rulesOutcome);
    expect(resultA.steps).toBe(60);

    // Assert specific physical state
    const playerA = resultA.entitySummaries.find((e) => e.name === "Player")!;
    const playerB = resultB.entitySummaries.find((e) => e.name === "Player")!;
    expect(playerA.position.x).toBeCloseTo(playerB.position.x, 6);
    expect(playerA.position.y).toBeCloseTo(playerB.position.y, 6);

    const boxA = resultA.entitySummaries.find((e) => e.name === "DynamicBox")!;
    const boxB = resultB.entitySummaries.find((e) => e.name === "DynamicBox")!;
    expect(boxA.position.x).toBeCloseTo(boxB.position.x, 6);
    expect(boxA.position.y).toBeCloseTo(boxB.position.y, 6);
  });

  it("produces deterministic particle bursts with seeded RNG", () => {
    const particleComp: ParticleSystemComponent = {
      type: "ParticleSystem",
      active: true,
      emissionRate: 50,
      maxParticles: 100,
      shape: "box",
      width: 20,
      height: 10,
      speed: 100,
      lifetime: 1.5,
      sizeStart: 8,
      sizeEnd: 2,
      colorStart: "#ffcc00",
      colorEnd: "#ff0000",
      gravityScale: 0.5,
    };

    const rng1 = createRng("particles-burst-seed");
    const emitter1 = createParticleEmitter();

    const rng2 = createRng("particles-burst-seed");
    const emitter2 = createParticleEmitter();

    // Advance 10 frames
    const dt = 1 / 60;
    for (let frame = 0; frame < 10; frame++) {
      updateParticleEmitter(emitter1, particleComp, { x: 100, y: 200 }, 980, dt, rng1);
      updateParticleEmitter(emitter2, particleComp, { x: 100, y: 200 }, 980, dt, rng2);
    }

    expect(emitter1.particles.length).toBeGreaterThan(0);
    expect(emitter1.particles).toEqual(emitter2.particles);
  });
});
