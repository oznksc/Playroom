import { describe, expect, it } from "vitest";
import {
  createDefaultGuiComponents,
  createDefaultMenuTransitions,
  createEmptyScene,
  createEntity,
  createLevel,
  createMenuScene,
  createPrefab,
  createProject,
  createSettingsScene,
  createStarterGameplayScene,
  findLevelForScene,
  GUI_MENU_EVENTS,
  parsePrefab,
  parseScene,
  prefabToJson,
  resolveFallDeathY,
  resolveGameRules,
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

  it("includes default gameRules on empty scenes", () => {
    const scene = createEmptyScene("Rules Level");
    expect(scene.gameRules?.fallDeathEnabled).toBe(true);
    expect(scene.gameRules?.onFall).toBe("gameOver");
    expect(validateScene(scene).ok).toBe(true);
  });

  it("validates gameRules and rejects bad onFall", () => {
    const ok = validateScene({
      ...createEmptyScene("Ok"),
      gameRules: {
        fallDeathEnabled: true,
        onFall: "respawn",
        lives: 2,
        fallMargin: 80,
        spawnPoint: { x: 10, y: 20 },
        gameOverMessage: "Ouch",
      },
    });
    expect(ok.ok).toBe(true);

    const bad = validateScene({
      schemaVersion: 1,
      id: "bad-rules",
      name: "Bad",
      viewport: { width: 100, height: 100, background: "#000" },
      gravity: { x: 0, y: 1 },
      assets: [],
      entities: [],
      timeline: { tracks: [], duration: 0, loop: false, playing: false },
      gui: { nodes: [], componentInstances: [] },
      gameRules: { onFall: "explode" },
    });
    expect(bad.ok).toBe(false);
    expect(bad.ok ? [] : bad.errors.some((e) => e.includes("onFall"))).toBe(true);
  });

  it("resolves fall death Y from ground colliders + margin", () => {
    const scene = createEmptyScene("Fall");
    scene.viewport.height = 390;
    const ground = createEntity("Ground", { x: 100, y: 360 });
    ground.components.push({
      type: "AabbCollider",
      offset: { x: -100, y: -20 },
      size: { x: 200, y: 40 },
      isStatic: true,
      isTrigger: false,
    });
    scene.entities.push(ground);
    // bottom = 360 - 20 + 40 = 380; + margin 120 = 500
    expect(resolveFallDeathY(scene, { fallMargin: 120 })).toBe(500);
    expect(resolveFallDeathY(scene, { fallY: 999 })).toBe(999);
    expect(resolveGameRules({ onFall: "respawn", lives: 1 }).onFall).toBe("respawn");
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

  it("finds level for scene by bare id or file name", () => {
    const levels = [
      createLevel("One", 1, ["main"]),
      createLevel("Two", 2, ["cave.scene.json"]),
    ];
    expect(findLevelForScene(levels, "main.scene.json")?.id).toBe("one");
    expect(findLevelForScene(levels, "main")?.id).toBe("one");
    expect(findLevelForScene(levels, "cave.scene.json")?.id).toBe("two");
    expect(findLevelForScene(levels, "missing")).toBeNull();
  });

  it("validates level onComplete and partial rules", () => {
    const result = validateProject({
      schemaVersion: 1,
      name: "Progression",
      scenes: ["main.scene.json"],
      levels: [
        {
          id: "level-1",
          name: "Level 1",
          order: 1,
          sceneIds: ["main.scene.json"],
          unlocked: true,
          onComplete: [{ type: "completeLevel" }, { type: "setVariable", key: "stage", value: 1 }],
          rules: { lives: 5 },
        },
      ],
      assets: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.levels[0].onComplete).toHaveLength(2);
      expect(result.value.levels[0].rules?.lives).toBe(5);
    }
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

describe("starter menu shell factories", () => {
  it("createProject includes menu scenes, activeScene, guiComponents, transitions", () => {
    const project = createProject("My Game");
    expect(validateProject(project).ok).toBe(true);
    expect(project.scenes).toEqual([
      "menu.scene.json",
      "settings.scene.json",
      "main.scene.json",
    ]);
    expect(project.activeScene).toBe("menu.scene.json");
    expect(project.guiComponents.length).toBeGreaterThanOrEqual(4);
    expect(project.guiComponents.map((c) => c.id).sort()).toEqual(
      ["game-over", "hud", "pause-menu", "you-win"].sort(),
    );
    expect(project.transitions?.length).toBeGreaterThanOrEqual(3);
  });

  it("createMenuScene has a filled example UI and switchScene handlers", () => {
    const scene = createMenuScene("Coin Rush");
    expect(validateScene(scene).ok).toBe(true);
    expect(scene.id).toBe("menu");
    // Rich layout: hero, actions, how-to, footer
    expect(scene.gui.nodes.length).toBeGreaterThanOrEqual(12);
    expect(scene.gui.nodes.some((n) => n.id === "menu-hero-panel")).toBe(true);
    expect(scene.gui.nodes.some((n) => n.id === "menu-howto-panel")).toBe(true);
    const play = scene.gui.nodes.find((n) => n.id === "btn-play");
    const settings = scene.gui.nodes.find((n) => n.id === "btn-settings");
    expect(play?.type).toBe("Button");
    if (play?.type === "Button") expect(play.action).toBe(GUI_MENU_EVENTS.startGame);
    if (settings?.type === "Button") expect(settings.action).toBe(GUI_MENU_EVENTS.openSettings);
    const controller = scene.entities.find((e) => e.id === "menu-controller");
    const script = controller?.components.find((c) => c.type === "Script");
    expect(script?.type).toBe("Script");
    if (script?.type === "Script") {
      expect(script.handlers.some((h) => h.event === GUI_MENU_EVENTS.startGame)).toBe(true);
      expect(script.handlers.some((h) => h.event === GUI_MENU_EVENTS.openSettings)).toBe(true);
    }
    const title = scene.gui.nodes.find((n) => n.id === "title-game");
    if (title?.type === "Text") expect(title.text).toBe("Coin Rush");
  });

  it("createSettingsScene has filled Audio/Display/Controls sections", () => {
    const scene = createSettingsScene();
    expect(validateScene(scene).ok).toBe(true);
    expect(scene.id).toBe("settings");
    expect(scene.gui.nodes.length).toBeGreaterThanOrEqual(14);
    expect(scene.gui.nodes.some((n) => n.id === "settings-audio-panel")).toBe(true);
    expect(scene.gui.nodes.some((n) => n.id === "settings-display-panel")).toBe(true);
    expect(scene.gui.nodes.some((n) => n.id === "settings-controls-panel")).toBe(true);
    expect(scene.gui.nodes.some((n) => n.id === "btn-music")).toBe(true);
    expect(scene.gui.nodes.some((n) => n.id === "btn-sfx")).toBe(true);
    const back = scene.gui.nodes.find((n) => n.id === "btn-back");
    if (back?.type === "Button") expect(back.action).toBe(GUI_MENU_EVENTS.backToMenu);
  });

  it("createStarterGameplayScene includes HUD instance and game controller", () => {
    const scene = createStarterGameplayScene();
    expect(validateScene(scene).ok).toBe(true);
    expect(scene.id).toBe("main");
    expect(scene.entities.some((e) => e.id === "player")).toBe(true);
    expect(scene.gui.componentInstances.some((i) => i.componentId === "hud")).toBe(true);
    expect(scene.entities.some((e) => e.id === "game-controller")).toBe(true);
  });

  it("default GUI components and transitions validate", () => {
    for (const c of createDefaultGuiComponents()) {
      expect(c.nodes.length).toBeGreaterThan(0);
    }
    const transitions = createDefaultMenuTransitions();
    expect(transitions.every((t) => t.toSceneId && t.type)).toBe(true);
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

describe("prefab schema (comprehensive)", () => {
  it("createPrefab generates id via slugify and stamps createdAt", () => {
    const prefab = createPrefab("Gold Coin", [{ type: "Transform", position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } }]);
    expect(prefab.id).toBe("gold-coin");
    expect(prefab.name).toBe("Gold Coin");
    expect(prefab.schemaVersion).toBe(1);
    expect(prefab.createdAt).toBeDefined();
    expect(new Date(prefab.createdAt!).getTime()).not.toBeNaN();
  });

  it("createPrefab deep-clones components (structuredClone isolation)", () => {
    const components = [{ type: "Transform" as const, position: { x: 10, y: 20 }, rotation: 0, scale: { x: 1, y: 1 } }];
    const prefab = createPrefab("T", components);
    (components[0].position as { x: number }).x = 999;
    expect(prefab.components[0].position).toEqual({ x: 10, y: 20 });
  });

  it("createPrefab stores sourceEntityName when provided", () => {
    const prefab = createPrefab("P", [], "OriginalEntity");
    expect(prefab.sourceEntityName).toBe("OriginalEntity");
  });

  it("createPrefab omits sourceEntityName when not provided", () => {
    const prefab = createPrefab("P", []);
    expect(prefab.sourceEntityName).toBeUndefined();
  });

  it("prefabToJson produces pretty-printed JSON with trailing newline", () => {
    const prefab = createPrefab("X", []);
    const json = prefabToJson(prefab);
    expect(json.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("X");
  });

  it("parsePrefab returns valid prefab on good input", () => {
    const prefab = createPrefab("Enemy", [{ type: "Transform", position: { x: 5, y: 5 }, rotation: 0, scale: { x: 1, y: 1 } }]);
    const result = parsePrefab(prefab);
    expect(result.name).toBe("Enemy");
  });

  it("parsePrefab throws on non-object input", () => {
    expect(() => parsePrefab("not an object")).toThrow("Invalid Playroom prefab");
    expect(() => parsePrefab(42)).toThrow("Invalid Playroom prefab");
    expect(() => parsePrefab(null)).toThrow("Invalid Playroom prefab");
  });

  it("validatePrefab rejects non-object input", () => {
    expect(validatePrefab(null).ok).toBe(false);
    expect(validatePrefab("string").ok).toBe(false);
    expect(validatePrefab(123).ok).toBe(false);
  });

  it("validatePrefab rejects missing schemaVersion", () => {
    const result = validatePrefab({ id: "x", name: "X", components: [] });
    expect(result.ok).toBe(false);
  });

  it("validatePrefab rejects wrong schemaVersion", () => {
    const result = validatePrefab({ schemaVersion: 2, id: "x", name: "X", components: [] });
    expect(result.ok).toBe(false);
  });

  it("validatePrefab rejects empty id", () => {
    const result = validatePrefab({ schemaVersion: 1, id: "", name: "X", components: [] });
    expect(result.ok).toBe(false);
  });

  it("validatePrefab rejects empty name", () => {
    const result = validatePrefab({ schemaVersion: 1, id: "x", name: "", components: [] });
    expect(result.ok).toBe(false);
  });

  it("validatePrefab accepts optional fields when valid", () => {
    const input = {
      schemaVersion: 1, id: "a", name: "A", components: [],
      sourceEntityName: "Src", createdAt: "2026-01-01T00:00:00.000Z",
    };
    const result = validatePrefab(input);
    expect(result.ok).toBe(true);
  });

  it("validatePrefab rejects non-string optional fields", () => {
    const input = {
      schemaVersion: 1, id: "a", name: "A", components: [],
      sourceEntityName: 123, createdAt: true,
    };
    const result = validatePrefab(input);
    expect(result.ok).toBe(false);
  });
});
