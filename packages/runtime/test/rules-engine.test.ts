import { describe, expect, it, vi } from "vitest";
import { createEmptyScene, createEntity, resolveGameRules } from "@gamekit/schema";
import type { GameKitEntity, TransformComponent } from "@gamekit/schema";
import { RulesEngine } from "../src/rules-engine.js";
import { executeActions, type ScriptContext } from "../src/script.js";

function withPlayer(sceneEntities: GameKitEntity[], x = 100, y = 100): GameKitEntity[] {
  const player = createEntity("Player", { x, y });
  player.components.push({
    type: "PlayerController",
    speed: 200,
    jumpVelocity: 400,
    gravity: 1800,
  } as any);
  return [player, ...sceneEntities];
}

describe("resolveGameRules", () => {
  it("synthesizes fall hazard from legacy fields", () => {
    const rules = resolveGameRules({ fallDeathEnabled: true, onFall: "respawn", lives: 2 });
    expect(rules.hazards.length).toBeGreaterThan(0);
    expect(rules.hazards[0].type).toBe("fall");
    expect(rules.hazards[0].onTrigger).toBe("respawn");
  });

  it("does not synthesize fall when disabled", () => {
    const rules = resolveGameRules({ fallDeathEnabled: false });
    expect(rules.hazards).toEqual([]);
  });
});

describe("RulesEngine", () => {
  it("loses on fall when onFall is gameOver", () => {
    const scene = createEmptyScene("Test");
    scene.gameRules = resolveGameRules({
      fallDeathEnabled: true,
      onFall: "gameOver",
      fallY: 500,
      lives: 3,
    });
    scene.entities = withPlayer([], 50, 50);

    const entities = structuredClone(scene.entities);
    const onOutcome = vi.fn();
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        getPlayerTransforms: () => {
          const p = entities.find((e) => e.components.some((c) => c.type === "PlayerController"));
          const t = p?.components.find((c): c is TransformComponent => c.type === "Transform");
          return t ? [{ entityId: p!.id, position: { ...t.position } }] : [];
        },
        setPlayerPosition: (id, pos) => {
          const p = entities.find((e) => e.id === id);
          const t = p?.components.find((c): c is TransformComponent => c.type === "Transform");
          if (t) {
            t.position.x = pos.x;
            t.position.y = pos.y;
          }
        },
        onOutcome,
      },
    );
    engine.start();

    // Drop player below fall line
    const player = entities.find((e) => e.components.some((c) => c.type === "PlayerController"))!;
    const transform = player.components.find((c): c is TransformComponent => c.type === "Transform")!;
    transform.position.y = 600;
    engine.update(1 / 60);

    expect(engine.getState().outcome).toBe("lost");
    expect(onOutcome).toHaveBeenCalledWith("lost", expect.any(String));
  });

  it("respawns and decrements lives on fall", () => {
    const scene = createEmptyScene("Test");
    scene.gameRules = resolveGameRules({
      fallDeathEnabled: true,
      onFall: "respawn",
      fallY: 500,
      lives: 2,
      spawnPoint: { x: 10, y: 20 },
    });
    scene.entities = withPlayer([], 50, 50);
    const entities = structuredClone(scene.entities);
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        getPlayerTransforms: () => {
          const p = entities.find((e) => e.components.some((c) => c.type === "PlayerController"));
          const t = p?.components.find((c): c is TransformComponent => c.type === "Transform");
          return t ? [{ entityId: p!.id, position: { ...t.position } }] : [];
        },
        setPlayerPosition: (id, pos) => {
          const p = entities.find((e) => e.id === id);
          const t = p?.components.find((c): c is TransformComponent => c.type === "Transform");
          if (t) Object.assign(t.position, pos);
        },
        resetPlayerMotion: () => {},
      },
      { initialSpawn: { x: 10, y: 20 } },
    );
    engine.start();

    const player = entities.find((e) => e.components.some((c) => c.type === "PlayerController"))!;
    const transform = player.components.find((c): c is TransformComponent => c.type === "Transform")!;
    transform.position.y = 600;
    engine.update(1 / 60);

    expect(engine.getState().outcome).toBe("playing");
    expect(engine.getState().livesRemaining).toBe(1);
    expect(transform.position).toEqual({ x: 10, y: 20 });
  });

  it("wins when all coin-tagged entities are collected", () => {
    const scene = createEmptyScene("Test");
    const coin = createEntity("CoinA", { x: 200, y: 100 });
    coin.tags = ["coin"];
    coin.components.push({
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 16, y: 16 },
      isStatic: true,
      isTrigger: true,
    } as any);
    scene.entities = withPlayer([coin]);
    scene.gameRules = resolveGameRules({
      fallDeathEnabled: false,
      objectives: [{ id: "c1", type: "collect", tag: "coin", count: 0 }],
      objectiveMode: "all",
      onWin: [],
    });

    const entities = structuredClone(scene.entities);
    const onOutcome = vi.fn();
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        destroyEntity: (id) => {
          const i = entities.findIndex((e) => e.id === id);
          if (i >= 0) entities.splice(i, 1);
        },
        getPlayerTransforms: () => [],
        onOutcome,
      },
    );
    engine.start();

    const coinId = entities.find((e) => e.tags?.includes("coin"))!.id;
    engine.handleTriggerEnter(coinId);

    expect(engine.getState().outcome).toBe("won");
    expect(onOutcome).toHaveBeenCalledWith("won", expect.any(String));
    expect(entities.find((e) => e.id === coinId)).toBeUndefined();
  });

  it("wins on reach goal tag", () => {
    const scene = createEmptyScene("Test");
    const goal = createEntity("Flag", { x: 300, y: 100 });
    goal.tags = ["goal"];
    scene.entities = withPlayer([goal]);
    scene.gameRules = resolveGameRules({
      fallDeathEnabled: false,
      objectives: [{ id: "g1", type: "reach", tag: "goal" }],
      onWin: [{ type: "completeLevel" }],
    });

    const entities = structuredClone(scene.entities);
    const completeLevel = vi.fn(() => "level-2");
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        getPlayerTransforms: () => [],
        sceneManager: {
          switchScene: () => false,
          setPersistentVar: () => {},
          completeLevel,
          getState: () => ({ currentLevelId: "level-1" }),
        },
      },
    );
    engine.start();
    engine.handleTriggerEnter(goal.id);

    expect(engine.getState().outcome).toBe("won");
    expect(completeLevel).toHaveBeenCalledWith("level-1");
  });

  it("auto-seeds collect objective from coin name heuristic", () => {
    const scene = createEmptyScene("Test");
    const coin = createEntity("Gold Coin", { x: 1, y: 1 });
    scene.entities = withPlayer([coin]);
    scene.gameRules = resolveGameRules({ fallDeathEnabled: false, objectives: [] });

    const entities = structuredClone(scene.entities);
    const onOutcome = vi.fn();
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        destroyEntity: (id) => {
          const i = entities.findIndex((e) => e.id === id);
          if (i >= 0) entities.splice(i, 1);
        },
        getPlayerTransforms: () => [],
        onOutcome,
      },
    );
    engine.start();
    engine.handleTriggerEnter(coin.id);
    expect(engine.getState().outcome).toBe("won");
  });
});

describe("RulesEngine + level onComplete", () => {
  it("runs level onComplete and completeLevel via scene manager", () => {
    const scene = createEmptyScene("Test");
    const goal = createEntity("Goal", { x: 1, y: 1 });
    goal.tags = ["goal"];
    scene.entities = withPlayer([goal]);
    scene.gameRules = resolveGameRules({
      fallDeathEnabled: false,
      objectives: [{ id: "g1", type: "reach", tag: "goal" }],
      onWin: [{ type: "completeLevel" }],
    });

    const entities = structuredClone(scene.entities);
    const completeLevel = vi.fn(() => "level-2");
    const setVar = vi.fn();
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        getPlayerTransforms: () => [],
        sceneManager: {
          switchScene: () => false,
          setPersistentVar: setVar,
          completeLevel,
          getState: () => ({ currentLevelId: "level-1" }),
        },
      },
      {
        level: {
          id: "level-1",
          name: "Level 1",
          order: 1,
          sceneIds: ["main.scene.json"],
          unlocked: true,
          onComplete: [{ type: "setVariable", key: "cleared", value: true }],
        },
      },
    );
    engine.start();
    engine.handleTriggerEnter(goal.id);

    expect(engine.getState().outcome).toBe("won");
    expect(completeLevel).toHaveBeenCalledWith("level-1");
    expect(setVar).toHaveBeenCalledWith("cleared", true);
  });

  it("merges level.rules over scene gameRules", () => {
    const scene = createEmptyScene("Test");
    scene.entities = withPlayer([]);
    scene.gameRules = resolveGameRules({ lives: 3, winMessage: "Scene win" });
    const engine = new RulesEngine(
      { ...scene, entities: scene.entities },
      {
        getEntities: () => scene.entities,
        getPlayerTransforms: () => [],
      },
      {
        level: {
          id: "level-1",
          name: "Level 1",
          order: 1,
          sceneIds: ["main.scene.json"],
          unlocked: true,
          rules: { lives: 1, winMessage: "Level win" },
        },
      },
    );
    expect(engine.rules.lives).toBe(1);
    expect(engine.rules.winMessage).toBe("Level win");
  });
});

describe("RulesEngine tagContact + checkpoint", () => {
  it("fires tagContact hazard and respawns with life loss", () => {
    const scene = createEmptyScene("Test");
    const spike = createEntity("Spike", { x: 200, y: 100 });
    spike.tags = ["hazard"];
    scene.entities = withPlayer([spike], 50, 50);
    scene.gameRules = resolveGameRules({
      fallDeathEnabled: false,
      lives: 2,
      onFall: "respawn",
      spawnPoint: { x: 10, y: 20 },
      hazards: [
        { id: "h1", type: "tagContact", tag: "hazard", onTrigger: "respawn", cooldown: 0 },
      ],
      objectives: [],
    });

    const entities = structuredClone(scene.entities);
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        getPlayerTransforms: () => {
          const p = entities.find((e) => e.components.some((c) => c.type === "PlayerController"))!;
          const t = p.components.find((c): c is TransformComponent => c.type === "Transform")!;
          return [{ entityId: p.id, position: { ...t.position } }];
        },
        setPlayerPosition: (id, pos) => {
          const p = entities.find((e) => e.id === id)!;
          const t = p.components.find((c): c is TransformComponent => c.type === "Transform")!;
          Object.assign(t.position, pos);
        },
        resetPlayerMotion: () => {},
      },
    );
    engine.start();
    engine.handleTriggerEnter(spike.id);

    expect(engine.getState().outcome).toBe("playing");
    expect(engine.getState().livesRemaining).toBe(1);
    const player = entities.find((e) => e.components.some((c) => c.type === "PlayerController"))!;
    const t = player.components.find((c): c is TransformComponent => c.type === "Transform")!;
    expect(t.position).toEqual({ x: 10, y: 20 });
  });

  it("updates spawn point from checkpoint tag", () => {
    const scene = createEmptyScene("Test");
    const flag = createEntity("Checkpoint", { x: 300, y: 150 });
    flag.tags = ["checkpoint"];
    scene.entities = withPlayer([flag]);
    scene.gameRules = resolveGameRules({
      fallDeathEnabled: false,
      spawnPoint: { x: 0, y: 0 },
      objectives: [],
    });
    const entities = structuredClone(scene.entities);
    const engine = new RulesEngine(
      { ...scene, entities },
      {
        getEntities: () => entities,
        getPlayerTransforms: () => [],
      },
    );
    engine.start();
    engine.handleTriggerEnter(flag.id);
    expect(engine.getState().spawnPoint).toEqual({ x: 300, y: 150 });
  });
});

describe("script actions for rules", () => {
  it("incrementVariable and win/lose hooks", () => {
    const vars: Record<string, unknown> = { score: 1 };
    const rules = {
      win: vi.fn(),
      lose: vi.fn(),
      respawn: vi.fn(),
      completeObjective: vi.fn(),
    };
    const ctx: ScriptContext = {
      entityId: "e1",
      entities: [],
      sceneManager: {
        switchScene: () => false,
        setPersistentVar: (k, v) => {
          vars[k] = v;
        },
        getPersistentVar: (k, d) => vars[k] ?? d,
      },
      rules,
    };

    executeActions(
      [
        { type: "incrementVariable", key: "score", by: 2 },
        { type: "win", message: "Nice" },
        { type: "completeObjective", objectiveId: "obj-1" },
      ],
      ctx,
    );

    expect(vars.score).toBe(3);
    expect(rules.win).toHaveBeenCalledWith("Nice");
    expect(rules.completeObjective).toHaveBeenCalledWith("obj-1");
  });
});
