import { describe, expect, it } from "vitest";
import { createEmptyScene, createEntity, type GameKitScene } from "@gamekit/schema";
import { simulateSceneSteps } from "../src/simulate.js";

function playerAt(x: number, y: number) {
  const player = createEntity("Player", { x, y });
  player.components.push({
    type: "AabbCollider",
    offset: { x: 0, y: 0 },
    size: { x: 32, y: 32 },
    isStatic: false,
  });
  player.components.push({
    type: "PlayerController",
    speed: 300,
    jumpVelocity: 0,
    gravity: 1800,
  });
  return player;
}

function floorAt(scene: GameKitScene, y: number, opts: { solid: boolean; columns?: number; tiles?: number[] }): void {
  const columns = opts.columns ?? 4;
  const tiles = opts.tiles ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const floor = createEntity("Floor", { x: 0, y });
  floor.components.push({
    type: "Tilemap",
    tilesetId: "tiles",
    tileWidth: 32,
    tileHeight: 32,
    columns,
    gridWidth: tiles.length,
    gridHeight: 1,
    tiles,
    solid: opts.solid,
  });
  scene.entities.push(floor);
}

describe("tilemap collision", () => {
  it("rests a falling player on a solid tilemap floor", () => {
    const scene = createEmptyScene("TileFloor");
    scene.gravity = { x: 0, y: 1800 };
    floorAt(scene, 300, { solid: true });
    scene.entities.push(playerAt(50, 100));

    const result = simulateSceneSteps(scene, { steps: 240 });
    const summary = result.entitySummaries.find((e) => e.name === "Player")!;
    // Floor top at y=300; player AABB (32 tall, top-left anchored) rests at 268.
    expect(summary.position.y).toBeGreaterThan(260);
    expect(summary.position.y).toBeLessThan(300);
    expect(summary.velocity?.y ?? 0).toBeLessThan(0.1);
  });

  it("lets a player fall through a non-solid tilemap", () => {
    const scene = createEmptyScene("Hollow");
    scene.gravity = { x: 0, y: 1800 };
    floorAt(scene, 300, { solid: false });
    scene.entities.push(playerAt(50, 100));

    const result = simulateSceneSteps(scene, { steps: 60 });
    const summary = result.entitySummaries.find((e) => e.name === "Player")!;
    expect(summary.position.y).toBeGreaterThan(300);
  });

  it("honors collision masks against tile solids (layer 1)", () => {
    const scene = createEmptyScene("Masked");
    scene.gravity = { x: 0, y: 1800 };
    floorAt(scene, 300, { solid: true });
    const player = playerAt(50, 100);
    (player.components.find((c) => c.type === "AabbCollider") as { mask?: number }).mask = 0;
    scene.entities.push(player);

    const result = simulateSceneSteps(scene, { steps: 60 });
    const summary = result.entitySummaries.find((e) => e.name === "Player")!;
    expect(summary.position.y).toBeGreaterThan(300);
  });

  it("stops a top-down player at a solid tile wall", () => {
    const scene = createEmptyScene("TileWall");
    scene.gravity = { x: 0, y: 0 };
    const wall = createEntity("Wall", { x: 200, y: 0 });
    wall.components.push({
      type: "Tilemap",
      tilesetId: "tiles",
      tileWidth: 16,
      tileHeight: 16,
      columns: 4,
      gridWidth: 1,
      gridHeight: 10,
      tiles: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      solid: true,
    });
    const player = playerAt(50, 50);
    (player.components.find((c) => c.type === "PlayerController") as { gravity: number }).gravity = 0;
    player.components.push({ type: "RigidBody", useGravity: false, velocity: { x: 0, y: 0 } });
    scene.entities.push(wall, player);

    const result = simulateSceneSteps(scene, { steps: 120, input: { right: true } });
    const summary = result.entitySummaries.find((e) => e.name === "Player")!;
    // Wall left edge at x=200; player right edge (x+32) stops at 200 → x = 168.
    expect(summary.position.x).toBeGreaterThan(160);
    expect(summary.position.x).toBeLessThanOrEqual(168.5);
  });
});
