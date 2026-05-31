import { describe, expect, it } from "vitest";
import { createEmptyScene, createLevel, createProject, parseScene, validateProject, validateScene } from "../src/index.js";

describe("scene schema", () => {
  it("creates a valid empty scene with reserved timeline and gui fields", () => {
    const scene = createEmptyScene("Forest Level");

    expect(validateScene(scene).ok).toBe(true);
    expect(scene.id).toBe("forest-level");
    expect(scene.timeline.tracks).toEqual([]);
    expect(scene.gui.nodes).toEqual([]);
  });

  it("creates a scene with responsive config", () => {
    const scene = createEmptyScene();

    expect(scene.responsive).toBeDefined();
    expect(scene.responsive.mode).toBe("scale");
    expect(scene.responsive.orientation).toBe("portrait");
    expect(scene.responsive.safeArea.enabled).toBe(true);
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

  it("validates scene with responsive config", () => {
    const result = validateScene({
      schemaVersion: 1,
      id: "test",
      name: "Test",
      viewport: { width: 390, height: 844, background: "#000" },
      gravity: { x: 0, y: 1 },
      assets: [],
      entities: [],
      responsive: {
        mode: "scale",
        referenceWidth: 390,
        referenceHeight: 844,
        orientation: "portrait",
        safeArea: {
          enabled: true,
          padding: { top: 0, bottom: 0, left: 0, right: 0 }
        }
      },
      timeline: { tracks: [] },
      gui: { nodes: [] }
    });

    expect(result.ok).toBe(true);
  });

  it("validates scene with landscape orientation", () => {
    const result = validateScene({
      schemaVersion: 1,
      id: "landscape-test",
      name: "Landscape Test",
      viewport: { width: 844, height: 390, background: "#000" },
      gravity: { x: 0, y: 1 },
      assets: [],
      entities: [],
      responsive: {
        mode: "adaptive",
        referenceWidth: 844,
        referenceHeight: 390,
        orientation: "landscape",
        safeArea: {
          enabled: false,
          padding: { top: 0, bottom: 0, left: 0, right: 0 }
        }
      },
      timeline: { tracks: [] },
      gui: { nodes: [] }
    });

    expect(result.ok).toBe(true);
  });

  it("fills default responsive config when omitted", () => {
    const result = validateScene({
      schemaVersion: 1,
      id: "no-responsive",
      name: "No Responsive",
      viewport: { width: 390, height: 844, background: "#000" },
      gravity: { x: 0, y: 1 },
      assets: [],
      entities: [],
      timeline: { tracks: [] },
      gui: { nodes: [] }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.responsive).toBeDefined();
      expect(result.value.responsive.mode).toBe("scale");
      expect(result.value.responsive.orientation).toBe("portrait");
    }
  });
});

describe("level schema", () => {
  it("creates a level with correct defaults", () => {
    const level = createLevel("Forest", 1, ["main.scene.json"]);

    expect(level.id).toBe("forest");
    expect(level.name).toBe("Forest");
    expect(level.order).toBe(1);
    expect(level.sceneIds).toEqual(["main.scene.json"]);
    expect(level.unlocked).toBe(true);
  });

  it("creates a locked level for non-first order", () => {
    const level = createLevel("Cave", 2, ["cave.scene.json"]);

    expect(level.id).toBe("cave");
    expect(level.order).toBe(2);
    expect(level.unlocked).toBe(false);
  });
});

describe("project schema", () => {
  it("validates project asset metadata", () => {
    const result = validateProject({
      schemaVersion: 1,
      name: "Example",
      scenes: ["main.scene.json"],
      levels: [],
      assets: [{ id: "player", file: "player.png", kind: "image" }]
    });

    expect(result.ok).toBe(true);
  });

  it("validates project with levels", () => {
    const result = validateProject({
      schemaVersion: 1,
      name: "Example",
      scenes: ["main.scene.json", "cave.scene.json"],
      levels: [
        {
          id: "level-1",
          name: "Level 1",
          order: 1,
          sceneIds: ["main.scene.json"],
          unlocked: true
        },
        {
          id: "level-2",
          name: "Level 2",
          order: 2,
          sceneIds: ["cave.scene.json"],
          unlocked: false
        }
      ],
      assets: [{ id: "player", file: "player.png", kind: "image" }]
    });

    expect(result.ok).toBe(true);
  });

  it("creates a project with default level", () => {
    const project = createProject("Test Game");

    expect(project.levels).toHaveLength(1);
    expect(project.levels[0].name).toBe("Level 1");
    expect(project.levels[0].unlocked).toBe(true);
  });

  it("validates project without levels (backward compatible)", () => {
    const result = validateProject({
      schemaVersion: 1,
      name: "Legacy Project",
      scenes: ["main.scene.json"],
      assets: []
    });

    expect(result.ok).toBe(true);
  });
});
