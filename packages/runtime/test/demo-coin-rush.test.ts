import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseScene, validateScene } from "@gamekit/schema";
import { simulateSceneSteps } from "../src/simulate.js";
import { loadScene } from "../src/scene.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const demoScenePath = join(
  repoRoot,
  "templates/web-game/gamekit/scenes/main.scene.json",
);

describe("Coin Rush demo scene", () => {
  const raw = JSON.parse(readFileSync(demoScenePath, "utf8"));

  it("validates against the schema", () => {
    const result = validateScene(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }
  });

  it("loads as a playable scene with player, coins, ground, and goal", () => {
    const scene = parseScene(raw);
    const loaded = loadScene(scene);

    expect(loaded.scene.name).toBe("Coin Rush");
    expect(loaded.scene.viewport.width).toBe(844);
    expect(loaded.scene.viewport.height).toBe(390);

    const names = scene.entities.map((e) => e.name);
    expect(names).toContain("Player");
    expect(names).toContain("Goal");
    expect(names.filter((n) => n.startsWith("Coin")).length).toBe(8);
    expect(names.filter((n) => n.startsWith("Ground")).length).toBeGreaterThanOrEqual(4);
    expect(names.filter((n) => n.startsWith("Platform")).length).toBeGreaterThanOrEqual(4);

    const player = scene.entities.find((e) => e.id === "player")!;
    expect(player.components.some((c) => c.type === "PlayerController")).toBe(true);
    expect(player.components.some((c) => c.type === "CameraFollow")).toBe(true);
    expect(player.components.some((c) => c.type === "AabbCollider")).toBe(true);
  });

  it("lands the player on the ground under gravity", () => {
    const scene = parseScene(raw);
    const startY = (
      scene.entities.find((e) => e.id === "player")!.components.find(
        (c) => c.type === "Transform",
      ) as { position: { y: number } }
    ).position.y;

    const result = simulateSceneSteps(scene, { steps: 90 });
    const player = result.entitySummaries.find((e) => e.id === "player")!;

    // Should settle on top of the ground (not tunnel through)
    expect(player.position.y).toBeLessThan(360);
    expect(player.position.y).toBeGreaterThan(280);
    // Either already standing or dropped a bit onto ground
    expect(player.position.y).toBeGreaterThanOrEqual(Math.min(startY, 280));
  });

  it("moves right when right input is held", () => {
    const scene = parseScene(raw);
    const startX = (
      scene.entities.find((e) => e.id === "player")!.components.find(
        (c) => c.type === "Transform",
      ) as { position: { x: number } }
    ).position.x;

    const settled = simulateSceneSteps(scene, { steps: 60 });
    const afterMove = simulateSceneSteps(settled.scene, {
      steps: 30,
      input: { right: true },
    });
    const player = afterMove.entitySummaries.find((e) => e.id === "player")!;

    expect(player.position.x).toBeGreaterThan(startX + 40);
  });

  it("can jump while grounded", () => {
    const scene = parseScene(raw);
    const settled = simulateSceneSteps(scene, { steps: 90 });
    const groundedY = settled.entitySummaries.find((e) => e.id === "player")!.position.y;

    // Controllers are recreated each simulate call (grounded=false), so
    // frame 0 re-grounds via collision, frame 1 applies the jump impulse.
    let minY = groundedY;
    for (let i = 2; i <= 20; i++) {
      const mid = simulateSceneSteps(settled.scene, {
        steps: i,
        inputSequence: [
          { jump: false },
          { jump: true },
          ...Array.from({ length: i - 2 }, () => ({ jump: false })),
        ],
      });
      const y = mid.entitySummaries.find((e) => e.id === "player")!.position.y;
      if (y < minY) minY = y;
    }

    // +y is down; jump should lift the player (smaller y)
    expect(minY).toBeLessThan(groundedY - 20);
  });

  it("keeps all coins as trigger pickups", () => {
    const scene = parseScene(raw);
    const coins = scene.entities.filter((e) => e.name.startsWith("Coin"));
    expect(coins.length).toBe(8);
    for (const coin of coins) {
      const aabb = coin.components.find((c) => c.type === "AabbCollider") as {
        isTrigger?: boolean;
      };
      expect(aabb?.isTrigger).toBe(true);
      expect(coin.components.some((c) => c.type === "Script")).toBe(true);
    }
  });
});
