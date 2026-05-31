import type { AabbColliderComponent, GameKitEntity, TransformComponent, Vector2 } from "@gamekit/schema";

export type Aabb = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function intersectsAabb(a: Aabb, b: Aabb): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

export function getEntityAabb(entity: GameKitEntity): Aabb | undefined {
  const transform = findComponent<TransformComponent>(entity, "Transform");
  const collider = findComponent<AabbColliderComponent>(entity, "AabbCollider");

  if (!transform || !collider) {
    return undefined;
  }

  return {
    x: transform.position.x + collider.offset.x,
    y: transform.position.y + collider.offset.y,
    width: collider.size.x * transform.scale.x,
    height: collider.size.y * transform.scale.y
  };
}

export function applyAabbCollisions(
  moving: Aabb,
  velocity: Vector2,
  solids: Aabb[]
): { position: Vector2; velocity: Vector2; grounded: boolean } {
  const next = { ...moving };
  const nextVelocity = { ...velocity };
  let grounded = false;

  next.x += velocity.x;
  for (const solid of solids) {
    if (intersectsAabb(next, solid)) {
      if (velocity.x > 0) {
        next.x = solid.x - next.width;
      } else if (velocity.x < 0) {
        next.x = solid.x + solid.width;
      }
      nextVelocity.x = 0;
    }
  }

  next.y += velocity.y;
  for (const solid of solids) {
    if (intersectsAabb(next, solid)) {
      if (velocity.y > 0) {
        next.y = solid.y - next.height;
        grounded = true;
      } else if (velocity.y < 0) {
        next.y = solid.y + solid.height;
      }
      nextVelocity.y = 0;
    }
  }

  return {
    position: { x: next.x, y: next.y },
    velocity: nextVelocity,
    grounded
  };
}

function findComponent<T>(entity: GameKitEntity, type: T extends { type: infer Name } ? Name : never): T | undefined {
  return entity.components.find((component) => component.type === type) as T | undefined;
}
