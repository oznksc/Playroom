import type { AabbColliderComponent, CircleColliderComponent, GameKitEntity, PolygonColliderComponent, TransformComponent, RigidBodyComponent, Vector2 } from "@gamekit/schema";

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

export type Polygon = {
  x: number;
  y: number;
  points: { x: number; y: number }[];
};

export type CollisionSolid = (Aabb | Circle | Polygon) & {
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

export function getEntityPolygon(entity: GameKitEntity): Polygon | undefined {
  const transform = findComponent<TransformComponent>(entity, "Transform");
  const collider = findComponent<PolygonColliderComponent>(entity, "PolygonCollider");

  if (!transform || !collider) {
    return undefined;
  }

  const ox = transform.position.x + collider.offset.x;
  const oy = transform.position.y + collider.offset.y;
  return {
    x: ox,
    y: oy,
    points: collider.points.map((p) => ({
      x: ox + p.x,
      y: oy + p.y,
    })),
  };
}

export function intersectsPolygonAabb(poly: Polygon, aabb: Aabb): boolean {
  const polyAabb = solidPolygonBounds(poly);
  if (
    polyAabb.x > aabb.x + aabb.width ||
    polyAabb.x + polyAabb.width < aabb.x ||
    polyAabb.y > aabb.y + aabb.height ||
    polyAabb.y + polyAabb.height < aabb.y
  ) {
    return false;
  }
  return true;
}

export function intersectsPolygonCircle(poly: Polygon, circle: Circle): boolean {
  return circleInConvexPolygon(circle, poly);
}

export function intersectsPolygonPolygon(a: Polygon, b: Polygon): boolean {
  return convexPolygonsIntersect(a, b);
}

export function solidPolygonBounds(poly: Polygon): Aabb {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function pushPolygonOutOfSolid(
  polygon: Polygon,
  _solid: CollisionSolid,
  _velocityX: number,
  _velocityY: number
): { x: number; y: number } {
  return { x: polygon.x, y: polygon.y };
}

export function applyPolygonCollisions(
  _polygon: Polygon,
  velocity: Vector2,
  _solids: CollisionSolid[],
  _mask?: number
): { position: Vector2; velocity: Vector2; grounded: boolean } {
  return { position: { x: 0, y: 0 }, velocity, grounded: false };
}

export function solidAabb(solid: CollisionSolid): Aabb {
  if ("width" in solid) return solid as Aabb;
  if ("radius" in solid) {
    return { x: solid.x - (solid as Circle).radius, y: solid.y - (solid as Circle).radius, width: (solid as Circle).radius * 2, height: (solid as Circle).radius * 2 };
  }
  return solidPolygonBounds(solid as Polygon);
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

function circleInConvexPolygon(circle: Circle, poly: Polygon): boolean {
  let minDistSq = Infinity;
  for (let i = 0; i < poly.points.length; i++) {
    const j = (i + 1) % poly.points.length;
    const ax = poly.points[i].x, ay = poly.points[i].y;
    const bx = poly.points[j].x, by = poly.points[j].y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = ((circle.x - ax) * dx + (circle.y - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    const ex = circle.x - px, ey = circle.y - py;
    const dSq = ex * ex + ey * ey;
    if (dSq < minDistSq) minDistSq = dSq;
  }
  return minDistSq <= circle.radius * circle.radius;
}

function convexPolygonsIntersect(a: Polygon, b: Polygon): boolean {
  const axes = getAxes(a).concat(getAxes(b));
  for (const axis of axes) {
    const projA = projectPolygon(a, axis);
    const projB = projectPolygon(b, axis);
    if (projA.max < projB.min || projB.max < projA.min) {
      return false;
    }
  }
  return true;
}

function getAxes(poly: Polygon): { x: number; y: number }[] {
  const axes: { x: number; y: number }[] = [];
  for (let i = 0; i < poly.points.length; i++) {
    const j = (i + 1) % poly.points.length;
    const ex = poly.points[j].x - poly.points[i].x;
    const ey = poly.points[j].y - poly.points[i].y;
    const len = Math.sqrt(ex * ex + ey * ey);
    if (len === 0) continue;
    axes.push({ x: -ey / len, y: ex / len });
  }
  return axes;
}

function projectPolygon(poly: Polygon, axis: { x: number; y: number }): { min: number; max: number } {
  let min = Infinity, max = -Infinity;
  for (const p of poly.points) {
    const dot = p.x * axis.x + p.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

export type RaycastHit = {
  entityId: string;
  point: Vector2;
  distance: number;
  normal: Vector2;
  colliderType: "AabbCollider" | "CircleCollider" | "PolygonCollider";
};

function intersectRayAabb(
  origin: Vector2,
  dir: Vector2,
  aabb: Aabb,
): { point: Vector2; distance: number; normal: Vector2 } | null {
  const invDirX = dir.x === 0 ? Infinity : 1 / dir.x;
  const invDirY = dir.y === 0 ? Infinity : 1 / dir.y;

  const t1 = (aabb.x - origin.x) * invDirX;
  const t2 = (aabb.x + aabb.width - origin.x) * invDirX;
  const t3 = (aabb.y - origin.y) * invDirY;
  const t4 = (aabb.y + aabb.height - origin.y) * invDirY;

  const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
  const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

  if (tMax < tMin || tMax < 0) return null;

  const t = tMin >= 0 ? tMin : tMax;
  const point = { x: origin.x + dir.x * t, y: origin.y + dir.y * t };

  const cx = aabb.x + aabb.width / 2;
  const cy = aabb.y + aabb.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const halfW = aabb.width / 2;
  const halfH = aabb.height / 2;
  const overlapX = halfW - Math.abs(dx);
  const overlapY = halfH - Math.abs(dy);
  const normal = overlapX < overlapY
    ? { x: Math.sign(dx), y: 0 }
    : { x: 0, y: Math.sign(dy) };

  return { point, distance: t, normal };
}

function intersectRayCircle(
  origin: Vector2,
  dir: Vector2,
  circle: Circle,
): { point: Vector2; distance: number; normal: Vector2 } | null {
  const cx = origin.x - circle.x;
  const cy = origin.y - circle.y;
  const a = dir.x * dir.x + dir.y * dir.y;
  const b = 2 * (cx * dir.x + cy * dir.y);
  const c = cx * cx + cy * cy - circle.radius * circle.radius;

  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;

  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  let t = t1 >= 0 ? t1 : t2;
  if (t < 0) return null;

  const point = { x: origin.x + dir.x * t, y: origin.y + dir.y * t };
  const nx = (point.x - circle.x) / circle.radius;
  const ny = (point.y - circle.y) / circle.radius;

  return { point, distance: t, normal: { x: nx, y: ny } };
}

function intersectRayPolygon(
  origin: Vector2,
  dir: Vector2,
  polygon: Polygon,
): { point: Vector2; distance: number; normal: Vector2 } | null {
  const pts = polygon.points;
  let minT = Infinity;
  let bestNormal: Vector2 = { x: 0, y: 0 };

  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const ax = pts[i].x, ay = pts[i].y;
    const bx = pts[j].x, by = pts[j].y;
    const ex = bx - ax, ey = by - ay;

    const denom = dir.x * ey - dir.y * ex;
    if (Math.abs(denom) < 1e-10) continue;

    const t = ((ax - origin.x) * ey - (ay - origin.y) * ex) / denom;
    const u = ((ax - origin.x) * dir.y - (ay - origin.y) * dir.x) / denom;

    if (t >= 0 && u >= 0 && u <= 1 && t < minT) {
      minT = t;
      const len = Math.sqrt(ex * ex + ey * ey);
      bestNormal = { x: ey / len, y: -ex / len };
    }
  }

  if (minT === Infinity) return null;

  const point = { x: origin.x + dir.x * minT, y: origin.y + dir.y * minT };
  return { point, distance: minT, normal: bestNormal };
}

export function raycast(
  origin: Vector2,
  direction: Vector2,
  entities: GameKitEntity[],
  options?: { maxDistance?: number; mask?: number; includeNonStatic?: boolean },
): RaycastHit | null {
  const maxDist = options?.maxDistance ?? Infinity;
  const mask = options?.mask;
  const includeNonStatic = options?.includeNonStatic ?? false;
  const dirLen = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (dirLen === 0) return null;
  const dir = { x: direction.x / dirLen, y: direction.y / dirLen };

  let closest: RaycastHit | null = null;
  let closestDist = maxDist;

  for (const entity of entities) {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    if (!transform) continue;

    const aabbComp = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    const circleComp = findComponent<CircleColliderComponent>(entity, "CircleCollider");
    const polyComp = findComponent<PolygonColliderComponent>(entity, "PolygonCollider");
    const rb = findComponent<RigidBodyComponent>(entity, "RigidBody");

    if (!aabbComp && !circleComp && !polyComp) continue;
    if (!includeNonStatic && aabbComp && !aabbComp.isStatic) continue;
    if (!includeNonStatic && circleComp && !circleComp.isStatic) continue;
    if (!includeNonStatic && polyComp && !polyComp.isStatic) continue;

    const effectiveMask = mask ?? aabbComp?.mask ?? circleComp?.mask ?? polyComp?.mask;
    const layer = aabbComp?.layer ?? circleComp?.layer ?? polyComp?.layer ?? 1;
    if (effectiveMask !== undefined && (effectiveMask & layer) === 0) continue;

    if (rb && rb.isKinematic) continue;

    if (aabbComp) {
      const aabb = getEntityAabb(entity);
      if (aabb) {
        const hit = intersectRayAabb(origin, dir, aabb);
        if (hit && hit.distance < closestDist) {
          closestDist = hit.distance;
          closest = { ...hit, entityId: entity.id, colliderType: "AabbCollider" };
        }
      }
    }

    if (circleComp) {
      const circle = getEntityCircle(entity);
      if (circle) {
        const hit = intersectRayCircle(origin, dir, circle);
        if (hit && hit.distance < closestDist) {
          closestDist = hit.distance;
          closest = { ...hit, entityId: entity.id, colliderType: "CircleCollider" };
        }
      }
    }

    if (polyComp) {
      const polygon = getEntityPolygon(entity);
      if (polygon) {
        const hit = intersectRayPolygon(origin, dir, polygon);
        if (hit && hit.distance < closestDist) {
          closestDist = hit.distance;
          closest = { ...hit, entityId: entity.id, colliderType: "PolygonCollider" };
        }
      }
    }
  }

  return closest;
}