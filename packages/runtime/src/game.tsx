import type { GameKitScene, PlayerControllerComponent, CameraFollowComponent, AabbColliderComponent, CircleColliderComponent, PolygonColliderComponent, RigidBodyComponent, TransformComponent, TweenComponent, FollowPathComponent, StateMachineComponent, ScriptComponent, ParticleSystemComponent } from "@gamekit/schema";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GameKitView } from "./view.js";
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
import { evaluateScriptEvent, transitionFsm } from "./script.js";
import { createAudioController, type AudioController } from "./audio.js";
import { createParticleEmitter, updateParticleEmitter, type Particle, type ParticleEmitterState } from "./particles.js";

export type GameKitGameProps = {
  scene: GameKitScene;
  assets?: AssetRegistry;
  showControls?: boolean;
  onTriggerEnter?: (event: TriggerEvent) => void;
  onTriggerExit?: (event: TriggerEvent) => void;
  onCollisionEnter?: (event: CollisionEvent) => void;
};

export function GameKitGame({ scene, assets = {}, showControls = true, onTriggerEnter, onTriggerExit, onCollisionEnter }: GameKitGameProps) {
  const entitiesRef = useRef(structuredClone(scene.entities));
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
  const { inputRef, setLeft, setRight, setJump } = usePlayerInput();
  const [, setTick] = useState(0);

  useEffect(() => {
    entitiesRef.current = structuredClone(scene.entities);
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

    // Initialize StateMachine and trigger start event scripts
    for (const entity of entitiesRef.current) {
      const sm = entity.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
      if (sm && !sm.currentState) {
        sm.currentState = sm.initialState;
      }
    }

    for (const entity of entitiesRef.current) {
      const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
      if (script) {
        evaluateScriptEvent("start", script, {
          entityId: entity.id,
          entities: entitiesRef.current,
          rigidBodies: rigidBodyRefs.current
        });
      }
    }

    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, [scene, assets]);

  useGameLoop((dt) => {
    const entities = entitiesRef.current;
    const input = inputRef.current;

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
      if (controller && (input.left || input.right || input.jump)) rb.wake();
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

        const e1 = currentEntities.find((e) => e.id === event.triggerEntityId);
        const e2 = currentEntities.find((e) => e.id === event.otherEntityId);

        for (const entity of [e1, e2]) {
          if (!entity) continue;
          const context = {
            entityId: entity.id,
            entities: currentEntities,
            rigidBodies: rigidBodyRefs.current
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
        const context = {
          entityId: entity.id,
          entities: currentEntities,
          rigidBodies: rigidBodyRefs.current
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
      />
      {showControls && (
        <VirtualControls
          onLeftPressIn={() => setLeft(true)}
          onLeftPressOut={() => setLeft(false)}
          onRightPressIn={() => setRight(true)}
          onRightPressOut={() => setRight(false)}
          onJumpPressIn={() => setJump(true)}
          onJumpPressOut={() => setJump(false)}
        />
      )}
    </View>
  );
}

type VirtualControlsProps = {
  onLeftPressIn: () => void;
  onLeftPressOut: () => void;
  onRightPressIn: () => void;
  onRightPressOut: () => void;
  onJumpPressIn: () => void;
  onJumpPressOut: () => void;
};

function VirtualControls({
  onLeftPressIn,
  onLeftPressOut,
  onRightPressIn,
  onRightPressOut,
  onJumpPressIn,
  onJumpPressOut,
}: VirtualControlsProps) {
  return (
    <View style={styles.controls} pointerEvents="box-none">
      <View style={styles.dpad}>
        <Pressable
          onPressIn={onLeftPressIn}
          onPressOut={onLeftPressOut}
          style={styles.button}
        >
          <Text style={styles.buttonText}>◀</Text>
        </Pressable>
        <Pressable
          onPressIn={onRightPressIn}
          onPressOut={onRightPressOut}
          style={styles.button}
        >
          <Text style={styles.buttonText}>▶</Text>
        </Pressable>
      </View>
      <Pressable
        onPressIn={onJumpPressIn}
        onPressOut={onJumpPressOut}
        style={[styles.button, styles.jumpButton]}
      >
        <Text style={styles.buttonText}>▲</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 24,
  },
  dpad: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  buttonText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 28,
    fontWeight: "600",
  },
  jumpButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
});
