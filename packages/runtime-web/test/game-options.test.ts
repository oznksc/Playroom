import { describe, expect, it } from "vitest";
import type { GameKitGameOptions } from "../src/game.js";
import type { GameKitPhaserSceneOptions } from "../src/scene.js";

describe("play host options", () => {
  it("exposes editor callback fields on game options", () => {
    const opts: GameKitGameOptions = {
      scene: {
        schemaVersion: 1,
        id: "test",
        name: "Test",
        viewport: { width: 100, height: 100, background: "#000" },
        gravity: { x: 0, y: 0 },
        assets: [],
        entities: [],
        responsive: {
          mode: "fixed",
          referenceWidth: 100,
          referenceHeight: 100,
          orientation: "landscape",
          safeArea: { enabled: false, padding: { top: 0, bottom: 0, left: 0, right: 0 } },
        },
        timeline: { tracks: [], duration: 0, loop: false, playing: false },
        gui: { nodes: [], componentInstances: [] },
      },
      assets: {},
      container: {} as HTMLElement,
      onOutcome: () => undefined,
      onLivesChange: () => undefined,
      suppressOutcomeOverlay: true,
      level: null,
    };
    expect(opts.suppressOutcomeOverlay).toBe(true);
    const sceneOpts: GameKitPhaserSceneOptions = {
      suppressOutcomeOverlay: true,
      onOutcome: opts.onOutcome,
    };
    expect(sceneOpts.suppressOutcomeOverlay).toBe(true);
  });
});
