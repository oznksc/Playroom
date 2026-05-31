import { describe, expect, it } from "vitest";
import { createEmptyScene, parseScene, validateProject, validateScene } from "../src/index.js";

describe("scene schema", () => {
  it("creates a valid empty scene with reserved timeline and gui fields", () => {
    const scene = createEmptyScene("Forest Level");

    expect(validateScene(scene).ok).toBe(true);
    expect(scene.id).toBe("forest-level");
    expect(scene.timeline.tracks).toEqual([]);
    expect(scene.gui.nodes).toEqual([]);
  });

  it("reports actionable validation errors", () => {
    const result = validateScene({
      schemaVersion: 1,
      id: "broken",
      name: "Broken",
      viewport: { width: "390", height: 844, background: "#000" },
      gravity: { x: 0, y: 1 },
      assets: [],
      entities: [],
      timeline: { tracks: [] },
      gui: { nodes: [] }
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain("viewport.width must be a finite number");
  });

  it("fills omitted reserved blocks for forward-compatible scenes", () => {
    const scene = createEmptyScene();
    const { timeline: _timeline, gui: _gui, ...legacyScene } = scene;

    expect(parseScene(legacyScene).timeline.tracks).toEqual([]);
    expect(parseScene(legacyScene).gui.nodes).toEqual([]);
  });
});

describe("project schema", () => {
  it("validates project asset metadata", () => {
    const result = validateProject({
      schemaVersion: 1,
      name: "Example",
      scenes: ["main.scene.json"],
      assets: [{ id: "player", file: "player.png", kind: "image" }]
    });

    expect(result.ok).toBe(true);
  });
});
