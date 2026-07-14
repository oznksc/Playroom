import { describe, expect, it } from "vitest";
import { createEmptyScene, createEntity, parseScene, sceneToJson, validateScene } from "../src/index.js";

describe("schema golden scene", () => {
  it("round-trips the complete component catalog without losing component types", () => {
    const scene = createEmptyScene("Component Catalog");
    const entity = createEntity("Catalog Entity", { x: 32, y: 48 });
    entity.components.push(
      { type: "Sprite", assetId: "hero", width: 32, height: 32, anchor: { x: 0.5, y: 0.5 } },
      { type: "AabbCollider", offset: { x: -16, y: -16 }, size: { x: 32, y: 32 }, isStatic: false, isTrigger: false, layer: 1, mask: 1 },
      { type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 16, isStatic: false, isTrigger: false, layer: 1, mask: 1 },
      { type: "PolygonCollider", offset: { x: 0, y: 0 }, points: [{ x: -16, y: -16 }, { x: 16, y: -16 }, { x: 16, y: 16 }], isStatic: false, isTrigger: false, layer: 1, mask: 1 },
      { type: "PlayerController", speed: 180, jumpVelocity: 420, gravity: 1200 },
      { type: "RigidBody", velocity: { x: 0, y: 0 }, angularVelocity: 0, mass: 1, drag: 0, isKinematic: false, gravityScale: 1, useGravity: true },
      { type: "CameraFollow", targetId: "catalog-entity", smoothing: 0.2 },
      { type: "Animation", assetId: "hero-sheet", frameWidth: 32, frameHeight: 32, totalFrames: 4, framesPerSecond: 8, loop: true, currentFrame: 0 },
      { type: "Tilemap", tilesetId: "tiles", tileWidth: 16, tileHeight: 16, columns: 4, gridWidth: 2, gridHeight: 2, tiles: [0, 1, 2, 3] },
      { type: "Text", text: "Catalog", fontAssetId: "", size: 16, color: "#ffffff", align: "left" },
      { type: "AudioSource", assetId: "click", volume: 1, loop: false, playOnStart: false },
      { type: "AudioListener", enabled: true },
      { type: "Tween", property: "position.x", startValue: 0, endValue: 10, duration: 1, easing: "linear", loop: false, pingPong: false },
      { type: "FollowPath", points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], speed: 10, loop: false },
      { type: "StateMachine", initialState: "idle", states: [{ name: "idle", on: {} }] },
      { type: "Script", handlers: [{ event: "start", actions: [] }] },
      { type: "ParticleSystem", maxParticles: 8, emissionRate: 2, lifetime: 1, speed: 10, gravityScale: 0, colorStart: "#fff", colorEnd: "#000", sizeStart: 2, sizeEnd: 0, shape: "point", width: 0, height: 0, active: true },
      { type: "Light2D", kind: "point", range: 100, intensity: 1, color: "#ffffff" },
      { type: "NineSlice", assetId: "panel", width: 64, height: 64, leftWidth: 8, rightWidth: 8, topHeight: 8, bottomHeight: 8 },
    );
    scene.entities.push(entity);

    const result = validateScene(scene);
    expect(result.ok).toBe(true);
    const parsed = parseScene(JSON.parse(sceneToJson(scene)));
    expect(parsed.entities[0].components.map((component) => component.type)).toEqual([
      "Transform", "Sprite", "AabbCollider", "CircleCollider", "PolygonCollider", "PlayerController",
      "RigidBody", "CameraFollow", "Animation", "Tilemap", "Text", "AudioSource", "AudioListener",
      "Tween", "FollowPath", "StateMachine", "Script", "ParticleSystem", "Light2D", "NineSlice",
    ]);
  });
});
