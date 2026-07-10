import { describe, expect, it } from "vitest";
import { createEmptyScene, createEntity } from "@gamekit/schema";
import { simulateSceneSteps } from "../src/simulate.js";

describe("performance budget", () => {
  it("simulates 1000 kinematic entities under 500ms budget", () => {
    const scene = createEmptyScene("Perf");
    scene.gravity = { x: 0, y: 0 };

    for (let i = 0; i < 1000; i++) {
      const e = createEntity(`E${i}`, { x: (i % 40) * 20, y: Math.floor(i / 40) * 20 });
      e.components.push({
        type: "AabbCollider",
        offset: { x: -8, y: -8 },
        size: { x: 16, y: 16 },
        isStatic: true,
      });
      scene.entities.push(e);
    }

    const started = performance.now();
    const result = simulateSceneSteps(scene, { steps: 30 });
    const elapsed = performance.now() - started;

    expect(result.entitySummaries).toHaveLength(1000);
    // Headless fixed-step budget for CI machines
    expect(elapsed).toBeLessThan(500);
  });
});
