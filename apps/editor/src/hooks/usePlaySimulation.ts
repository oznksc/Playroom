import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GameKitScene,
  GameKitLevel,
  GameKitEntity,
  TransformComponent,
  PlayerControllerComponent,
  CameraFollowComponent,
  AnimationComponent,
  AabbColliderComponent,
  CircleColliderComponent,
  PolygonColliderComponent,
  RigidBodyComponent,
  Vector2,
  TweenComponent,
  FollowPathComponent,
  ScriptComponent,
  StateMachineComponent,
} from "@gamekit/schema";
import {
  GameKitSceneSchema,
  createEmptyScene,
  resolveGameRules,
  parseScene,
  findLevelForScene,
  DEFAULT_INPUT_MAP,
} from "@gamekit/schema";
import { getApiUrl } from "../lib/api.js";
import { resetPlaySession } from "../lib/play-session.js";
import { createPlayPhysicsState } from "../lib/play-physics-state.js";
import { initializePlayCamera } from "../lib/play-camera.js";
import {
  displacementFromVelocity,
  velocityFromDisplacement,
  computeSceneWorldBounds,
  clampPlayCamera,
} from "../lib/physics.js";
import { EMPTY_PROFILER_SAMPLE, type PlayProfilerSample } from "../lib/play-profiler.js";
import type { ProjectSnapshot } from "../types.js";
import type { ConsoleLog } from "../components/ConsolePanel.js";

// GameKit Runtime physics & logic imports
import { createPlayerController } from "@gamekit/runtime/player";
import { createRigidBody } from "@gamekit/runtime/rigid-body";
import {
  applyAabbCollisions,
  applyCircleCollisions,
  applyPolygonCollisions,
  getEntityAabb,
  getEntityCircle,
  getEntityPolygon,
  updateCollisionEvents,
  updateTriggerEvents,
} from "@gamekit/runtime/collision";
import type {
  CollisionEvent,
  TriggerState,
  CollisionState,
  CollisionSolid,
} from "@gamekit/runtime/collision";
import { updateAnimation } from "@gamekit/runtime/animate";
import { playTimeline, type TimelineState } from "@gamekit/runtime/timeline";
import { createAudioController, type AudioController } from "@gamekit/runtime/audio";
import {
  resolveActionKeys,
  extendedInputFromPressedKeys,
  mergeGamepadIntoInput,
} from "@gamekit/runtime/input-map";
import { SceneManager, InMemoryStorage } from "@gamekit/runtime/manager";
import { pollGamepad } from "@gamekit/runtime/gamepad";
import { updateTween } from "@gamekit/runtime/tween";
import { updateFollowPath } from "@gamekit/runtime/path";
import { evaluateScriptEvent, transitionFsm } from "@gamekit/runtime/script";
import { RulesEngine } from "@gamekit/runtime/rules-engine";
import { loadScene } from "@gamekit/runtime/scene";
import { createCameraFollow } from "@gamekit/runtime/camera";

export const USE_PHASER_PLAY_HOST = true;

export interface PlayOutcomeState {
  kind: "gameOver" | "win";
  message: string;
  livesLeft?: number;
}

export interface UsePlaySimulationOptions {
  scene: GameKitScene | undefined;
  snapshot: ProjectSnapshot;
  currentSceneFile: string;
  pressedKeysRef: React.MutableRefObject<Set<string>>;
  resetScene: (next?: GameKitScene) => void;
  setScene: (scene: GameKitScene) => void;
  undoBypassRef: React.MutableRefObject<boolean>;
  addConsoleLog: (type: ConsoleLog["type"], message: string) => void;
  syncPlayLevelUnlocksFromManager: () => void;
  normalizeSceneFile: (id: string) => string;
  sceneFileMatches: (a: string, b: string) => boolean;
}

export function usePlaySimulation({
  scene,
  snapshot,
  currentSceneFile,
  pressedKeysRef,
  resetScene,
  setScene,
  undoBypassRef,
  addConsoleLog,
  syncPlayLevelUnlocksFromManager,
  normalizeSceneFile,
  sceneFileMatches,
}: UsePlaySimulationOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playFps, setPlayFps] = useState(0);
  const [playFrameMs, setPlayFrameMs] = useState(0);
  const [playDrawCalls, setPlayDrawCalls] = useState(0);
  const [profilerSample, setProfilerSample] = useState<PlayProfilerSample>(EMPTY_PROFILER_SAMPLE);
  const [profilerOpen, setProfilerOpen] = useState(false);

  const [playViewPan, setPlayViewPan] = useState<{ x: number; y: number } | null>(null);
  const [playOutcome, setPlayOutcome] = useState<PlayOutcomeState | null>(null);
  const [playLives, setPlayLives] = useState<number | null>(null);
  const [playHostScene, setPlayHostScene] = useState<GameKitScene | null>(null);
  const [playHostKey, setPlayHostKey] = useState(0);

  const preSimulationSceneRef = useRef<GameKitScene | undefined>(undefined);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // GameKit physics loop refs
  const controllersRef = useRef<Map<string, ReturnType<typeof createPlayerController>>>(new Map());
  const rigidBodyRefs = useRef<Map<string, ReturnType<typeof createRigidBody>>>(new Map());
  const animationStatesRef = useRef<Map<string, { currentFrame: number; elapsed: number }>>(new Map());
  const timelineRef = useRef<TimelineState>({ elapsed: 0, playing: false });
  const triggerStateRef = useRef<TriggerState>(new Set());
  const collisionStateRef = useRef<CollisionState>(new Set());
  const audioControllerRef = useRef<AudioController | null>(null);
  const cameraFollowRef = useRef<ReturnType<typeof createCameraFollow> | null>(null);
  const playViewPanRef = useRef<{ x: number; y: number } | null>(null);
  const playSpawnRef = useRef<Vector2>({ x: 80, y: 300 });
  const playLivesRef = useRef(3);
  const playOutcomeRef = useRef<"none" | "gameOver" | "win">("none");
  const fallCooldownRef = useRef(0);
  const rulesEngineRef = useRef<RulesEngine | null>(null);
  const playEntitiesRef = useRef<GameKitEntity[]>([]);
  const playVarsRef = useRef<Record<string, unknown>>({});
  const playSceneManagerRef = useRef<SceneManager | null>(null);
  const playUnlockedLevelIdsRef = useRef<string[]>([]);
  const playScenesCacheRef = useRef<Map<string, GameKitScene>>(new Map());
  const playHotSwapRef = useRef<(sceneId: string) => boolean>(() => false);

  const virtualTouchControls = useMemo(() => {
    const map = scene?.inputMap?.bindings?.length ? scene.inputMap : DEFAULT_INPUT_MAP;
    const set = new Set<"jump" | "fire" | "action">();
    for (const b of map.bindings) {
      if (b.touchControl === "jump" || b.touchControl === "fire" || b.touchControl === "action") {
        set.add(b.touchControl);
      }
    }
    if (set.size === 0) set.add("jump");
    return [...set];
  }, [scene?.inputMap]);

  const playAssetUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    for (const asset of snapshot.assets) {
      urls[asset.id] = getApiUrl(`/gamekit/assets/${asset.file}`);
    }
    return urls;
  }, [snapshot.assets]);

  const playHostLevel = useMemo(() => {
    if (!playHostScene) return null;
    return (
      findLevelForScene(snapshot.levels, playHostScene.id) ??
      findLevelForScene(snapshot.levels, `${playHostScene.id}.scene.json`) ??
      null
    );
  }, [playHostScene, snapshot.levels]);

  // Legacy canvas physics loop (kept as fallback when Phaser host is disabled)
  useEffect(() => {
    if (USE_PHASER_PLAY_HOST) return;
    if (!isPlaying || isPaused) return;

    let frameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedDt = 1 / 60;
    const maxSteps = 10;
    let fpsFrames = 0;
    let fpsWindowStart = performance.now();

    const tick = (timestamp: number) => {
      const frameDt = Math.min((timestamp - lastTime) / 1000, 0.25);
      lastTime = timestamp;
      setPlayFrameMs(Math.round(frameDt * 1000 * 10) / 10);
      fpsFrames += 1;
      if (timestamp - fpsWindowStart >= 500) {
        const fps = Math.round((fpsFrames * 1000) / (timestamp - fpsWindowStart));
        setPlayFps(fps);
        fpsFrames = 0;
        fpsWindowStart = timestamp;
      }

      // Freeze simulation when the run has ended
      if (playOutcomeRef.current !== "none") {
        frameId = requestAnimationFrame(tick);
        return;
      }

      accumulator += frameDt;

      let steps = 0;
      if (!sceneRef.current) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      let workingScene: GameKitScene = sceneRef.current;

      const baseInput = extendedInputFromPressedKeys(
        pressedKeysRef.current,
        sceneRef.current?.inputMap,
      );
      const input = mergeGamepadIntoInput(
        baseInput,
        sceneRef.current?.inputMap,
        pollGamepad(),
      );

      let changed = false;

      while (accumulator >= fixedDt && steps < maxSteps) {
        const dt = fixedDt;
        const solids: CollisionSolid[] = [];
        const collisionContacts: CollisionEvent[] = [];

        // 1. Gather all static non-trigger colliders
        for (const entity of workingScene.entities) {
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

        // 2. Map and update entities
        const nextEntities: GameKitEntity[] = workingScene.entities.map((entity) => {
          const ent = structuredClone(entity);
          const transform = ent.components.find((c): c is TransformComponent => c.type === "Transform");
          if (!transform) return ent;

          const rb = rigidBodyRefs.current.get(ent.id);
          const controller = controllersRef.current.get(ent.id);

          if (rb) {
            if (controller && (input.left || input.right || input.jump)) rb.wake();
            if (rb.state.sleeping) return ent;

            if (controller) {
              controller.update(input, dt);
              rb.state.velocity.x = controller.state.velocity.x;
              rb.state.velocity.y = controller.state.velocity.y;
              controller.state.velocity = rb.state.velocity;
              controller.setGrounded(false);
            }

            rb.integrateForces(dt, workingScene.gravity || { x: 0, y: 9.8 * 60 });

            transform.rotation = (transform.rotation ?? 0) + rb.state.angularVelocity * dt;

            const aabbCollider = ent.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
            const circleCollider = ent.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
            const polygonCollider = ent.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

            if (aabbCollider) {
              const movingAabb = getEntityAabb(ent);
              if (movingAabb) {
                const mask = aabbCollider.mask;
                const disp = displacementFromVelocity(rb.state.velocity, dt);
                const result = applyAabbCollisions(movingAabb, disp, solids, mask);
                transform.position.x = result.position.x - aabbCollider.offset.x;
                transform.position.y = result.position.y - aabbCollider.offset.y;
                rb.state.velocity = velocityFromDisplacement(result.velocity, dt);
                rb.updateSleep(dt, result.grounded);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                if (controller && result.grounded) {
                  controller.setGrounded(true);
                }
              }
            } else if (circleCollider) {
              const circle = getEntityCircle(ent);
              if (circle) {
                const mask = circleCollider.mask;
                const disp = displacementFromVelocity(rb.state.velocity, dt);
                const result = applyCircleCollisions(circle, disp, solids, mask);
                transform.position.x = result.position.x - circleCollider.offset.x;
                transform.position.y = result.position.y - circleCollider.offset.y;
                rb.state.velocity = velocityFromDisplacement(result.velocity, dt);
                rb.updateSleep(dt, result.grounded);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                if (controller && result.grounded) {
                  controller.setGrounded(true);
                }
              }
            } else if (polygonCollider) {
              const polygon = getEntityPolygon(ent);
              if (polygon) {
                const disp = displacementFromVelocity(rb.state.velocity, dt);
                const result = applyPolygonCollisions(polygon, disp, solids, polygonCollider.mask);
                transform.position.x = result.position.x - polygonCollider.offset.x;
                transform.position.y = result.position.y - polygonCollider.offset.y;
                rb.state.velocity = velocityFromDisplacement(result.velocity, dt);
                rb.updateSleep(dt, result.grounded);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                if (controller && result.grounded) {
                  controller.setGrounded(true);
                }
              }
            } else {
              transform.position.x += rb.state.velocity.x * dt;
              transform.position.y += rb.state.velocity.y * dt;
              rb.updateSleep(dt, false);
            }

            // Sync RigidBody state back to component
            const rbComp = ent.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
            if (rbComp) {
              rbComp.velocity = { ...rb.state.velocity };
              rbComp.angularVelocity = rb.state.angularVelocity;
            }
          } else if (controller) {
            controller.update(input, dt);

            const collider = ent.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
            const circleCollider = ent.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
            const polygonCollider = ent.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

            if (collider) {
              const movingAabb = getEntityAabb(ent);
              if (movingAabb) {
                const disp = displacementFromVelocity(controller.state.velocity, dt);
                const result = applyAabbCollisions(movingAabb, disp, solids, collider.mask);
                transform.position.x = result.position.x - collider.offset.x;
                transform.position.y = result.position.y - collider.offset.y;
                controller.state.velocity = velocityFromDisplacement(result.velocity, dt);
                // Keep horizontal intent from controller next frame; restore speed magnitude when grounded air-control
                if (input.left || input.right) {
                  const dir = Number(input.right) - Number(input.left);
                  const pc = ent.components.find((c): c is PlayerControllerComponent => c.type === "PlayerController");
                  if (pc) controller.state.velocity.x = dir * pc.speed;
                }
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else if (circleCollider) {
              const circle = getEntityCircle(ent);
              if (circle) {
                const disp = displacementFromVelocity(controller.state.velocity, dt);
                const result = applyCircleCollisions(circle, disp, solids, circleCollider.mask);
                transform.position.x = result.position.x - circleCollider.offset.x;
                transform.position.y = result.position.y - circleCollider.offset.y;
                controller.state.velocity = velocityFromDisplacement(result.velocity, dt);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else if (polygonCollider) {
              const polygon = getEntityPolygon(ent);
              if (polygon) {
                const disp = displacementFromVelocity(controller.state.velocity, dt);
                const result = applyPolygonCollisions(polygon, disp, solids, polygonCollider.mask);
                transform.position.x = result.position.x - polygonCollider.offset.x;
                transform.position.y = result.position.y - polygonCollider.offset.y;
                controller.state.velocity = velocityFromDisplacement(result.velocity, dt);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else {
              transform.position.x += controller.state.velocity.x * dt;
              transform.position.y += controller.state.velocity.y * dt;
            }
          }

          // Tweens + FollowPath (parity with mobile/web runtimes)
          const tweens = ent.components.filter((c): c is TweenComponent => c.type === "Tween");
          for (const tween of tweens) {
            updateTween(tween, transform, dt);
          }
          const followPath = ent.components.find((c): c is FollowPathComponent => c.type === "FollowPath");
          if (followPath) {
            updateFollowPath(followPath, transform, dt);
          }

          // Dynamic animations
          const anim = ent.components.find((c): c is AnimationComponent => c.type === "Animation");
          if (anim) {
            let animState = animationStatesRef.current.get(ent.id);
            if (!animState) {
              animState = { currentFrame: anim.currentFrame ?? 0, elapsed: 0 };
              animationStatesRef.current.set(ent.id, animState);
            }
            anim.currentFrame = updateAnimation(anim, animState, dt);
          }

          // Script & StateMachine tick
          const script = ent.components.find((c): c is ScriptComponent => c.type === "Script");
          const sm = ent.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
          if (script || sm) {
            const context =
              rulesEngineRef.current?.scriptContext(ent.id, {
                rigidBodies: rigidBodyRefs.current,
                playSound: (assetId: string) => audioControllerRef.current?.playAsset?.(assetId),
                destroyEntity: (id: string) => {
                  const idx = workingScene.entities.findIndex((e) => e.id === id);
                  if (idx >= 0) workingScene.entities.splice(idx, 1);
                },
              }) ?? {
                entityId: ent.id,
                entities: workingScene.entities,
                rigidBodies: rigidBodyRefs.current,
                playSound: (assetId: string) => audioControllerRef.current?.playAsset?.(assetId),
                destroyEntity: (id: string) => {
                  const idx = workingScene.entities.findIndex((e) => e.id === id);
                  if (idx >= 0) workingScene.entities.splice(idx, 1);
                },
              };

            if (sm) {
              if (!sm.currentState) sm.currentState = sm.initialState;
              const stateObj = sm.states.find((s) => s.name === sm.currentState);
              if (stateObj?.on?.["update"]) {
                transitionFsm(sm, stateObj.on["update"], context);
              }
            }

            if (script) {
              evaluateScriptEvent("onUpdate", script, context);
              evaluateScriptEvent("update", script, context);
            }
          }

          return ent;
        });

        // 3. Trigger events update
        const triggerUpdate = updateTriggerEvents(nextEntities, triggerStateRef.current);
        triggerStateRef.current = triggerUpdate.active;
        for (const event of triggerUpdate.events) {
          addConsoleLog("physics", `Trigger ${event.type}: ${event.triggerEntityId} with ${event.otherEntityId}`);
          if (event.type === "enter") {
            rulesEngineRef.current?.handleTriggerEnter(event.triggerEntityId, event.otherEntityId);
            for (const entityId of [event.triggerEntityId, event.otherEntityId]) {
              const entity = nextEntities.find((e) => e.id === entityId);
              if (!entity) continue;
              const context =
                rulesEngineRef.current?.scriptContext(entity.id, {
                  rigidBodies: rigidBodyRefs.current,
                  playSound: (assetId: string) => audioControllerRef.current?.playAsset?.(assetId),
                  destroyEntity: (id: string) => {
                    const idx = nextEntities.findIndex((e) => e.id === id);
                    if (idx >= 0) nextEntities.splice(idx, 1);
                  },
                }) ?? {
                  entityId: entity.id,
                  entities: nextEntities,
                  rigidBodies: rigidBodyRefs.current,
                  playSound: (assetId: string) => audioControllerRef.current?.playAsset?.(assetId),
                  destroyEntity: (id: string) => {
                    const idx = nextEntities.findIndex((e) => e.id === id);
                    if (idx >= 0) nextEntities.splice(idx, 1);
                  },
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
        }

        // Collision enter/exit
        const collisionUpdate = updateCollisionEvents(collisionContacts, collisionStateRef.current);
        collisionStateRef.current = collisionUpdate.active;
        for (const event of collisionUpdate.events) {
          addConsoleLog("physics", `Collision contact: ${event.entityId} with ${event.otherEntityId}`);
        }

        workingScene = { ...workingScene, entities: nextEntities };
        playTimeline(workingScene, timelineRef.current, dt);

        // Side-scroller camera: follow CameraFollow target (or first player)
        let followTargetId: string | undefined;
        let followSmoothing = 0.2;
        for (const entity of nextEntities) {
          const cf = entity.components.find((c): c is CameraFollowComponent => c.type === "CameraFollow");
          if (cf) {
            followTargetId = cf.targetId || entity.id;
            followSmoothing = cf.smoothing > 0 ? cf.smoothing : 0.2;
            break;
          }
        }
        if (!followTargetId) {
          const playerEnt = nextEntities.find((e) =>
            e.components.some((c) => c.type === "PlayerController"),
          );
          followTargetId = playerEnt?.id;
        }
        if (followTargetId) {
          const target = nextEntities.find((e) => e.id === followTargetId);
          const targetTransform = target?.components.find(
            (c): c is TransformComponent => c.type === "Transform",
          );
          if (targetTransform) {
            if (!cameraFollowRef.current) {
              const initX = targetTransform.position.x - workingScene.viewport.width / 2;
              const initY = targetTransform.position.y - workingScene.viewport.height / 2;
              cameraFollowRef.current = createCameraFollow({
                viewport: {
                  x: workingScene.viewport.width,
                  y: workingScene.viewport.height,
                },
                smoothing: Math.min(1, Math.max(0.18, followSmoothing)),
                initial: {
                  position: { x: initX, y: initY },
                  zoom: 1,
                },
              });
            }
            const camState = cameraFollowRef.current.update(targetTransform.position);
            const world = computeSceneWorldBounds(workingScene);
            const clamped = clampPlayCamera(camState.position, workingScene, world);
            cameraFollowRef.current.state.position = clamped;
            playViewPanRef.current = clamped;
          }
        }

        // Programmable game rules (fall hazards, objectives, win/lose)
        playEntitiesRef.current = nextEntities;
        rulesEngineRef.current?.update(dt);
        const rulesState = rulesEngineRef.current?.getState();
        if (rulesState) {
          fallCooldownRef.current = rulesState.fallCooldown;
          if (!rulesState.unlimitedLives) {
            playLivesRef.current = rulesState.livesRemaining;
          }
        }

        accumulator -= fixedDt;
        steps++;
        changed = true;
      }

      if (steps >= maxSteps) {
        accumulator = 0;
      }

      if (changed && workingScene) {
        setScene(workingScene);
        if (playViewPanRef.current) {
          setPlayViewPan({ ...playViewPanRef.current });
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, isPaused, setScene, addConsoleLog]);

  const applyPlaySceneRuntime = useCallback((nextScene: GameKitScene, manager: SceneManager | null) => {
    playEntitiesRef.current = structuredClone(nextScene.entities);
    animationStatesRef.current.clear();
    triggerStateRef.current.clear();
    collisionStateRef.current.clear();
    timelineRef.current = { elapsed: 0, playing: nextScene.timeline?.playing ?? true };
    playOutcomeRef.current = "none";
    setPlayOutcome(null);
    fallCooldownRef.current = 0;

    const currentLevel =
      findLevelForScene(snapshot.levels, nextScene.id) ??
      findLevelForScene(snapshot.levels, `${nextScene.id}.scene.json`);
    const rules = resolveGameRules(nextScene.gameRules);
    playLivesRef.current = rules.lives > 0 ? rules.lives : 0;
    setPlayLives(rules.lives > 0 ? rules.lives : null);

    const physicsState = createPlayPhysicsState(nextScene);
    controllersRef.current = physicsState.controllers;
    rigidBodyRefs.current = physicsState.rigidBodies;

    const cameraState = initializePlayCamera(nextScene, rules);
    if (cameraState.spawnPoint) playSpawnRef.current = cameraState.spawnPoint;
    cameraFollowRef.current = cameraState.cameraFollow;
    playViewPanRef.current = cameraState.pan;
    setPlayViewPan(cameraState.pan);

    const bindManagerApi = () => ({
      switchScene: (sceneId: string) => playHotSwapRef.current(sceneId),
      nextScene: () => {
        const ok = manager?.nextScene() ?? false;
        if (ok && manager) {
          const id = manager.getState().currentSceneId;
          if (id) playHotSwapRef.current(id);
        }
        return ok;
      },
      nextLevel: () => {
        const ok = manager?.nextLevel() ?? false;
        if (ok) {
          syncPlayLevelUnlocksFromManager();
          const id = manager?.getState().currentSceneId;
          if (id) playHotSwapRef.current(id);
        }
        return ok;
      },
      unlockLevel: (levelId: string) => {
        const ok = manager?.unlockLevel(levelId) ?? false;
        if (ok) syncPlayLevelUnlocksFromManager();
        return ok;
      },
      completeLevel: (levelId: string) => {
        const unlocked = manager?.completeLevel(levelId) ?? null;
        if (unlocked) {
          addConsoleLog("system", `completeLevel("${levelId}") → unlocked "${unlocked}"`);
          syncPlayLevelUnlocksFromManager();
        } else {
          addConsoleLog("system", `completeLevel("${levelId}") — no next level to unlock`);
        }
        return unlocked;
      },
      getState: () => ({ currentLevelId: manager?.getState().currentLevelId ?? null }),
      setPersistentVar: (key: string, value: unknown) => {
        manager?.setPersistentVar(key, value);
        playVarsRef.current[key] = value;
      },
      getPersistentVar: (key: string, defaultValue?: unknown) =>
        manager?.getPersistentVar(key, defaultValue) ?? playVarsRef.current[key] ?? defaultValue,
    });

    rulesEngineRef.current = new RulesEngine(nextScene, {
      getEntities: () => playEntitiesRef.current,
      destroyEntity: (id) => {
        const idx = playEntitiesRef.current.findIndex((e) => e.id === id);
        if (idx >= 0) playEntitiesRef.current.splice(idx, 1);
      },
      getPlayerTransforms: () =>
        playEntitiesRef.current
          .filter((e) => e.components.some((c) => c.type === "PlayerController"))
          .map((e) => {
            const t = e.components.find((c): c is TransformComponent => c.type === "Transform");
            return t ? { entityId: e.id, position: { ...t.position } } : null;
          })
          .filter((p): p is { entityId: string; position: Vector2 } => p !== null),
      setPlayerPosition: (entityId, position) => {
        const entity = playEntitiesRef.current.find((e) => e.id === entityId);
        const t = entity?.components.find((c): c is TransformComponent => c.type === "Transform");
        if (t) {
          t.position.x = position.x;
          t.position.y = position.y;
        }
      },
      resetPlayerMotion: (entityId) => {
        const controller = controllersRef.current.get(entityId);
        if (controller) {
          controller.state.velocity = { x: 0, y: 0 };
          controller.setGrounded(false);
        }
        const rb = rigidBodyRefs.current.get(entityId);
        if (rb) rb.state.velocity = { x: 0, y: 0 };
        const entity = playEntitiesRef.current.find((e) => e.id === entityId);
        const rbComp = entity?.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
        if (rbComp) rbComp.velocity = { x: 0, y: 0 };
      },
      sceneManager: bindManagerApi(),
      playSound: (assetId) => audioControllerRef.current?.playAsset?.(assetId),
      onOutcome: (kind, message) => {
        if (kind === "won") {
          playOutcomeRef.current = "win";
          setPlayOutcome({ kind: "win", message, livesLeft: playLivesRef.current });
          setIsPaused(true);
          addConsoleLog("system", `WIN — ${message}`);
          syncPlayLevelUnlocksFromManager();
        } else {
          playOutcomeRef.current = "gameOver";
          setPlayOutcome({ kind: "gameOver", message, livesLeft: playLivesRef.current });
          setIsPaused(true);
          addConsoleLog("system", `GAME OVER — ${message}`);
        }
      },
      onLivesChange: (lives) => {
        if (lives === null) {
          setPlayLives(null);
        } else {
          playLivesRef.current = lives;
          setPlayLives(lives);
        }
      },
      onCollectProgress: (tag, collected, target) => {
        addConsoleLog("system", `Collect ${tag}: ${collected}/${target}`);
      },
    }, {
      level: currentLevel
        ? {
            ...currentLevel,
            sceneIds: currentLevel.sceneIds.map((s) => normalizeSceneFile(s)),
          }
        : null,
      initialSpawn: cameraState.spawnPoint,
    });
    rulesEngineRef.current.start();

    audioControllerRef.current?.dispose();
    audioControllerRef.current = createAudioController(nextScene.entities ?? [], (assetId) => {
      const asset = snapshot.assets.find((a) => a.id === assetId);
      if (!asset) return undefined;
      return getApiUrl(`/gamekit/assets/${asset.file}`);
    });

    undoBypassRef.current = true;
    setScene(GameKitSceneSchema.parse(structuredClone(nextScene)));
    undoBypassRef.current = false;
  }, [snapshot.levels, snapshot.assets, syncPlayLevelUnlocksFromManager, addConsoleLog, normalizeSceneFile, undoBypassRef, setScene]);

  const handlePlayToggle = useCallback(async () => {
    if (!isPlaying) {
      if (!scene) return;
      preSimulationSceneRef.current = GameKitSceneSchema.parse(structuredClone(scene));

      controllersRef.current.clear();
      rigidBodyRefs.current.clear();
      animationStatesRef.current.clear();
      timelineRef.current = { elapsed: 0, playing: scene?.timeline?.playing ?? true };
      triggerStateRef.current.clear();
      collisionStateRef.current.clear();
      cameraFollowRef.current = null;
      playViewPanRef.current = null;
      setPlayViewPan(null);
      playOutcomeRef.current = "none";
      setPlayOutcome(null);
      fallCooldownRef.current = 0;
      playVarsRef.current = {};
      rulesEngineRef.current = null;
      playSceneManagerRef.current = null;
      playEntitiesRef.current = structuredClone(scene.entities);

      const sceneMap: Record<string, ReturnType<typeof loadScene>> = {};
      playScenesCacheRef.current = new Map();
      const indexScene = (fileKey: string, data: GameKitScene) => {
        const key = normalizeSceneFile(fileKey);
        const bare = key.replace(/\.scene\.json$/i, "");
        const loaded = loadScene(data);
        playScenesCacheRef.current.set(key, data);
        playScenesCacheRef.current.set(bare, data);
        playScenesCacheRef.current.set(data.id, data);
        sceneMap[key] = loaded;
        sceneMap[bare] = loaded;
        sceneMap[data.id] = loaded;
      };
      indexScene(currentSceneFile, scene);

      await Promise.all(
        snapshot.scenes.map(async (file) => {
          const key = normalizeSceneFile(file);
          if (sceneFileMatches(key, currentSceneFile)) return;
          try {
            const res = await fetch(getApiUrl(`/api/scene?file=${encodeURIComponent(key)}`));
            if (!res.ok) return;
            const parsed = parseScene(await res.json());
            indexScene(key, parsed);
          } catch {
            /* leave missing scenes out of the map */
          }
        }),
      );

      for (const level of snapshot.levels) {
        for (const sid of level.sceneIds) {
          const key = normalizeSceneFile(sid);
          if (!sceneMap[key] && !sceneMap[sid]) {
            sceneMap[key] = loadScene(createEmptyScene(key.replace(/\.scene\.json$/, "")));
          }
        }
      }

      const levelsClone = structuredClone(snapshot.levels).map((l) => ({
        ...l,
        sceneIds: l.sceneIds.map((s) => normalizeSceneFile(s)),
      }));
      const manager = new SceneManager(
        {
          scenes: sceneMap,
          transition: { type: "none", duration: 0 },
        },
        levelsClone,
        new InMemoryStorage(),
      );
      const currentLevel =
        findLevelForScene(snapshot.levels, scene.id) ??
        findLevelForScene(snapshot.levels, currentSceneFile);
      if (currentLevel) {
        manager.setActiveLevel(
          currentLevel.id,
          normalizeSceneFile(currentSceneFile || currentLevel.sceneIds[0] || scene.id),
        );
      }
      playSceneManagerRef.current = manager;
      playUnlockedLevelIdsRef.current = manager.getLevels().filter((l) => l.unlocked).map((l) => l.id);

      playHotSwapRef.current = (sceneId: string) => {
        const ok =
          manager.switchScene(sceneId) ||
          manager.switchScene(normalizeSceneFile(sceneId));
        if (!ok) return false;
        const resolved =
          playScenesCacheRef.current.get(sceneId) ??
          playScenesCacheRef.current.get(normalizeSceneFile(sceneId)) ??
          playScenesCacheRef.current.get(manager.getState().currentSceneId ?? "");
        if (!resolved) {
          addConsoleLog("warn", `switchScene → ${sceneId} (no scene data cached)`);
          return false;
        }
        if (USE_PHASER_PLAY_HOST) {
          playOutcomeRef.current = "none";
          setPlayOutcome(null);
          setIsPaused(false);
          const rules = resolveGameRules(resolved.gameRules);
          playLivesRef.current = rules.lives > 0 ? rules.lives : 0;
          setPlayLives(rules.lives > 0 ? rules.lives : null);
          playEntitiesRef.current = structuredClone(resolved.entities);
          setPlayHostScene(GameKitSceneSchema.parse(structuredClone(resolved)));
          setPlayHostKey((k) => k + 1);
        } else {
          applyPlaySceneRuntime(resolved, manager);
        }
        addConsoleLog("system", `switchScene → ${resolved.id} (${resolved.name})`);
        return true;
      };

      if (USE_PHASER_PLAY_HOST) {
        const rules = resolveGameRules(scene.gameRules);
        playLivesRef.current = rules.lives > 0 ? rules.lives : 0;
        setPlayLives(rules.lives > 0 ? rules.lives : null);
        playOutcomeRef.current = "none";
        setPlayOutcome(null);
        playEntitiesRef.current = structuredClone(scene.entities);
        setPlayHostScene(GameKitSceneSchema.parse(structuredClone(scene)));
        setPlayHostKey((k) => k + 1);
        const objCount = rules.objectives?.length ?? 0;
        addConsoleLog(
          "system",
          `Game rules: onFall=${rules.onFall}` +
            (rules.onFall === "respawn" ? `, lives=${rules.lives || "∞"}` : "") +
            (objCount > 0 ? `, objectives=${objCount} (${rules.objectiveMode})` : "") +
            (currentLevel ? `, level=${currentLevel.name}` : ", level=none"),
        );
      } else {
        applyPlaySceneRuntime(scene, manager);
        const engine = rulesEngineRef.current as RulesEngine | null;
        const engineRules = engine?.rules ?? resolveGameRules(scene.gameRules);
        const objCount = engineRules.objectives?.length ?? 0;
        addConsoleLog(
          "system",
          `Game rules: onFall=${engineRules.onFall}, fallY≈${Math.round(engine?.getFallY() ?? 0)}` +
            (engineRules.onFall === "respawn" ? `, lives=${engineRules.lives || "∞"}` : "") +
            (objCount > 0 ? `, objectives=${objCount} (${engineRules.objectiveMode})` : "") +
            (currentLevel ? `, level=${currentLevel.name}` : ", level=none"),
        );
        if (currentLevel?.onComplete?.length) {
          addConsoleLog(
            "system",
            `Level onComplete: ${currentLevel.onComplete.map((a) => a.type).join(", ")}`,
          );
        }
      }

      setIsPlaying(true);
      setIsPaused(false);
      setPlayFps(0);
      setPlayFrameMs(0);
      if (USE_PHASER_PLAY_HOST) {
        addConsoleLog("system", "PLAY HOST: Phaser runtime-web started (export parity).");
        addConsoleLog("physics", "Arcade physics + RulesEngine via @gamekit/runtime-web.");
        addConsoleLog("system", "Menu shell: GUI buttons switchScene (remounts play host).");
      } else {
        addConsoleLog("system", "IGNITE SIMULATOR: Sandboxed execution mode started.");
        addConsoleLog("physics", "Real-time physics engine loop initialized.");
        addConsoleLog("system", "Camera follows player inside the game screen only (canvas pan locked).");
        addConsoleLog("system", "Menu shell: GUI buttons can switchScene during play.");
        if ((audioControllerRef.current?.sources.length ?? 0) > 0) {
          addConsoleLog("system", `Audio: ${audioControllerRef.current!.sources.length} source(s) armed.`);
        }
      }
    } else {
      setIsPaused((p) => {
        const next = !p;
        addConsoleLog("system", next ? "Simulation paused." : "Simulation resumed.");
        return next;
      });
    }
  }, [isPlaying, scene, currentSceneFile, snapshot.scenes, snapshot.levels, normalizeSceneFile, sceneFileMatches, addConsoleLog, applyPlaySceneRuntime]);

  const handleStop = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      setIsPaused(false);
      setPlayHostScene(null);
      rulesEngineRef.current = null;
      playSceneManagerRef.current = null;
      playEntitiesRef.current = [];
      playVarsRef.current = {};
      resetScene(preSimulationSceneRef.current);
      addConsoleLog(
        "system",
        USE_PHASER_PLAY_HOST
          ? "PLAY HOST: Stopped. Editor viewport restored."
          : "IGNITE SIMULATOR: Sandbox execution stopped. Viewport reverted.",
      );
      resetPlaySession({
        controllers: controllersRef.current,
        rigidBodies: rigidBodyRefs.current,
        animationStates: animationStatesRef.current,
        triggerState: triggerStateRef.current,
        collisionState: collisionStateRef.current,
        cameraFollowRef,
        playViewPanRef,
        playOutcomeRef,
        fallCooldownRef,
        audioControllerRef,
        setPlayViewPan,
        setPlayOutcome,
        setPlayLives,
        noneOutcome: "none",
      });
    }
  }, [isPlaying, resetScene, addConsoleLog]);

  const handlePlayRestart = useCallback(() => {
    if (!preSimulationSceneRef.current) return;
    const preSimSnapshot = structuredClone(preSimulationSceneRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    setPlayHostScene(null);
    resetScene(preSimSnapshot);
    resetPlaySession({
      controllers: controllersRef.current,
      rigidBodies: rigidBodyRefs.current,
      animationStates: animationStatesRef.current,
      triggerState: triggerStateRef.current,
      collisionState: collisionStateRef.current,
      cameraFollowRef,
      playViewPanRef,
      playOutcomeRef,
      fallCooldownRef,
      audioControllerRef,
      setPlayViewPan,
      setPlayOutcome,
      setPlayLives,
      noneOutcome: "none",
    });
    window.setTimeout(() => {
      preSimulationSceneRef.current = structuredClone(preSimSnapshot);
      handlePlayToggle();
    }, 0);
  }, [resetScene, handlePlayToggle]);

  const onVirtualInput = useCallback((action: "left" | "right" | "jump" | "fire" | "action", pressed: boolean) => {
    const keys = resolveActionKeys(sceneRef.current?.inputMap);
    const map: Record<typeof action, string[]> = {
      left: keys.left,
      right: keys.right,
      jump: keys.jump,
      fire: keys.fire.length ? keys.fire : ["__fire__"],
      action: keys.action.length ? keys.action : ["__action__"],
    };
    const list = map[action] ?? [];
    for (const key of list) {
      if (pressed) pressedKeysRef.current.add(key);
      else pressedKeysRef.current.delete(key);
    }
  }, [pressedKeysRef]);

  const onGuiAction = useCallback((action: string) => {
    if (!isPlaying) return;
    const entities = playEntitiesRef.current;
    const manager = playSceneManagerRef.current;
    for (const entity of entities) {
      const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
      if (!script) continue;
      evaluateScriptEvent(action, script, {
        entityId: entity.id,
        entities,
        sceneManager: {
          switchScene: (sceneId: string) => playHotSwapRef.current(sceneId),
          nextScene: () => manager?.nextScene() ?? false,
          nextLevel: () => manager?.nextLevel() ?? false,
          unlockLevel: (id: string) => manager?.unlockLevel(id) ?? false,
          completeLevel: (id: string) => manager?.completeLevel(id) ?? null,
          getState: () => ({ currentLevelId: manager?.getState().currentLevelId ?? null }),
          setPersistentVar: (key, value) => {
            manager?.setPersistentVar(key, value);
            playVarsRef.current[key] = value;
          },
          getPersistentVar: (key, defaultValue) =>
            manager?.getPersistentVar(key, defaultValue) ?? playVarsRef.current[key] ?? defaultValue,
        },
        playSound: (assetId) => audioControllerRef.current?.playAsset?.(assetId),
        destroyEntity: (id) => {
          const idx = playEntitiesRef.current.findIndex((e) => e.id === id);
          if (idx >= 0) playEntitiesRef.current.splice(idx, 1);
        },
      });
    }
  }, [isPlaying]);

  const onPhaserOutcome = useCallback((kind: "won" | "lost", message: string) => {
    if (kind === "won") {
      playOutcomeRef.current = "win";
      setPlayOutcome({ kind: "win", message, livesLeft: playLivesRef.current });
      setIsPaused(true);
      addConsoleLog("system", `WIN — ${message}`);
      syncPlayLevelUnlocksFromManager();
    } else {
      playOutcomeRef.current = "gameOver";
      setPlayOutcome({ kind: "gameOver", message, livesLeft: playLivesRef.current });
      setIsPaused(true);
      addConsoleLog("system", `GAME OVER — ${message}`);
    }
  }, [syncPlayLevelUnlocksFromManager, addConsoleLog]);

  const onMetrics = useCallback((sample: PlayProfilerSample) => {
    setPlayFps(sample.fps);
    setPlayFrameMs(sample.frameMs);
    setPlayDrawCalls(sample.drawCalls);
    setProfilerSample(sample);
  }, []);

  return {
    isPlaying,
    isPaused,
    setIsPaused,
    playFps,
    playFrameMs,
    playDrawCalls,
    profilerSample,
    profilerOpen,
    setProfilerOpen,
    playViewPan,
    playOutcome,
    setPlayOutcome,
    playLives,
    setPlayLives,
    playHostScene,
    playHostKey,
    playAssetUrls,
    playHostLevel,
    virtualTouchControls,
    handlePlayToggle,
    handleStop,
    handlePlayRestart,
    onVirtualInput,
    onGuiAction,
    onPhaserOutcome,
    onMetrics,
    playSceneManagerRef,
    playHotSwapRef,
    playLivesRef,
    playOutcomeRef,
    playVarsRef,
  };
}

export type PlaySimulationState = ReturnType<typeof usePlaySimulation>;
