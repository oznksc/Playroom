import { describe, expect, it } from "vitest";
import { createEmptyScene } from "@gamekit/schema";
import { createCameraFollow } from "../src/camera.js";
import { applyAabbCollisions, intersectsAabb } from "../src/collision.js";
import { createPlayerController } from "../src/player.js";
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
