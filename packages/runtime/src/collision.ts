import type { AabbColliderComponent, CircleColliderComponent, GameKitEntity, TransformComponent, Vector2 } from "@gamekit/schema";

export type Aabb = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Circle = {
  x: number;
  y: number;
  radius: number;
};

export type CollisionSolid = (Aabb | Circle) & {
  layer: number;
};

export function intersectsAabb(a: Aabb, b: Aabb): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

export function intersectsCircleCircle(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distSq = dx * dx + dy * dy;
  const radiusSum = a.radius + b.radius;
  return distSq < radiusSum * radiusSum;
}

export function intersectsCircleAabb(circle: Circle, aabb: Aabb): boolean {
  const closestX = Math.max(aabb.x, Math.min(circle.x, aabb.x + aabb.width));
  const closestY = Math.max(aabb.y, Math.min(circle.y, aabb.y + aabb.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
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

export function getEntityCircle(entity: GameKitEntity): Circle | undefined {
  const transform = findComponent<TransformComponent>(entity, "Transform");
  const collider = findComponent<CircleColliderComponent>(entity, "CircleCollider");

  if (!transform || !collider) {
    return undefined;
  }

  return {
    x: transform.position.x + collider.offset.x,
    y: transform.position.y + collider.offset.y,
    radius: collider.radius * Math.max(transform.scale.x, transform.scale.y)
  };
}

export function solidAabb(solid: CollisionSolid): Aabb {
  if ("width" in solid) return solid as Aabb;
  return { x: solid.x - (solid as Circle).radius, y: solid.y - (solid as Circle).radius, width: (solid as Circle).radius * 2, height: (solid as Circle).radius * 2 };
}

function circleVsSolid(circle: Circle, solid: CollisionSolid): boolean {
  if ("width" in solid) {
    return intersectsCircleAabb(circle, solid as Aabb);
  }
  return intersectsCircleCircle(circle, solid as Circle);
}

function pushCircleOutOfSolid(
  circle: Circle,
  solid: CollisionSolid,
  velocityX: number,
  velocityY: number
): { x: number; y: number } {
  if ("width" in solid) {
    const box = solid as Aabb;
    const closestX = Math.max(box.x, Math.min(circle.x, box.x + box.width));
    const closestY = Math.max(box.y, Math.min(circle.y, box.y + box.height));
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      return { x: circle.x, y: circle.y - circle.radius };
    }

    const overlap = circle.radius - dist;
    if (overlap > 0) {
      return {
        x: circle.x + (dx / dist) * overlap,
        y: circle.y + (dy / dist) * overlap,
      };
    }
    return { x: circle.x, y: circle.y };
  }

  const circleB = solid as Circle;
  const dx = circle.x - circleB.x;
  const dy = circle.y - circleB.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = circle.radius + circleB.radius;

  if (dist === 0) {
    return { x: circle.x, y: circle.y - minDist };
  }

  if (dist < minDist) {
    const overlap = minDist - dist;
    return {
      x: circle.x + (dx / dist) * overlap,
      y: circle.y + (dy / dist) * overlap,
    };
  }

  return { x: circle.x, y: circle.y };
}

export function applyCircleCollisions(
  circle: Circle,
  velocity: Vector2,
  solids: CollisionSolid[],
  mask?: number
): { position: Vector2; velocity: Vector2; grounded: boolean } {
  const next = { ...circle };
  const nextVelocity = { ...velocity };
  let grounded = false;

  const effectiveSolids = mask !== undefined
    ? solids.filter((s) => (mask & s.layer) !== 0)
    : solids;

  next.x += velocity.x;
  for (const solid of effectiveSolids) {
    if (circleVsSolid(next, solid)) {
      if (velocity.x > 0) {
        next.x = solidAabb(solid).x - next.radius;
      } else if (velocity.x < 0) {
        next.x = solidAabb(solid).x + solidAabb(solid).width + next.radius;
      }
      nextVelocity.x = 0;
    }
  }

  next.y += velocity.y;
  for (const solid of effectiveSolids) {
    if (circleVsSolid(next, solid)) {
      if (velocity.y > 0) {
        next.y = solidAabb(solid).y - next.radius;
        grounded = true;
      } else if (velocity.y < 0) {
        next.y = solidAabb(solid).y + solidAabb(solid).height + next.radius;
      }
      nextVelocity.y = 0;
    }
  }

  return {
    position: { x: next.x, y: next.y },
    velocity: nextVelocity,
    grounded,
  };
}

export function applyAabbCollisions(
  moving: Aabb,
  velocity: Vector2,
  solids: CollisionSolid[],
  mask?: number
): { position: Vector2; velocity: Vector2; grounded: boolean } {
  const next = { ...moving };
  const nextVelocity = { ...velocity };
  let grounded = false;

  const effectiveSolids = mask !== undefined
    ? solids.filter((s) => (mask & s.layer) !== 0)
    : solids;

  next.x += velocity.x;
  for (const solid of effectiveSolids) {
    const solidBox = solidAabb(solid);
    if (intersectsAabb(next, solidBox)) {
      if (velocity.x > 0) {
        next.x = solidBox.x - next.width;
      } else if (velocity.x < 0) {
        next.x = solidBox.x + solidBox.width;
      }
      nextVelocity.x = 0;
    }
  }

  next.y += velocity.y;
  for (const solid of effectiveSolids) {
    const solidBox = solidAabb(solid);
    if (intersectsAabb(next, solidBox)) {
      if (velocity.y > 0) {
        next.y = solidBox.y - next.height;
        grounded = true;
      } else if (velocity.y < 0) {
        next.y = solidBox.y + solidBox.height;
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