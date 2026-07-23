import type {
  AabbColliderComponent,
  CircleColliderComponent,
  GameKitEntity,
  GameKitLevel,
  GameKitScene,
  PlayerControllerComponent,
  PolygonColliderComponent,
  RigidBodyComponent,
  ScriptComponent,
  StateMachineComponent,
  TransformComponent,
} from "@gamekit/schema";
import {
  applyAabbCollisions,
  applyCircleCollisions,
  applyPolygonCollisions,
  getEntityAabb,
  getEntityCircle,
  getEntityPolygon,
  updateTriggerEvents,
  type CollisionSolid,
  type TriggerState,
} from "./collision.js";
import { createPlayerController, type PlayerControllerInput } from "./player.js";
import { createRigidBody, RIGID_BODY_FIXED_DT } from "./rigid-body.js";
import { deepClone } from "./clone.js";
import { RulesEngine } from "./rules-engine.js";
import { evaluateScriptEvent, transitionFsm } from "./script.js";

export type SimulateOptions = {
  steps: number;
  /** Held for every step. Defaults to no input. */
  input?: Partial<PlayerControllerInput>;
  /** Per-step input overrides (index = step). */
  inputSequence?: Array<Partial<PlayerControllerInput>>;
  fixedDt?: number;
  /**
   * When true (default), evaluate game rules + trigger scripts each step
   * (fall death, collect/reach, tagContact, checkpoints).
   */
  runRules?: boolean;
  /** Optional level for rules merge / onComplete. */
  level?: GameKitLevel | null;
  /** Optional scene manager stubs for setVariable / completeLevel during sim. */
  sceneManager?: ConstructorParameters<typeof RulesEngine>[1]["sceneManager"];
};

export type SimulateResult = {
  scene: GameKitScene;
  steps: number;
  entitySummaries: Array<{
    id: string;
    name: string;
    position: { x: number; y: number };
    velocity?: { x: number; y: number };
  }>;
  /** Present when runRules was enabled. */
  rulesOutcome?: "playing" | "won" | "lost";
  rulesMessage?: string | null;
  livesRemaining?: number | null;
  collectProgress?: Record<string, number>;
};

/**
 * Headless fixed-timestep simulation for MCP agents and tests.
 * Clones the scene and advances PlayerController + RigidBody + collisions.
 * Optionally runs RulesEngine + trigger scripts.
 */
export function simulateSceneSteps(scene: GameKitScene, options: SimulateOptions): SimulateResult {
  const steps = Math.max(0, Math.min(Math.floor(options.steps), 600));
  const fixedDt = options.fixedDt ?? RIGID_BODY_FIXED_DT;
  const runRules = options.runRules !== false;
  const working: GameKitScene = deepClone(scene);

  const controllers = new Map<string, ReturnType<typeof createPlayerController>>();
  const bodies = new Map<string, ReturnType<typeof createRigidBody>>();
  let triggerState: TriggerState = new Set();
  const vars: Record<string, unknown> = {};

  for (const entity of working.entities) {
    const pc = entity.components.find((c): c is PlayerControllerComponent => c.type === "PlayerController");
    if (pc) controllers.set(entity.id, createPlayerController(pc));
    const rb = entity.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
    if (rb) bodies.set(entity.id, createRigidBody(rb));
  }

  const sceneManager = options.sceneManager ?? {
    switchScene: () => false,
    setPersistentVar: (key: string, value: unknown) => {
      vars[key] = value;
    },
    getPersistentVar: (key: string, defaultValue?: unknown) => vars[key] ?? defaultValue,
    completeLevel: () => null,
    getState: () => ({ currentLevelId: options.level?.id ?? null }),
  };

  let engine: RulesEngine | null = null;
  if (runRules) {
    engine = new RulesEngine(
      working,
      {
        getEntities: () => working.entities,
        destroyEntity: (id) => {
          working.entities = working.entities.filter((e) => e.id !== id);
          controllers.delete(id);
          bodies.delete(id);
        },
        getPlayerTransforms: () =>
          working.entities
            .filter((e) => e.components.some((c) => c.type === "PlayerController"))
            .map((e) => {
              const t = e.components.find((c): c is TransformComponent => c.type === "Transform");
              return t ? { entityId: e.id, position: { ...t.position } } : null;
            })
            .filter((p): p is { entityId: string; position: { x: number; y: number } } => p !== null),
        setPlayerPosition: (entityId, position) => {
          const entity = working.entities.find((e) => e.id === entityId);
          const t = entity?.components.find((c): c is TransformComponent => c.type === "Transform");
          if (t) Object.assign(t.position, position);
        },
        resetPlayerMotion: (entityId) => {
          const c = controllers.get(entityId);
          if (c) {
            c.state.velocity = { x: 0, y: 0 };
            c.setGrounded(false);
          }
          const b = bodies.get(entityId);
          if (b) b.state.velocity = { x: 0, y: 0 };
        },
        sceneManager,
      },
      { level: options.level ?? null },
    );
    engine.start();
  }

  for (let step = 0; step < steps; step++) {
    if (engine && engine.getState().outcome !== "playing") break;

    const partial = options.inputSequence?.[step] ?? options.input ?? {};
    const input: PlayerControllerInput = {
      left: partial.left ?? false,
      right: partial.right ?? false,
      jump: partial.jump ?? false,
    };

    const solids: CollisionSolid[] = [];
    for (const entity of working.entities) {
      const aabbCollider = entity.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
      if (aabbCollider && aabbCollider.isStatic && !aabbCollider.isTrigger) {
        const aabb = getEntityAabb(entity);
        if (aabb) solids.push({ ...aabb, layer: aabbCollider.layer ?? 1, entityId: entity.id });
      }
      const circleCollider = entity.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
      if (circleCollider && circleCollider.isStatic && !circleCollider.isTrigger) {
        const circle = getEntityCircle(entity);
        if (circle) solids.push({ ...circle, layer: circleCollider.layer ?? 1, entityId: entity.id });
      }
      const polygonCollider = entity.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");
      if (polygonCollider && polygonCollider.isStatic && !polygonCollider.isTrigger) {
        const polygon = getEntityPolygon(entity);
        if (polygon) solids.push({ ...polygon, layer: polygonCollider.layer ?? 1, entityId: entity.id });
      }
    }

    for (const entity of working.entities) {
      const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
      if (!transform) continue;

      const body = bodies.get(entity.id);
      const controller = controllers.get(entity.id);

      if (body) {
        if (controller) {
          controller.update(input, fixedDt);
          body.state.velocity.x = controller.state.velocity.x;
          body.state.velocity.y = controller.state.velocity.y;
          controller.state.velocity = body.state.velocity;
          controller.setGrounded(false);
        }
        body.integrateForces(fixedDt, working.gravity || { x: 0, y: 9.8 * 60 });

        const aabbCollider = entity.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
        const circleCollider = entity.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
        const polygonCollider = entity.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

        if (aabbCollider && !aabbCollider.isStatic) {
          const movingAabb = getEntityAabb(entity);
          if (movingAabb) {
            const disp = {
              x: body.state.velocity.x * fixedDt,
              y: body.state.velocity.y * fixedDt,
            };
            const result = applyAabbCollisions(movingAabb, disp, solids, aabbCollider.mask);
            transform.position.x = result.position.x - aabbCollider.offset.x;
            transform.position.y = result.position.y - aabbCollider.offset.y;
            body.state.velocity = {
              x: result.velocity.x / fixedDt,
              y: result.velocity.y / fixedDt,
            };
            if (controller && result.grounded) controller.setGrounded(true);
          }
        } else if (circleCollider && !circleCollider.isStatic) {
          const circle = getEntityCircle(entity);
          if (circle) {
            const result = applyCircleCollisions(circle, body.state.velocity, solids, circleCollider.mask);
            transform.position.x = result.position.x - circleCollider.offset.x;
            transform.position.y = result.position.y - circleCollider.offset.y;
            body.state.velocity = result.velocity;
            if (controller && result.grounded) controller.setGrounded(true);
          }
        } else if (polygonCollider && !polygonCollider.isStatic) {
          const polygon = getEntityPolygon(entity);
          if (polygon) {
            const result = applyPolygonCollisions(polygon, body.state.velocity, solids, polygonCollider.mask);
            transform.position.x = result.position.x - polygonCollider.offset.x;
            transform.position.y = result.position.y - polygonCollider.offset.y;
            body.state.velocity = result.velocity;
            if (controller && result.grounded) controller.setGrounded(true);
          }
        } else {
          transform.position.x += body.state.velocity.x * fixedDt;
          transform.position.y += body.state.velocity.y * fixedDt;
        }

        const rbComp = entity.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
        if (rbComp) rbComp.velocity = { ...body.state.velocity };
        if (controller) controller.state.velocity = body.state.velocity;
      } else if (controller) {
        controller.update(input, fixedDt);
        const collider = entity.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
        if (collider) {
          const movingAabb = getEntityAabb(entity);
          if (movingAabb) {
            const result = applyAabbCollisions(movingAabb, controller.state.velocity, solids, collider.mask);
            transform.position.x = result.position.x - collider.offset.x;
            transform.position.y = result.position.y - collider.offset.y;
            controller.state.velocity = result.velocity;
            controller.setGrounded(result.grounded);
          }
        } else {
          transform.position.x += controller.state.velocity.x * fixedDt;
          transform.position.y += controller.state.velocity.y * fixedDt;
        }
      }
    }

    if (runRules) {
      const triggerUpdate = updateTriggerEvents(working.entities, triggerState);
      triggerState = triggerUpdate.active;
      for (const event of triggerUpdate.events) {
        if (event.type !== "enter") continue;
        engine?.handleTriggerEnter(event.triggerEntityId, event.otherEntityId);

        for (const entityId of [event.triggerEntityId, event.otherEntityId]) {
          const entity = working.entities.find((e) => e.id === entityId);
          if (!entity) continue;
          const context =
            engine?.scriptContext(entity.id, {
              sceneManager,
              rigidBodies: bodies,
              destroyEntity: (id) => {
                working.entities = working.entities.filter((e) => e.id !== id);
              },
            }) ?? {
              entityId: entity.id,
              entities: working.entities,
              sceneManager,
              rigidBodies: bodies,
            };

          const sm = entity.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
          if (sm) {
            if (!sm.currentState) sm.currentState = sm.initialState;
            const stateObj = sm.states.find((s) => s.name === sm.currentState);
            if (stateObj?.on?.["triggerEnter"]) {
              transitionFsm(sm, stateObj.on["triggerEnter"], context);
            }
          }
          const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
          if (script) {
            evaluateScriptEvent("onTriggerEnter", script, context);
            evaluateScriptEvent("triggerEnter", script, context);
          }
        }
      }
      engine?.update(fixedDt);
    }
  }

  const entitySummaries = working.entities.map((entity: GameKitEntity) => {
    const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
    const controller = controllers.get(entity.id);
    const body = bodies.get(entity.id);
    return {
      id: entity.id,
      name: entity.name,
      position: transform ? { ...transform.position } : { x: 0, y: 0 },
      velocity: body
        ? { ...body.state.velocity }
        : controller
          ? { ...controller.state.velocity }
          : undefined,
    };
  });

  const rulesState = engine?.getState();
  return {
    scene: working,
    steps,
    entitySummaries,
    ...(runRules
      ? {
          rulesOutcome: rulesState?.outcome ?? "playing",
          rulesMessage: rulesState?.message ?? null,
          livesRemaining: rulesState
            ? rulesState.unlimitedLives
              ? null
              : rulesState.livesRemaining
            : null,
          collectProgress: rulesState
            ? Object.fromEntries(rulesState.collectCounts.entries())
            : {},
        }
      : {}),
  };
}
