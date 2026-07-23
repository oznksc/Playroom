import { describe, expect, it } from "vitest";
import { createEmptyScene, createEntity } from "@gamekit/schema";
import { simulateSceneSteps } from "../src/simulate.js";
import { playerInputFromPressedKeys, resolveActionKeys } from "../src/input-map.js";

describe("simulateSceneSteps", () => {
  it("reports rules outcome when player falls with fall death", () => {
    const scene = createEmptyScene("FallRules");
    scene.gameRules = {
      fallDeathEnabled: true,
      fallY: 120,
      onFall: "gameOver",
      lives: 1,
      fallMargin: 0,
    } as any;
    const player = createEntity("Player", { x: 50, y: 50 });
    player.components.push({
      type: "AabbCollider",
      offset: { x: -8, y: -8 },
      size: { x: 16, y: 16 },
      isStatic: false,
    });
    player.components.push({
      type: "PlayerController",
      speed: 100,
      jumpVelocity: 200,
      gravity: 2000,
    });
    scene.entities.push(player);

    const result = simulateSceneSteps(scene, { steps: 120, runRules: true });
    expect(result.rulesOutcome).toBe("lost");
    expect(result.rulesMessage).toBeTruthy();
  });

  it("can disable rules evaluation", () => {
    const scene = createEmptyScene("NoRules");
    scene.gameRules = {
      fallDeathEnabled: true,
      fallY: 10,
      onFall: "gameOver",
      lives: 1,
    } as any;
    const player = createEntity("Player", { x: 0, y: 0 });
    player.components.push({
      type: "PlayerController",
      speed: 50,
      jumpVelocity: 100,
      gravity: 1800,
    });
    scene.entities.push(player);
    const result = simulateSceneSteps(scene, { steps: 60, runRules: false });
    expect(result.rulesOutcome).toBeUndefined();
    expect(result.entitySummaries[0]!.position.y).toBeGreaterThan(0);
  });

  it("advances a player with gravity over multiple steps", () => {
    const scene = createEmptyScene("Sim");
    const player = createEntity("Player", { x: 100, y: 100 });
    player.components.push({
      type: "AabbCollider",
      offset: { x: -16, y: -16 },
      size: { x: 32, y: 32 },
      isStatic: false,
    });
    player.components.push({
      type: "PlayerController",
      speed: 200,
      jumpVelocity: 400,
      gravity: 1800,
    });
    scene.entities.push(player);

    const result = simulateSceneSteps(scene, { steps: 30, input: { right: true } });
    expect(result.steps).toBe(30);
    const summary = result.entitySummaries.find((e) => e.name === "Player");
    expect(summary).toBeDefined();
    // Moved right and fell down under gravity
    expect(summary!.position.x).toBeGreaterThan(100);
    expect(summary!.position.y).toBeGreaterThan(100);
  });

  it("collides with static ground", () => {
    const scene = createEmptyScene("Grounded");
    scene.gravity = { x: 0, y: 1800 };

    const ground = createEntity("Ground", { x: 0, y: 200 });
    ground.components.push({
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 400, y: 40 },
      isStatic: true,
    });

    const player = createEntity("Player", { x: 50, y: 50 });
    player.components.push({
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 32, y: 32 },
      isStatic: false,
    });
    player.components.push({
      type: "PlayerController",
      speed: 100,
      jumpVelocity: 300,
      gravity: 1800,
    });

    scene.entities.push(ground, player);
    const result = simulateSceneSteps(scene, { steps: 120 });
    const summary = result.entitySummaries.find((e) => e.name === "Player")!;
    // Should settle near ground top (200 - 32 = 168)
    expect(summary.position.y).toBeLessThan(200);
    expect(summary.position.y).toBeGreaterThan(100);
  });
});

describe("input map", () => {
  it("resolves default action keys", () => {
    const keys = resolveActionKeys(undefined);
    expect(keys.left).toContain("ArrowLeft");
    expect(keys.jump).toContain(" ");
  });

  it("builds player input from pressed keys", () => {
    const input = playerInputFromPressedKeys(new Set(["d", " "]), {
      bindings: [
        { action: "move_left", keys: ["a"], touchControl: "left" },
        { action: "move_right", keys: ["d"], touchControl: "right" },
        { action: "jump", keys: [" "], touchControl: "jump" },
      ],
    });
    expect(input).toEqual({ left: false, right: true, jump: true, up: false, down: false });
  });
});
