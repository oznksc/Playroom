import type { GameKitScene, GameKitLevel, PlayerControllerComponent, CameraFollowComponent, AabbColliderComponent, CircleColliderComponent, PolygonColliderComponent, RigidBodyComponent, TransformComponent, TweenComponent, FollowPathComponent, StateMachineComponent, ScriptComponent, ParticleSystemComponent, SceneTransitionDef, GuiComponent, GuiNode } from "@gamekit/schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GameKitView, type TransitionOverlay } from "./view.js";
import { useGameLoop } from "./loop.js";
import { usePlayerInput } from "./input.js";
import { createPlayerController } from "./player.js";
import { createRigidBody, RIGID_BODY_FIXED_DT } from "./rigid-body.js";
import { createCameraFollow, type CameraState } from "./camera.js";
import { applyAabbCollisions, applyCircleCollisions, applyPolygonCollisions, getEntityAabb, getEntityCircle, getEntityPolygon, updateCollisionEvents, updateTriggerEvents, type CollisionEvent, type CollisionSolid, type CollisionState, type TriggerEvent, type TriggerState } from "./collision.js";
import { updateAnimation } from "./animate.js";
import { playTimeline, type TimelineState } from "./timeline.js";
import type { AnimationComponent } from "@gamekit/schema";
import type { AssetRegistry } from "./scene.js";
import { updateTween } from "./tween.js";
import { updateFollowPath } from "./path.js";
import { evaluateScriptEvent, transitionFsm, type ScriptContext } from "./script.js";
import { RulesEngine } from "./rules-engine.js";
import { createAudioController, type AudioController } from "./audio.js";
import { createParticleEmitter, updateParticleEmitter, type Particle, type ParticleEmitterState } from "./particles.js";
import { deepClone } from "./clone.js";
import { VirtualControls } from "./virtual-controls.js";
import { pollGamepad } from "./gamepad.js";
import { extendedInputFromPressedKeys, mergeGamepadIntoInput } from "./input-map.js";

export type GameKitGameProps = {
  scene: GameKitScene;
  assets?: AssetRegistry;
  showControls?: boolean;
  onTriggerEnter?: (event: TriggerEvent) => void;
  onTriggerExit?: (event: TriggerEvent) => void;
  onCollisionEnter?: (event: CollisionEvent) => void;
  transition?: SceneTransitionDef;
  /** Project-level GUI components for componentInstances. */
  guiComponents?: GuiComponent[];
  /** Enables switchScene / nextLevel from GUI button Script handlers. */
  sceneManager?: ScriptContext["sceneManager"];
  /** Active level for rules merge + onComplete. */
  level?: GameKitLevel | null;
  onWin?: (message: string) => void;
  onLose?: (message: string) => void;
  onLivesChange?: (lives: number | null) => void;
};

export function GameKitGame({
  scene,
  assets = {},
  showControls = true,
  onTriggerEnter,
  onTriggerExit,
  onCollisionEnter,
  transition,
  guiComponents = [],
  sceneManager,
  level = null,
  onWin,
  onLose,
  onLivesChange,
}: GameKitGameProps) {
  const entitiesRef = useRef(deepClone(scene.entities));
  const controllersRef = useRef<Map<string, ReturnType<typeof createPlayerController>>>(new Map());
  const rigidBodyRefs = useRef<Map<string, ReturnType<typeof createRigidBody>>>(new Map());
  const cameraFollowRef = useRef<ReturnType<typeof createCameraFollow> | null>(null);
  const cameraStateRef = useRef<CameraState>({ position: { x: 0, y: 0 }, zoom: 1 });
  const animationStatesRef = useRef<Map<string, { currentFrame: number; elapsed: number }>>(new Map());
  const timelineRef = useRef<TimelineState>({ elapsed: 0, playing: scene.timeline.playing });
  const triggerStateRef = useRef<TriggerState>(new Set());
  const collisionStateRef = useRef<CollisionState>(new Set());
  const audioRef = useRef<AudioController | null>(null);
  const particleEmittersRef = useRef<Map<string, ParticleEmitterState>>(new Map());
  const particlesByEntityRef = useRef<Record<string, Particle[]>>({});
  const rulesEngineRef = useRef<RulesEngine | null>(null);
  const sceneManagerRef = useRef(sceneManager);
  sceneManagerRef.current = sceneManager;
  const { inputRef, setLeft, setRight, setJump, setUp, setDown, setFire, setAction } = usePlayerInput();
  const [, setTick] = useState(0);
  const [transitionOverlay, setTransitionOverlay] = useState<TransitionOverlay | null>(null);
  const [outcomeOverlay, setOutcomeOverlay] = useState<{ kind: "won" | "lost"; message: string } | null>(null);
  const [livesHud, setLivesHud] = useState<number | null>(null);
  const prevSceneIdRef = useRef<string>(scene.id);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // Desktop / Expo web: track keyboard; merged with virtual controls each frame.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    const onDown = (e: KeyboardEvent) => {
      pressedKeysRef.current.add(e.key);
    };
    const onUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    if (prevSceneIdRef.current !== scene.id) {
      const d = (transition?.type === "fade" || transition?.type === "slide")
        ? (transition.duration ?? 0.3)
        : 0;
      if (d > 0) {
        const steps = Math.max(8, Math.round(d * 30));
        const stepMs = (d * 1000) / steps;
        let step = 0;
        setTransitionOverlay({ opacity: 1, color: "#000000" });
        const interval = setInterval(() => {
          step++;
          const t = step / (steps / 2);
          setTransitionOverlay({ opacity: Math.max(0, 1 - Math.min(t, 1)), color: "#000000" });
          if (step >= steps) {
            clearInterval(interval);
            setTransitionOverlay(null);
          }
        }, stepMs);
        prevSceneIdRef.current = scene.id;
        return () => clearInterval(interval);
      } else {
        prevSceneIdRef.current = scene.id;
      }
    }
  }, [scene.id, transition]);

  useEffect(() => {
    entitiesRef.current = deepClone(scene.entities);
    controllersRef.current.clear();
    rigidBodyRefs.current.clear();
    cameraFollowRef.current = null;
    animationStatesRef.current.clear();
    timelineRef.current = { elapsed: 0, playing: scene.timeline.playing };
    triggerStateRef.current.clear();
    collisionStateRef.current.clear();
    audioRef.current?.dispose();
    audioRef.current = createAudioController(entitiesRef.current, (assetId) => {
      const entry = assets[assetId];
      return typeof entry === "string" ? entry : undefined;
    });
    particleEmittersRef.current.clear();
    particlesByEntityRef.current = {};
    rulesEngineRef.current = null;
    setOutcomeOverlay(null);

    for (const entity of entitiesRef.current) {
      const pc = entity.components.find((c): c is PlayerControllerComponent => c.type === "PlayerController");
      if (pc) {
        controllersRef.current.set(entity.id, createPlayerController(pc));
      }
      if (entity.components.some((c) => c.type === "ParticleSystem")) {
        particleEmittersRef.current.set(entity.id, createParticleEmitter());
      }
    }

    for (const entity of entitiesRef.current) {
      const rb = entity.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
      if (rb) {
        rigidBodyRefs.current.set(entity.id, createRigidBody(rb));
      }
    }

    for (const entity of entitiesRef.current) {
      const cf = entity.components.find((c): c is CameraFollowComponent => c.type === "CameraFollow");
      if (!cf) continue;

      cameraFollowRef.current = createCameraFollow({
        viewport: { x: scene.viewport.width, y: scene.viewport.height },
        smoothing: cf.smoothing,
      });

      const target = entitiesRef.current.find((e) => e.id === cf.targetId);
      if (target) {
        const transform = target.components.find((c): c is TransformComponent => c.type === "Transform");
        if (transform) {
          cameraStateRef.current = {
            position: {
              x: transform.position.x - scene.viewport.width / 2,
              y: transform.position.y - scene.viewport.height / 2,
            },
            zoom: 1,
          };
        }
      }
      break;
    }

    // Initialize StateMachine
    for (const entity of entitiesRef.current) {
      const sm = entity.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
      if (sm && !sm.currentState) {
        sm.currentState = sm.initialState;
      }
    }

    // Rules engine (fall, objectives, tagContact, checkpoints)
    const engine = new RulesEngine(
      { ...scene, entities: entitiesRef.current },
      {
        getEntities: () => entitiesRef.current,
        destroyEntity: (id) => {
          entitiesRef.current = entitiesRef.current.filter((e) => e.id !== id);
        },
        getPlayerTransforms: () =>
          entitiesRef.current
            .filter((e) => e.components.some((c) => c.type === "PlayerController"))
            .map((e) => {
              const t = e.components.find((c): c is TransformComponent => c.type === "Transform");
              return t ? { entityId: e.id, position: { ...t.position } } : null;
            })
            .filter((p): p is { entityId: string; position: { x: number; y: number } } => p !== null),
        setPlayerPosition: (entityId, position) => {
          const entity = entitiesRef.current.find((e) => e.id === entityId);
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
          const entity = entitiesRef.current.find((e) => e.id === entityId);
          const rbComp = entity?.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
          if (rbComp) rbComp.velocity = { x: 0, y: 0 };
        },
        sceneManager: sceneManagerRef.current,
        playSound: (assetId) => audioRef.current?.playAsset?.(assetId),
        onOutcome: (kind, message) => {
          setOutcomeOverlay({ kind, message });
          if (kind === "won") onWin?.(message);
          else onLose?.(message);
        },
        onLivesChange: (lives) => {
          setLivesHud(lives);
          onLivesChange?.(lives);
        },
      },
      { level: level ?? null },
    );
    rulesEngineRef.current = engine;
    engine.start();
    const st = engine.getState();
    setLivesHud(st.unlimitedLives ? null : st.livesRemaining);

    // start scripts with rules + sceneManager hooks
    for (const entity of entitiesRef.current) {
      const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
      if (script) {
        evaluateScriptEvent(
          "start",
          script,
          engine.scriptContext(entity.id, {
            sceneManager: sceneManagerRef.current,
            rigidBodies: rigidBodyRefs.current,
            playSound: (assetId: string) => audioRef.current?.playAsset?.(assetId),
            destroyEntity: (id: string) => {
              entitiesRef.current = entitiesRef.current.filter((e) => e.id !== id);
            },
          }),
        );
      }
    }

    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
      rulesEngineRef.current = null;
    };
  }, [scene, assets, level, onWin, onLose, onLivesChange]);

  useGameLoop((dt) => {
    const engine = rulesEngineRef.current;
    if (engine && engine.getState().outcome !== "playing") {
      setTick((t) => t + 1);
      return;
    }

    const entities = entitiesRef.current;
    // Merge virtual controls + keyboard + gamepad
    const kb = extendedInputFromPressedKeys(pressedKeysRef.current, scene.inputMap);
    const touch = inputRef.current;
    const input = mergeGamepadIntoInput(
      {
        left: touch.left || kb.left,
        right: touch.right || kb.right,
        jump: touch.jump || kb.jump,
        up: Boolean(touch.up) || Boolean(kb.up),
        down: Boolean(touch.down) || Boolean(kb.down),
        fire: touch.fire || kb.fire,
        action: touch.action || kb.action,
      },
      scene.inputMap,
      pollGamepad(),
    );

    // Update Tweens and FollowPaths
    for (const entity of entities) {
      const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
      if (!transform) continue;

      const tweens = entity.components.filter((c): c is TweenComponent => c.type === "Tween");
      for (const tween of tweens) {
        updateTween(tween, transform, dt);
      }

      const followPath = entity.components.find((c): c is FollowPathComponent => c.type === "FollowPath");
      if (followPath) {
        updateFollowPath(followPath, transform, dt);
      }
    }

    const solids: CollisionSolid[] = [];
    const collisionContacts: CollisionEvent[] = [];
    for (const entity of entities) {
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

    for (const entity of entities) {
      const rb = rigidBodyRefs.current.get(entity.id);
      if (!rb) continue;

      const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
      if (!transform) continue;

      const controller = controllersRef.current.get(entity.id);
      if (
        controller &&
        (input.left || input.right || input.jump || input.up || input.down)
      ) {
        rb.wake();
      }
      if (rb.state.sleeping) continue;

      if (controller) {
        controller.update(input, dt);
        rb.state.velocity.x = controller.state.velocity.x;
        rb.state.velocity.y = controller.state.velocity.y;
        controller.state.velocity = rb.state.velocity;
        controller.setGrounded(false);
      }

      rb.integrateForces(dt, scene.gravity);

      transform.rotation = (transform.rotation ?? 0) + rb.state.angularVelocity * dt;

      const aabbCollider = entity.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
      const circleCollider = entity.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
      const polygonCollider = entity.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

      if (aabbCollider) {
        const movingAabb = getEntityAabb(entity);
        if (movingAabb) {
          const mask = aabbCollider.mask;
          const result = applyAabbCollisions(movingAabb, rb.state.velocity, solids, mask);
          transform.position.x = result.position.x - aabbCollider.offset.x;
          transform.position.y = result.position.y - aabbCollider.offset.y;
          rb.state.velocity = result.velocity;
          rb.updateSleep(dt, result.grounded);
          for (const otherEntityId of result.collisionEntityIds) collisionContacts.push({ entityId: entity.id, otherEntityId });
          if (controller && result.grounded) {
            controller.setGrounded(true);
          }
        }
      } else if (circleCollider) {
        const circle = getEntityCircle(entity);
        if (circle) {
          const mask = circleCollider.mask;
          const result = applyCircleCollisions(circle, rb.state.velocity, solids, mask);
          transform.position.x = result.position.x - circleCollider.offset.x;
          transform.position.y = result.position.y - circleCollider.offset.y;
          rb.state.velocity = result.velocity;
          rb.updateSleep(dt, result.grounded);
          for (const otherEntityId of result.collisionEntityIds) collisionContacts.push({ entityId: entity.id, otherEntityId });
          if (controller && result.grounded) {
            controller.setGrounded(true);
          }
        }
      } else if (polygonCollider) {
        const polygon = getEntityPolygon(entity);
        if (polygon) {
          const result = applyPolygonCollisions(polygon, rb.state.velocity, solids, polygonCollider.mask);
          transform.position.x = result.position.x - polygonCollider.offset.x;
          transform.position.y = result.position.y - polygonCollider.offset.y;
          rb.state.velocity = result.velocity;
          rb.updateSleep(dt, result.grounded);
          for (const otherEntityId of result.collisionEntityIds) collisionContacts.push({ entityId: entity.id, otherEntityId });
          if (controller && result.grounded) controller.setGrounded(true);
        }
      } else {
        transform.position.x += rb.state.velocity.x * dt;
        transform.position.y += rb.state.velocity.y * dt;
        rb.updateSleep(dt, false);
      }
    }

    for (const entity of entities) {
      const controller = controllersRef.current.get(entity.id);
      if (!controller) continue;

      const rigBody = rigidBodyRefs.current.get(entity.id);
      if (rigBody) continue;

      const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
      if (!transform) continue;

      controller.update(input, dt);

      const collider = entity.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
      const circleCollider = entity.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
      const polygonCollider = entity.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

      if (collider) {
        const movingAabb = getEntityAabb(entity);
        if (movingAabb) {
          const result = applyAabbCollisions(movingAabb, controller.state.velocity, solids, collider.mask);
          transform.position.x = result.position.x - collider.offset.x;
          transform.position.y = result.position.y - collider.offset.y;
          controller.state.velocity = result.velocity;
          for (const otherEntityId of result.collisionEntityIds) collisionContacts.push({ entityId: entity.id, otherEntityId });
          controller.setGrounded(result.grounded);
        }
      } else if (circleCollider) {
        const circle = getEntityCircle(entity);
        if (circle) {
          const result = applyCircleCollisions(circle, controller.state.velocity, solids, circleCollider.mask);
          transform.position.x = result.position.x - circleCollider.offset.x;
          transform.position.y = result.position.y - circleCollider.offset.y;
          controller.state.velocity = result.velocity;
          for (const otherEntityId of result.collisionEntityIds) collisionContacts.push({ entityId: entity.id, otherEntityId });
          controller.setGrounded(result.grounded);
        }
      } else if (polygonCollider) {
        const polygon = getEntityPolygon(entity);
        if (polygon) {
          const result = applyPolygonCollisions(polygon, controller.state.velocity, solids, polygonCollider.mask);
          transform.position.x = result.position.x - polygonCollider.offset.x;
          transform.position.y = result.position.y - polygonCollider.offset.y;
          controller.state.velocity = result.velocity;
          for (const otherEntityId of result.collisionEntityIds) collisionContacts.push({ entityId: entity.id, otherEntityId });
          controller.setGrounded(result.grounded);
        }
      } else {
        transform.position.x += controller.state.velocity.x * dt;
        transform.position.y += controller.state.velocity.y * dt;
      }
    }

    if (cameraFollowRef.current) {
      for (const entity of entities) {
        const cf = entity.components.find((c): c is CameraFollowComponent => c.type === "CameraFollow");
        if (!cf) continue;

        const target = entities.find((e) => e.id === cf.targetId);
        if (!target) continue;

        const targetTransform = target.components.find((c): c is TransformComponent => c.type === "Transform");
        if (!targetTransform) continue;

        cameraFollowRef.current.update(targetTransform.position);
        cameraStateRef.current = { ...cameraFollowRef.current.state };
        break;
      }
    }

    for (const entity of entities) {
      const anim = entity.components.find((c): c is AnimationComponent => c.type === "Animation");
      if (!anim) continue;
      let state = animationStatesRef.current.get(entity.id);
      if (!state) {
        state = { currentFrame: anim.currentFrame ?? 0, elapsed: 0 };
        animationStatesRef.current.set(entity.id, state);
      }
      anim.currentFrame = updateAnimation(anim, state, dt);
    }

    const currentEntities = entitiesRef.current;
    const triggerUpdate = updateTriggerEvents(currentEntities, triggerStateRef.current);
    triggerStateRef.current = triggerUpdate.active;
    for (const event of triggerUpdate.events) {
      if (event.type === "enter") {
        onTriggerEnter?.(event);
        rulesEngineRef.current?.handleTriggerEnter(event.triggerEntityId, event.otherEntityId);

        const e1 = currentEntities.find((e) => e.id === event.triggerEntityId);
        const e2 = currentEntities.find((e) => e.id === event.otherEntityId);

        for (const entity of [e1, e2]) {
          if (!entity) continue;
          const context =
            rulesEngineRef.current?.scriptContext(entity.id, {
              sceneManager: sceneManagerRef.current,
              rigidBodies: rigidBodyRefs.current,
              playSound: (assetId: string) => audioRef.current?.playAsset?.(assetId),
              destroyEntity: (id: string) => {
                entitiesRef.current = entitiesRef.current.filter((e) => e.id !== id);
              },
            }) ?? {
              entityId: entity.id,
              entities: currentEntities,
              sceneManager: sceneManagerRef.current,
              rigidBodies: rigidBodyRefs.current,
              playSound: (assetId: string) => audioRef.current?.playAsset?.(assetId),
              destroyEntity: (id: string) => {
                entitiesRef.current = entitiesRef.current.filter((e) => e.id !== id);
              },
            };

          const sm = entity.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
          if (sm && sm.currentState) {
            const stateObj = sm.states.find((s) => s.name === sm.currentState);
            if (stateObj && stateObj.on && stateObj.on["triggerEnter"]) {
              transitionFsm(sm, stateObj.on["triggerEnter"], context);
            }
          }

          const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
          if (script) {
            evaluateScriptEvent("onTriggerEnter", script, context);
            evaluateScriptEvent("triggerEnter", script, context);
          }
        }
      } else {
        onTriggerExit?.(event);
      }
    }

    const collisionUpdate = updateCollisionEvents(collisionContacts, collisionStateRef.current);
    collisionStateRef.current = collisionUpdate.active;
    for (const event of collisionUpdate.events) {
      onCollisionEnter?.(event);

      const e1 = currentEntities.find((e) => e.id === event.entityId);
      const e2 = currentEntities.find((e) => e.id === event.otherEntityId);

      for (const entity of [e1, e2]) {
        if (!entity) continue;
        const context =
          rulesEngineRef.current?.scriptContext(entity.id, {
            sceneManager: sceneManagerRef.current,
            rigidBodies: rigidBodyRefs.current,
          }) ?? {
            entityId: entity.id,
            entities: currentEntities,
            sceneManager: sceneManagerRef.current,
            rigidBodies: rigidBodyRefs.current,
          };

        const sm = entity.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
        if (sm && sm.currentState) {
          const stateObj = sm.states.find((s) => s.name === sm.currentState);
          if (stateObj && stateObj.on && stateObj.on["collisionEnter"]) {
            transitionFsm(sm, stateObj.on["collisionEnter"], context);
          }
        }

        const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
        if (script) {
          evaluateScriptEvent("collisionEnter", script, context);
        }
      }
    }

    // Fall / survive / objective checks
    rulesEngineRef.current?.update(dt);

    // Particles
    const nextParticles: Record<string, Particle[]> = {};
    for (const entity of currentEntities) {
      const ps = entity.components.find((c): c is ParticleSystemComponent => c.type === "ParticleSystem");
      const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
      if (!ps || !transform) continue;
      let emitter = particleEmittersRef.current.get(entity.id);
      if (!emitter) {
        emitter = createParticleEmitter();
        particleEmittersRef.current.set(entity.id, emitter);
      }
      nextParticles[entity.id] = updateParticleEmitter(
        emitter,
        ps,
        transform.position,
        scene.gravity?.y ?? 0,
        dt,
      );
    }
    particlesByEntityRef.current = nextParticles;

    const workingScene = { ...scene, entities: currentEntities };
    playTimeline(workingScene, timelineRef.current, dt);

    setTick((t) => t + 1);
  }, true, { fixedDt: RIGID_BODY_FIXED_DT });

  const currentScene = { ...scene, entities: entitiesRef.current };
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const dispatchGuiAction = useCallback(
    (action: string) => {
      const entities = entitiesRef.current;
      const engine = rulesEngineRef.current;
      for (const entity of entities) {
        const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
        if (!script) continue;
        const context =
          engine?.scriptContext(entity.id, {
            sceneManager: sceneManagerRef.current,
            playSound: (assetId) => audioRef.current?.playAsset?.(assetId),
            destroyEntity: (id) => {
              entitiesRef.current = entitiesRef.current.filter((e) => e.id !== id);
            },
            rigidBodies: rigidBodyRefs.current,
          }) ?? {
            entityId: entity.id,
            entities,
            sceneManager: sceneManagerRef.current,
            playSound: (assetId) => audioRef.current?.playAsset?.(assetId),
            destroyEntity: (id) => {
              entitiesRef.current = entitiesRef.current.filter((e) => e.id !== id);
            },
            rigidBodies: rigidBodyRefs.current,
          };
        evaluateScriptEvent(action, script, context);
      }
    },
    [],
  );

  const interactiveButtons = useMemo(() => {
    const buttons: Array<GuiNode & { key: string }> = [];
    const componentMap = new Map(guiComponents.map((c) => [c.id, c]));
    for (const instance of scene.gui?.componentInstances ?? []) {
      if (instance.visible === false) continue;
      const component = componentMap.get(instance.componentId);
      if (!component) continue;
      for (const node of component.nodes) {
        if (node.visible === false || node.type !== "Button" || !node.action) continue;
        buttons.push({
          ...node,
          x: node.x + instance.x,
          y: node.y + instance.y,
          key: `${instance.id}-${node.id}`,
        });
      }
    }
    for (const node of scene.gui?.nodes ?? []) {
      if (node.visible === false || node.type !== "Button" || !node.action) continue;
      buttons.push({ ...node, key: node.id });
    }
    return buttons;
  }, [scene.gui, guiComponents]);

  // Approximate design-space → screen for Pressable hit targets (scale mode min-fit).
  const refW = scene.responsive?.referenceWidth || scene.viewport.width;
  const refH = scene.responsive?.referenceHeight || scene.viewport.height;
  const availW = screenWidth - insets.left - insets.right;
  const availH = screenHeight - insets.top - insets.bottom;
  const scale = Math.min(availW / refW, availH / refH);
  const offsetX = insets.left + (availW - refW * scale) / 2;
  const offsetY = insets.top + (availH - refH * scale) / 2;

  return (
    <View style={styles.container}>
      <GameKitView
        scene={currentScene}
        assets={assets}
        camera={{
          x: cameraStateRef.current.position.x,
          y: cameraStateRef.current.position.y,
          zoom: cameraStateRef.current.zoom,
        }}
        particlesByEntity={particlesByEntityRef.current}
        transitionOverlay={transitionOverlay}
        guiComponents={guiComponents}
      />
      {interactiveButtons.map((btn) => {
        const action = btn.type === "Button" ? btn.action : undefined;
        const label = btn.type === "Button" ? btn.text : btn.id;
        if (!action) return null;
        return (
          <Pressable
            key={btn.key}
            onPress={() => dispatchGuiAction(action)}
            style={{
              position: "absolute",
              left: offsetX + btn.x * scale,
              top: offsetY + btn.y * scale,
              width: btn.width * scale,
              height: btn.height * scale,
              // Transparent hit target over Skia-drawn button
              backgroundColor: "transparent",
            }}
            accessibilityRole="button"
            accessibilityLabel={label}
          />
        );
      })}
      {showControls && !outcomeOverlay && (
        <VirtualControls
          inputMap={scene.inputMap}
          actions={{
            setLeft,
            setRight,
            setJump,
            setUp,
            setDown,
            setFire,
            setAction,
          }}
        />
      )}
      {livesHud !== null && !outcomeOverlay && (
        <View style={styles.livesHud} pointerEvents="none">
          <Text style={styles.livesText}>Lives {livesHud}</Text>
        </View>
      )}
      {outcomeOverlay && (
        <View style={styles.outcomeOverlay} pointerEvents="none">
          <Text
            style={[
              styles.outcomeMessage,
              outcomeOverlay.kind === "won" ? styles.outcomeWin : styles.outcomeLose,
            ]}
          >
            {outcomeOverlay.message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  livesHud: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  livesText: {
    color: "#f1c40f",
    fontSize: 14,
    fontWeight: "600",
  },
  outcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  outcomeMessage: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1,
  },
  outcomeWin: {
    color: "#00f0ff",
  },
  outcomeLose: {
    color: "#ff6b8a",
  },
});
