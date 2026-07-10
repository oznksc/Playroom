import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createEntity,
  createLevel,
  createPrefab,
  createProject,
  parseScene,
  sceneToJson,
  validatePrefab,
  validateProject,
  validateScene,
} from "../src/index.js";

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

describe("polygon collider round-trip", () => {
  it("preserves PolygonCollider points through sceneToJson/parseScene", () => {
    const scene = createEmptyScene("PolyTest");
    const entity = createEntity("PolyShape", { x: 100, y: 200 });
    entity.components.push({
      type: "PolygonCollider",
      offset: { x: 5, y: -5 },
      points: [
        { x: -30, y: -20 },
        { x: 30, y: -20 },
        { x: 20, y: 20 },
        { x: -20, y: 20 },
      ],
      isStatic: false,
      isTrigger: true,
      layer: 3,
      mask: 7,
    });
    scene.entities.push(entity);

    const json = sceneToJson(scene);
    const loaded = parseScene(JSON.parse(json));

    const polyEntity = loaded.entities.find((e) => e.name === "PolyShape")!;
    expect(polyEntity).toBeDefined();

    const pc = polyEntity.components.find((c) => c.type === "PolygonCollider") as any;
    expect(pc).toBeDefined();
    expect(pc.points).toHaveLength(4);
    expect(pc.points[0]).toEqual({ x: -30, y: -20 });
    expect(pc.points[1]).toEqual({ x: 30, y: -20 });
    expect(pc.points[2]).toEqual({ x: 20, y: 20 });
    expect(pc.points[3]).toEqual({ x: -20, y: 20 });
    expect(pc.offset).toEqual({ x: 5, y: -5 });
    expect(pc.isTrigger).toBe(true);
    expect(pc.layer).toBe(3);
    expect(pc.mask).toBe(7);
  });
});

describe("prefabs and project transitions", () => {
  it("creates and validates a prefab from entity components", () => {
    const entity = createEntity("Coin", { x: 1, y: 2 });
    entity.components.push({
      type: "Sprite",
      assetId: "target",
      width: 16,
      height: 16,
      anchor: { x: 0.5, y: 0.5 },
    });
    const prefab = createPrefab("Coin", entity.components, entity.name);
    const result = validatePrefab(prefab);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Coin");
      expect(result.value.components.some((c) => c.type === "Sprite")).toBe(true);
    }
  });

  it("validates optional project transitions and activeScene", () => {
    const project = createProject("WithTransitions");
    project.activeScene = "main.scene.json";
    project.transitions = [
      {
        id: "to-boss",
        name: "To Boss",
        toSceneId: "boss",
        type: "fade",
        duration: 0.5,
      },
    ];
    expect(validateProject(project).ok).toBe(true);
  });
});

describe("sprint 4 extensions: audio, text, and font", () => {
  it("validates scenes containing Text, AudioSource, and AudioListener components", () => {
    const scene = createEmptyScene("AudioTextTest");
    const entity = createEntity("MediaEntity", { x: 50, y: 50 });

    entity.components.push({
      type: "Text",
      text: "Hello World",
      fontAssetId: "custom-font",
      size: 24,
      color: "#ff0000",
      align: "center"
    });

    entity.components.push({
      type: "AudioSource",
      assetId: "laser-sound",
      volume: 0.8,
      loop: true,
      playOnStart: false
    });

    entity.components.push({
      type: "AudioListener",
      enabled: true
    });

    scene.entities.push(entity);

    const result = validateScene(scene);
    expect(result.ok).toBe(true);

    const json = sceneToJson(scene);
    const loaded = parseScene(JSON.parse(json));
    const loadedEntity = loaded.entities[0];

    const textComp = loadedEntity.components.find((c) => c.type === "Text") as any;
    expect(textComp.text).toBe("Hello World");
    expect(textComp.align).toBe("center");

    const audioComp = loadedEntity.components.find((c) => c.type === "AudioSource") as any;
    expect(audioComp.volume).toBe(0.8);
    expect(audioComp.loop).toBe(true);

    const listenerComp = loadedEntity.components.find((c) => c.type === "AudioListener") as any;
    expect(listenerComp.enabled).toBe(true);
  });

  it("validates ParticleSystem components", () => {
    const scene = createEmptyScene("Particles");
    const entity = createEntity("Emitter", { x: 0, y: 0 });
    entity.components.push({
      type: "ParticleSystem",
      maxParticles: 32,
      emissionRate: 10,
      lifetime: 1,
      speed: 50,
      gravityScale: 0.5,
      colorStart: "#00f0ff",
      colorEnd: "#000000",
      sizeStart: 4,
      sizeEnd: 0,
      shape: "point",
      width: 0,
      height: 0,
      active: true,
    });
    scene.entities.push(entity);
    expect(validateScene(scene).ok).toBe(true);
  });

  it("allows empty fontAssetId for system font Text labels", () => {
    const scene = createEmptyScene("SystemFont");
    const label = createEntity("Score", { x: 0, y: 0 });
    label.components.push({
      type: "Text",
      text: "Coins: 0",
      fontAssetId: "",
      size: 16,
      color: "#00f0ff",
      align: "left",
    });
    scene.entities.push(label);
    const result = validateScene(scene);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = result.value.entities[0].components.find((c) => c.type === "Text") as { fontAssetId: string };
      expect(text.fontAssetId).toBe("");
    }
  });

  it("validates assets with audio and font kinds", () => {
    const project = {
      schemaVersion: 1 as const,
      name: "TestProject",
      scenes: [],
      levels: [],
      assets: [
        { id: "img", file: "img.png", kind: "image" as const },
        { id: "laser-sound", file: "laser.mp3", kind: "audio" as const },
        { id: "custom-font", file: "font.ttf", kind: "font" as const }
      ],
      guiComponents: []
    };

    const result = validateProject(project);
    expect(result.ok).toBe(true);
    expect(result.value.assets[1].kind).toBe("audio");
    expect(result.value.assets[2].kind).toBe("font");
  });

  it("validates scenes with Tweens, FollowPaths, StateMachines, and Scripts", () => {
    const scene = createEmptyScene("BehaviorTest");
    const entity = createEntity("Robot", { x: 0, y: 0 });

    entity.components.push({
      type: "Tween",
      property: "position.x",
      startValue: 0,
      endValue: 100,
      duration: 2.0,
      easing: "easeInOut",
      loop: true,
      pingPong: true
    });

    entity.components.push({
      type: "FollowPath",
      points: [{ x: 0, y: 0 }, { x: 50, y: 50 }],
      speed: 10,
      loop: false
    });

    entity.components.push({
      type: "StateMachine",
      initialState: "idle",
      states: [
        { name: "idle", on: { "collisionEnter": "walking" } },
        { name: "walking", on: { "triggerEnter": "idle" } }
      ]
    });

    entity.components.push({
      type: "Script",
      handlers: [
        {
          event: "start",
          actions: [
            { type: "playSound", assetId: "sound-1" },
            { type: "setVariable", key: "started", value: true }
          ]
        }
      ]
    });

    scene.entities.push(entity);
    const result = validateScene(scene);
    expect(result.ok).toBe(true);

    const parsed = parseScene(JSON.parse(sceneToJson(scene)));
    expect(parsed.entities[0].components).toHaveLength(5); // transform + 4 behaviors
  });
});
