import type {
  AabbColliderComponent,
  CircleColliderComponent,
  GameKitEntity,
  GameKitScene,
  PlayerControllerComponent,
  PolygonColliderComponent,
  RigidBodyComponent,
  TransformComponent,
} from "@gamekit/schema";
import {
  applyAabbCollisions,
  applyCircleCollisions,
  applyPolygonCollisions,
  getEntityAabb,
  getEntityCircle,
  getEntityPolygon,
  type CollisionSolid,
} from "./collision.js";
import { createPlayerController, type PlayerControllerInput } from "./player.js";
import { createRigidBody, RIGID_BODY_FIXED_DT } from "./rigid-body.js";

export type SimulateOptions = {
  steps: number;
  /** Held for every step. Defaults to no input. */
  input?: Partial<PlayerControllerInput>;
  /** Per-step input overrides (index = step). */
  inputSequence?: Array<Partial<PlayerControllerInput>>;
  fixedDt?: number;
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
};

/**
 * Headless fixed-timestep simulation for MCP agents and tests.
 * Clones the scene and advances PlayerController + RigidBody + collisions.
 */
export function simulateSceneSteps(scene: GameKitScene, options: SimulateOptions): SimulateResult {
  const steps = Math.max(0, Math.min(Math.floor(options.steps), 600));
  const fixedDt = options.fixedDt ?? RIGID_BODY_FIXED_DT;
  const working: GameKitScene = structuredClone(scene);

  const controllers = new Map<string, ReturnType<typeof createPlayerController>>();
  const bodies = new Map<string, ReturnType<typeof createRigidBody>>();

  for (const entity of working.entities) {
    const pc = entity.components.find((c): c is PlayerControllerComponent => c.type === "PlayerController");
    if (pc) controllers.set(entity.id, createPlayerController(pc));
    const rb = entity.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
    if (rb) bodies.set(entity.id, createRigidBody(rb));
  }

  for (let step = 0; step < steps; step++) {
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

    working.entities = working.entities.map((entity) =>
      stepEntity(entity, controllers, bodies, solids, input, fixedDt, working.gravity),
    );
  }

  const entitySummaries = working.entities.map((entity) => {
    const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
    const rb = entity.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
    return {
      id: entity.id,
      name: entity.name,
      position: transform ? { ...transform.position } : { x: 0, y: 0 },
      ...(rb ? { velocity: { ...rb.velocity } } : {}),
    };
  });

  return { scene: working, steps, entitySummaries };
}

function stepEntity(
  entity: GameKitEntity,
  controllers: Map<string, ReturnType<typeof createPlayerController>>,
  bodies: Map<string, ReturnType<typeof createRigidBody>>,
  solids: CollisionSolid[],
  input: PlayerControllerInput,
  dt: number,
  gravity: { x: number; y: number },
): GameKitEntity {
  const ent = structuredClone(entity);
  const transform = ent.components.find((c): c is TransformComponent => c.type === "Transform");
  if (!transform) return ent;

  const rb = bodies.get(ent.id);
  const controller = controllers.get(ent.id);

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

    rb.integrateForces(dt, gravity || { x: 0, y: 9.8 * 60 });
    transform.rotation = (transform.rotation ?? 0) + rb.state.angularVelocity * dt;

    const aabbCollider = ent.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
    const circleCollider = ent.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
    const polygonCollider = ent.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

    if (aabbCollider) {
      const movingAabb = getEntityAabb(ent);
      if (movingAabb) {
        const result = applyAabbCollisions(movingAabb, rb.state.velocity, solids, aabbCollider.mask);
        transform.position.x = result.position.x - aabbCollider.offset.x;
        transform.position.y = result.position.y - aabbCollider.offset.y;
        rb.state.velocity = result.velocity;
        rb.updateSleep(dt, result.grounded);
        if (controller && result.grounded) controller.setGrounded(true);
      }
    } else if (circleCollider) {
      const circle = getEntityCircle(ent);
      if (circle) {
        const result = applyCircleCollisions(circle, rb.state.velocity, solids, circleCollider.mask);
        transform.position.x = result.position.x - circleCollider.offset.x;
        transform.position.y = result.position.y - circleCollider.offset.y;
        rb.state.velocity = result.velocity;
        rb.updateSleep(dt, result.grounded);
        if (controller && result.grounded) controller.setGrounded(true);
      }
    } else if (polygonCollider) {
      const polygon = getEntityPolygon(ent);
      if (polygon) {
        const result = applyPolygonCollisions(polygon, rb.state.velocity, solids, polygonCollider.mask);
        transform.position.x = result.position.x - polygonCollider.offset.x;
        transform.position.y = result.position.y - polygonCollider.offset.y;
        rb.state.velocity = result.velocity;
        rb.updateSleep(dt, result.grounded);
        if (controller && result.grounded) controller.setGrounded(true);
      }
    } else {
      transform.position.x += rb.state.velocity.x * dt;
      transform.position.y += rb.state.velocity.y * dt;
      rb.updateSleep(dt, false);
    }

    const rbComp = ent.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
    if (rbComp) {
      rbComp.velocity = { ...rb.state.velocity };
      rbComp.angularVelocity = rb.state.angularVelocity;
    }
  } else if (controller) {
    controller.update(input, dt);
    const collider = ent.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
    if (collider) {
      const movingAabb = getEntityAabb(ent);
      if (movingAabb) {
        const result = applyAabbCollisions(movingAabb, controller.state.velocity, solids, collider.mask);
        transform.position.x = result.position.x - collider.offset.x;
        transform.position.y = result.position.y - collider.offset.y;
        controller.state.velocity = result.velocity;
        controller.setGrounded(result.grounded);
      }
    } else {
      transform.position.x += controller.state.velocity.x * dt;
      transform.position.y += controller.state.velocity.y * dt;
    }
  }

  return ent;
}
