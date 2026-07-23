import type {
  GameKitEntity,
  GameKitLevel,
  GameRulesConfig,
  ScriptAction,
  TransformComponent,
  Vector2,
} from "@gamekit/schema";
import {
  effectiveEntityTags,
  mergeGameRules,
  resolveFallDeathY,
  resolveGameRules,
} from "@gamekit/schema";
import { executeActions, type ScriptContext } from "./script.js";

export type RulesOutcomeKind = "playing" | "won" | "lost";

export type RulesEngineHost = {
  getEntities: () => GameKitEntity[];
  destroyEntity?: (entityId: string) => void;
  getPlayerTransforms: () => Array<{ entityId: string; position: Vector2 }>;
  setPlayerPosition?: (entityId: string, position: Vector2) => void;
  resetPlayerMotion?: (entityId: string) => void;
  sceneManager?: ScriptContext["sceneManager"];
  playSound?: (assetId: string) => void;
  /** Called when outcome changes (won/lost) for overlays / pause. */
  onOutcome?: (kind: "won" | "lost", message: string) => void;
  /** Lives HUD updates. */
  onLivesChange?: (lives: number | null) => void;
  /** Collect progress updates. */
  onCollectProgress?: (tag: string, collected: number, target: number) => void;
};

export type RulesEngineState = {
  outcome: RulesOutcomeKind;
  message: string | null;
  livesRemaining: number;
  unlimitedLives: boolean;
  spawnPoint: Vector2;
  fallCooldown: number;
  completedObjectives: Set<string>;
  collectCounts: Map<string, number>;
  collectTargets: Map<string, number>;
  surviveElapsed: number;
  destroyedForCollect: Set<string>;
  reachedGoals: Set<string>;
  /** Elapsed time since engine start (for hazard cooldowns). */
  elapsed: number;
  /** Last fire time per hazard id (tagContact cooldown). */
  hazardLastFire: Map<string, number>;
};

export class RulesEngine {
  readonly rules: GameRulesConfig;
  private host: RulesEngineHost;
  private state: RulesEngineState;
  private level: GameKitLevel | null;
  private fallY: number;
  private started = false;

  constructor(
    scene: {
      viewport: { height: number };
      entities: GameKitEntity[];
      gameRules?: GameRulesConfig | null | undefined;
    },
    host: RulesEngineHost,
    options?: {
      level?: GameKitLevel | null;
      projectDefaults?: Partial<GameRulesConfig> | null;
      initialSpawn?: Vector2 | null;
    },
  ) {
    this.host = host;
    this.level = options?.level ?? null;
    // Level partial rules override scene (e.g. harder lives on later stages).
    // Order: project defaults → scene → level.
    this.rules = mergeGameRules(
      options?.projectDefaults ?? undefined,
      scene.gameRules ?? undefined,
      options?.level?.rules ?? undefined,
    );

    const players = host.getPlayerTransforms();
    const spawn =
      this.rules.spawnPoint ??
      options?.initialSpawn ??
      (players[0] ? { ...players[0].position } : { x: 0, y: 0 });

    const unlimited = this.rules.lives <= 0;
    this.state = {
      outcome: "playing",
      message: null,
      livesRemaining: unlimited ? 0 : this.rules.lives,
      unlimitedLives: unlimited,
      spawnPoint: { ...spawn },
      fallCooldown: 0,
      completedObjectives: new Set(),
      collectCounts: new Map(),
      collectTargets: new Map(),
      surviveElapsed: 0,
      destroyedForCollect: new Set(),
      reachedGoals: new Set(),
      elapsed: 0,
      hazardLastFire: new Map(),
    };

    this.fallY = resolveFallDeathY(
      { viewport: scene.viewport, entities: scene.entities, gameRules: this.rules },
      this.rules,
    );
    this.autoSeedObjectivesFromEntities(scene.entities);
    this.initCollectTargets(scene.entities);
  }

  getState(): RulesEngineState {
    return this.state;
  }

  getFallY(): number {
    return this.fallY;
  }

  /** Build a ScriptContext that can drive rules + scene manager. */
  scriptContext(entityId: string, extra?: Partial<ScriptContext>): ScriptContext {
    return {
      entityId,
      entities: this.host.getEntities(),
      sceneManager: this.host.sceneManager,
      destroyEntity: this.host.destroyEntity,
      playSound: this.host.playSound,
      rules: {
        win: (message) => this.win(message),
        lose: (message) => this.lose(message),
        respawn: () => this.respawnAll(),
        completeObjective: (id) => this.completeObjective(id),
        setLives: (n) => this.setLives(n),
        addLives: (d) => this.addLives(d),
        setCheckpoint: (point) => this.setSpawnPoint(point),
      },
      ...extra,
    };
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    if (this.rules.onStart.length > 0) {
      executeActions(this.rules.onStart, this.scriptContext("__rules__"));
    }
    this.host.onLivesChange?.(this.state.unlimitedLives ? null : this.state.livesRemaining);
  }

  /**
   * Fixed-step update: fall hazard + survive objectives.
   * Call once per physics step with dt in seconds.
   */
  update(dt: number): void {
    if (this.state.outcome !== "playing") return;

    this.state.elapsed += dt;
    if (this.state.fallCooldown > 0) {
      this.state.fallCooldown = Math.max(0, this.state.fallCooldown - dt);
    }

    this.tickSurvive(dt);
    this.evaluateFallHazard();
    this.checkObjectives();
  }

  /**
   * Notify that a player (or any entity) overlapped a trigger entity.
   * Handles collect / reach objectives and tagContact hazards.
   */
  handleTriggerEnter(triggerEntityId: string, _otherEntityId?: string): void {
    if (this.state.outcome !== "playing") return;
    const entities = this.host.getEntities();
    const trigger = entities.find((e) => e.id === triggerEntityId);
    if (!trigger) return;

    const tags = effectiveEntityTags(trigger);

    // Collect objectives
    for (const obj of this.rules.objectives) {
      if (obj.type !== "collect") continue;
      const tag = typeof obj.tag === "string" ? obj.tag : "coin";
      if (!tags.includes(tag)) continue;
      if (this.state.destroyedForCollect.has(trigger.id)) continue;

      this.state.destroyedForCollect.add(trigger.id);
      const prev = this.state.collectCounts.get(tag) ?? 0;
      const next = prev + 1;
      this.state.collectCounts.set(tag, next);
      const target = this.state.collectTargets.get(tag) ?? 0;
      this.host.onCollectProgress?.(tag, next, target);
      this.host.destroyEntity?.(trigger.id);

      if (target > 0 && next >= target) {
        this.state.completedObjectives.add(obj.id);
      }
    }

    // Reach objectives
    for (const obj of this.rules.objectives) {
      if (obj.type !== "reach") continue;
      const tag = typeof obj.tag === "string" ? obj.tag : undefined;
      const entityId = typeof obj.entityId === "string" ? obj.entityId : undefined;
      const match =
        (entityId && trigger.id === entityId) ||
        (tag && tags.includes(tag)) ||
        (!entityId && !tag && tags.includes("goal"));
      if (!match) continue;
      this.state.reachedGoals.add(trigger.id);
      this.state.completedObjectives.add(obj.id);
    }

    // Checkpoints — update respawn point from tagged trigger position
    if (tags.includes("checkpoint") || tags.includes("spawn")) {
      const transform = trigger.components.find(
        (c): c is TransformComponent => c.type === "Transform",
      );
      if (transform) {
        this.setSpawnPoint({ ...transform.position });
      }
    }

    // tagContact hazards (with optional cooldown seconds)
    for (const hazard of this.rules.hazards) {
      if (hazard.type !== "tagContact") continue;
      const tag = typeof hazard.tag === "string" ? hazard.tag : "hazard";
      if (!tags.includes(tag)) continue;
      const hazardId = typeof hazard.id === "string" ? hazard.id : tag;
      const cooldown = typeof hazard.cooldown === "number" ? hazard.cooldown : 0.4;
      const last = this.state.hazardLastFire.get(hazardId) ?? -Infinity;
      if (this.state.elapsed - last < cooldown) continue;
      this.state.hazardLastFire.set(hazardId, this.state.elapsed);
      this.fireHazard(hazard);
    }

    this.checkObjectives();
  }

  completeObjective(objectiveId: string): void {
    if (this.state.outcome !== "playing") return;
    this.state.completedObjectives.add(objectiveId);
    this.checkObjectives();
  }

  win(message?: string): void {
    if (this.state.outcome !== "playing") return;
    this.state.outcome = "won";
    this.state.message = message?.trim() || this.rules.winMessage;
    this.runOutcomeActions("win");
    this.host.onOutcome?.("won", this.state.message);
  }

  lose(message?: string): void {
    if (this.state.outcome !== "playing") return;
    this.state.outcome = "lost";
    this.state.message = message?.trim() || this.rules.gameOverMessage;
    this.runOutcomeActions("lose");
    this.host.onOutcome?.("lost", this.state.message);
  }

  respawnAll(): void {
    const spawn = this.state.spawnPoint;
    for (const player of this.host.getPlayerTransforms()) {
      this.host.setPlayerPosition?.(player.entityId, { ...spawn });
      this.host.resetPlayerMotion?.(player.entityId);
    }
    this.state.fallCooldown = 0.4;
  }

  setLives(lives: number): void {
    const n = Math.max(0, Math.floor(lives));
    this.state.unlimitedLives = n <= 0 && this.rules.lives <= 0;
    this.state.livesRemaining = n;
    this.host.onLivesChange?.(this.state.unlimitedLives ? null : this.state.livesRemaining);
  }

  addLives(delta: number): void {
    if (this.state.unlimitedLives) return;
    this.setLives(this.state.livesRemaining + delta);
  }

  setSpawnPoint(point: Vector2): void {
    this.state.spawnPoint = { ...point };
  }

  // ---------------------------------------------------------------------------

  /**
   * Legacy scenes without explicit objectives still win on coin collect / goal reach
   * via name→tag heuristics (`effectiveEntityTags`). Also seeds tagContact for hazard names.
   */
  private autoSeedObjectivesFromEntities(entities: GameKitEntity[]): void {
    const tagSet = new Set<string>();
    for (const e of entities) {
      for (const t of effectiveEntityTags(e)) tagSet.add(t);
    }

    if (this.rules.objectives.length === 0) {
      if (tagSet.has("coin")) {
        this.rules.objectives.push({ id: "auto-collect-coin", type: "collect", tag: "coin", count: 0 });
      }
      if (tagSet.has("goal")) {
        this.rules.objectives.push({ id: "auto-reach-goal", type: "reach", tag: "goal" });
      }
      // Old web runtime treated either path as an independent win.
      if (this.rules.objectives.length > 1) {
        this.rules.objectiveMode = "any";
      }
    }

    // Seed tagContact hazard if scene has hazard-tagged entities and no explicit tagContact
    const hasTagContact = this.rules.hazards.some((h) => h.type === "tagContact");
    if (!hasTagContact && tagSet.has("hazard")) {
      this.rules.hazards.push({
        id: "auto-hazard",
        type: "tagContact",
        tag: "hazard",
        onTrigger: this.rules.onFall === "respawn" ? "respawn" : "gameOver",
        cooldown: 0.45,
      });
    }
  }

  private initCollectTargets(entities: GameKitEntity[]): void {
    for (const obj of this.rules.objectives) {
      if (obj.type !== "collect") continue;
      const tag = typeof obj.tag === "string" ? obj.tag : "coin";
      const explicit = typeof obj.count === "number" ? obj.count : 0;
      if (explicit > 0) {
        this.state.collectTargets.set(tag, explicit);
        this.state.collectCounts.set(tag, 0);
        continue;
      }
      // count all tagged entities in scene
      let total = 0;
      for (const e of entities) {
        if (effectiveEntityTags(e).includes(tag)) total += 1;
      }
      this.state.collectTargets.set(tag, total);
      this.state.collectCounts.set(tag, 0);
    }
  }

  private tickSurvive(dt: number): void {
    const hasSurvive = this.rules.objectives.some((o) => o.type === "survive");
    if (!hasSurvive) return;
    this.state.surviveElapsed += dt;
    for (const obj of this.rules.objectives) {
      if (obj.type !== "survive") continue;
      const seconds = typeof obj.seconds === "number" ? obj.seconds : 0;
      if (seconds > 0 && this.state.surviveElapsed >= seconds) {
        this.state.completedObjectives.add(obj.id);
      }
    }
  }

  private evaluateFallHazard(): void {
    if (this.state.fallCooldown > 0) return;

    const fallHazards = this.rules.hazards.filter((h) => h.type === "fall");
    // If hazards list only has non-fall, still honor legacy fallDeathEnabled via synthesized hazard
    const active =
      fallHazards.length > 0
        ? fallHazards.filter((h) => h.enabled !== false)
        : this.rules.fallDeathEnabled !== false
          ? [{ id: "fall", type: "fall", onTrigger: this.rules.onFall }]
          : [];

    if (active.length === 0) return;

    const players = this.host.getPlayerTransforms();
    for (const player of players) {
      // Y increases downward
      if (player.position.y < this.fallY) continue;
      const hazard = active[0];
      this.fireHazard(hazard);
      break;
    }
  }

  private fireHazard(hazard: { id?: string; type: string; [k: string]: unknown }): void {
    const onTrigger =
      typeof hazard.onTrigger === "string"
        ? hazard.onTrigger
        : hazard.type === "fall"
          ? this.rules.onFall
          : "gameOver";

    if (onTrigger === "actions" && Array.isArray(hazard.actions)) {
      executeActions(hazard.actions as ScriptAction[], this.scriptContext("__hazard__"));
      return;
    }

    if (onTrigger === "respawn") {
      if (!this.state.unlimitedLives) {
        this.state.livesRemaining = Math.max(0, this.state.livesRemaining - 1);
        this.host.onLivesChange?.(this.state.livesRemaining);
      }
      if (!this.state.unlimitedLives && this.state.livesRemaining <= 0) {
        this.lose();
        return;
      }
      this.respawnAll();
      return;
    }

    // gameOver
    this.lose();
  }

  private checkObjectives(): void {
    if (this.state.outcome !== "playing") return;
    const objectives = this.rules.objectives;
    if (objectives.length === 0) return;

    // Refresh variable / collect completion flags
    for (const obj of objectives) {
      if (obj.type === "variable") {
        const key = typeof obj.key === "string" ? obj.key : "";
        const op = typeof obj.op === "string" ? obj.op : "eq";
        const raw = this.host.sceneManager?.getPersistentVar?.(key);
        if (compareVariable(raw, op, obj.value)) {
          this.state.completedObjectives.add(obj.id);
        }
      }
      if (obj.type === "collect") {
        const tag = typeof obj.tag === "string" ? obj.tag : "coin";
        const target = this.state.collectTargets.get(tag) ?? 0;
        const count = this.state.collectCounts.get(tag) ?? 0;
        if (target > 0 && count >= target) {
          this.state.completedObjectives.add(obj.id);
        }
      }
    }

    const mode = this.rules.objectiveMode ?? "all";
    const ids = objectives.map((o) => o.id);
    const done =
      mode === "any"
        ? ids.some((id) => this.state.completedObjectives.has(id))
        : ids.every((id) => this.state.completedObjectives.has(id));

    if (done) {
      this.win();
    }
  }

  private runOutcomeActions(kind: "win" | "lose"): void {
    const actions =
      kind === "win"
        ? this.rules.onWin.length > 0
          ? this.rules.onWin
          : ([{ type: "completeLevel" }] as ScriptAction[])
        : this.rules.onLose;

    if (actions.length > 0) {
      executeActions(actions, this.scriptContext("__rules__"));
    }

    // Level onComplete after win (in addition to completeLevel action)
    if (kind === "win" && this.level?.onComplete && this.level.onComplete.length > 0) {
      executeActions(this.level.onComplete, this.scriptContext("__level__"));
    }
  }
}

function compareVariable(raw: unknown, op: string, expected: unknown): boolean {
  switch (op) {
    case "truthy":
      return Boolean(raw);
    case "gte":
      return Number(raw) >= Number(expected);
    case "lte":
      return Number(raw) <= Number(expected);
    case "eq":
    default:
      return raw === expected || String(raw) === String(expected);
  }
}

/** Helper for hosts that only need resolved rules without an engine instance. */
export { resolveGameRules, mergeGameRules, resolveFallDeathY, effectiveEntityTags };
