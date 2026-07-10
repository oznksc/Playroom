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
  entityId?: string;
};

export type CollisionEvent = {
  entityId: string;
  otherEntityId: string;
};

export type CollisionState = Set<string>;

export type TriggerEvent = {
  type: "enter" | "exit";
  triggerEntityId: string;
  otherEntityId: string;
};

export type TriggerState = Set<string>;

export function updateCollisionEvents(
  contacts: CollisionEvent[],
  previous: CollisionState = new Set(),
): { active: CollisionState; events: CollisionEvent[] } {
  const active: CollisionState = new Set();
  const events: CollisionEvent[] = [];

  for (const contact of contacts) {
    const key = collisionPairKey(contact.entityId, contact.otherEntityId);
    active.add(key);
    if (!previous.has(key)) events.push(contact);
  }

  return { active, events };
}

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
  return convexPolygonsIntersect(poly, aabbToPolygon(aabb));
}

export function intersectsPolygonCircle(poly: Polygon, circle: Circle): boolean {
  return polygonCircleCollision(poly, circle) !== null;
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
  solid: CollisionSolid,
  _velocityX: number,
  _velocityY: number
): { x: number; y: number } {
  const collision = polygonSolidCollision(polygon, solid);
  if (!collision) return { x: polygon.x, y: polygon.y };
  return {
    x: polygon.x + collision.normal.x * collision.depth,
    y: polygon.y + collision.normal.y * collision.depth,
  };
}

export function applyPolygonCollisions(
  polygon: Polygon,
  velocity: Vector2,
  solids: CollisionSolid[],
  mask?: number
): { position: Vector2; velocity: Vector2; grounded: boolean; collisionEntityIds: string[] } {
  const next: Polygon = {
    x: polygon.x + velocity.x,
    y: polygon.y + velocity.y,
    points: polygon.points.map((point) => ({
      x: point.x + velocity.x,
      y: point.y + velocity.y,
    })),
  };
  const nextVelocity = { ...velocity };
  let grounded = false;
  const collisionEntityIds = new Set<string>();

  const effectiveSolids = mask !== undefined
    ? solids.filter((solid) => (mask & solid.layer) !== 0)
    : solids;

  for (const solid of effectiveSolids) {
    const collision = polygonSolidCollision(next, solid);
    if (!collision) continue;
    if (solid.entityId) collisionEntityIds.add(solid.entityId);

    const correctionX = collision.normal.x * collision.depth;
    const correctionY = collision.normal.y * collision.depth;
    next.x += correctionX;
    next.y += correctionY;
    for (const point of next.points) {
      point.x += correctionX;
      point.y += correctionY;
    }

    const velocityIntoSurface = nextVelocity.x * collision.normal.x + nextVelocity.y * collision.normal.y;
    if (velocityIntoSurface < 0) {
      nextVelocity.x -= velocityIntoSurface * collision.normal.x;
      nextVelocity.y -= velocityIntoSurface * collision.normal.y;
    }
    if (collision.normal.y < -0.5) grounded = true;
  }

  return { position: { x: next.x, y: next.y }, velocity: nextVelocity, grounded, collisionEntityIds: [...collisionEntityIds] };
}

export function solidAabb(solid: CollisionSolid): Aabb {
  if ("width" in solid) return solid as Aabb;
  if ("radius" in solid) {
    return { x: solid.x - (solid as Circle).radius, y: solid.y - (solid as Circle).radius, width: (solid as Circle).radius * 2, height: (solid as Circle).radius * 2 };
  }
  return solidPolygonBounds(solid as Polygon);
}

export function updateTriggerEvents(
  entities: GameKitEntity[],
  previous: TriggerState = new Set(),
): { active: TriggerState; events: TriggerEvent[] } {
  const colliders = entities.flatMap((entity) => {
    const collider = getEntityCollider(entity);
    return collider ? [{ entityId: entity.id, ...collider }] : [];
  });
  const active: TriggerState = new Set();
  const events: TriggerEvent[] = [];

  for (const trigger of colliders) {
    if (!trigger.isTrigger) continue;
    for (const other of colliders) {
      if (other.entityId === trigger.entityId) continue;
      if ((trigger.mask & other.layer) === 0 || (other.mask & trigger.layer) === 0) continue;
      if (!colliderShapesIntersect(trigger.shape, other.shape)) continue;

      const key = triggerPairKey(trigger.entityId, other.entityId);
      active.add(key);
      if (!previous.has(key)) {
        events.push({ type: "enter", triggerEntityId: trigger.entityId, otherEntityId: other.entityId });
      }
    }
  }

  for (const key of previous) {
    if (active.has(key)) continue;
    const [triggerEntityId, otherEntityId] = key.split("\0");
    events.push({ type: "exit", triggerEntityId, otherEntityId });
  }

  return { active, events };
}

type ColliderShape = Aabb | Circle | Polygon;

function getEntityCollider(entity: GameKitEntity): {
  shape: ColliderShape;
  isTrigger: boolean;
  layer: number;
  mask: number;
} | null {
  const aabb = findComponent<AabbColliderComponent>(entity, "AabbCollider");
  if (aabb) {
    const shape = getEntityAabb(entity);
    return shape ? { shape, isTrigger: aabb.isTrigger ?? false, layer: aabb.layer ?? 1, mask: aabb.mask ?? 0xffffffff } : null;
  }
  const circle = findComponent<CircleColliderComponent>(entity, "CircleCollider");
  if (circle) {
    const shape = getEntityCircle(entity);
    return shape ? { shape, isTrigger: circle.isTrigger ?? false, layer: circle.layer ?? 1, mask: circle.mask ?? 0xffffffff } : null;
  }
  const polygon = findComponent<PolygonColliderComponent>(entity, "PolygonCollider");
  if (polygon) {
    const shape = getEntityPolygon(entity);
    return shape ? { shape, isTrigger: polygon.isTrigger ?? false, layer: polygon.layer ?? 1, mask: polygon.mask ?? 0xffffffff } : null;
  }
  return null;
}

function colliderShapesIntersect(a: ColliderShape, b: ColliderShape): boolean {
  if ("points" in a) {
    if ("points" in b) return intersectsPolygonPolygon(a, b);
    if ("radius" in b) return intersectsPolygonCircle(a, b);
    return intersectsPolygonAabb(a, b);
  }
  if ("radius" in a) {
    if ("points" in b) return intersectsPolygonCircle(b, a);
    if ("radius" in b) return intersectsCircleCircle(a, b);
    return intersectsCircleAabb(a, b);
  }
  if ("points" in b) return intersectsPolygonAabb(b, a);
  if ("radius" in b) return intersectsCircleAabb(b, a);
  return intersectsAabb(a, b);
}

function triggerPairKey(triggerEntityId: string, otherEntityId: string): string {
  return `${triggerEntityId}\0${otherEntityId}`;
}

function collisionPairKey(entityId: string, otherEntityId: string): string {
  return [entityId, otherEntityId].sort().join("\0");
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
): { position: Vector2; velocity: Vector2; grounded: boolean; collisionEntityIds: string[] } {
  const next = { ...circle };
  const nextVelocity = { ...velocity };
  let grounded = false;
  const collisionEntityIds = new Set<string>();

  const effectiveSolids = mask !== undefined
    ? solids.filter((s) => (mask & s.layer) !== 0)
    : solids;

  next.x += velocity.x;
  for (const solid of effectiveSolids) {
    if (circleVsSolid(next, solid)) {
      if (solid.entityId) collisionEntityIds.add(solid.entityId);
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
      if (solid.entityId) collisionEntityIds.add(solid.entityId);
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
    collisionEntityIds: [...collisionEntityIds],
  };
}

export function applyAabbCollisions(
  moving: Aabb,
  velocity: Vector2,
  solids: CollisionSolid[],
  mask?: number
): { position: Vector2; velocity: Vector2; grounded: boolean; collisionEntityIds: string[] } {
  const next = { ...moving };
  const nextVelocity = { ...velocity };
  let grounded = false;
  const collisionEntityIds = new Set<string>();

  const effectiveSolids = mask !== undefined
    ? solids.filter((s) => (mask & s.layer) !== 0)
    : solids;

  next.x += velocity.x;
  for (const solid of effectiveSolids) {
    const solidBox = solidAabb(solid);
    if (intersectsAabb(next, solidBox)) {
      if (solid.entityId) collisionEntityIds.add(solid.entityId);
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
      if (solid.entityId) collisionEntityIds.add(solid.entityId);
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
    grounded,
    collisionEntityIds: [...collisionEntityIds],
  };
}

function findComponent<T>(entity: GameKitEntity, type: T extends { type: infer Name } ? Name : never): T | undefined {
  return entity.components.find((component) => component.type === type) as T | undefined;
}

function convexPolygonsIntersect(a: Polygon, b: Polygon): boolean {
  return polygonPolygonCollision(a, b) !== null;
}

type PolygonCollision = { normal: Vector2; depth: number };

function polygonSolidCollision(polygon: Polygon, solid: CollisionSolid): PolygonCollision | null {
  if ("width" in solid) return polygonPolygonCollision(polygon, aabbToPolygon(solid as Aabb));
  if ("radius" in solid) return polygonCircleCollision(polygon, solid as Circle);
  return polygonPolygonCollision(polygon, solid as Polygon);
}

function polygonPolygonCollision(a: Polygon, b: Polygon): PolygonCollision | null {
  return collisionOnAxes(a, b, getAxes(a).concat(getAxes(b)));
}

function polygonCircleCollision(polygon: Polygon, circle: Circle): PolygonCollision | null {
  let closest = polygon.points[0];
  let closestDistanceSq = Infinity;
  for (const point of polygon.points) {
    const dx = circle.x - point.x;
    const dy = circle.y - point.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < closestDistanceSq) {
      closest = point;
      closestDistanceSq = distanceSq;
    }
  }

  const axes = getAxes(polygon);
  const dx = circle.x - closest.x;
  const dy = circle.y - closest.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length > 0) axes.push({ x: dx / length, y: dy / length });

  let smallestOverlap = Infinity;
  let smallestAxis: Vector2 | null = null;
  for (const axis of axes) {
    const polyProjection = projectPolygon(polygon, axis);
    const circleCenter = circle.x * axis.x + circle.y * axis.y;
    const circleProjection = { min: circleCenter - circle.radius, max: circleCenter + circle.radius };
    const overlap = projectionOverlap(polyProjection, circleProjection);
    if (overlap <= 0) return null;
    if (overlap < smallestOverlap) {
      smallestOverlap = overlap;
      smallestAxis = axis;
    }
  }

  if (!smallestAxis) return null;
  return orientCollision(smallestAxis, smallestOverlap, polygonCenter(polygon), { x: circle.x, y: circle.y });
}

function collisionOnAxes(a: Polygon, b: Polygon, axes: Vector2[]): PolygonCollision | null {
  let smallestOverlap = Infinity;
  let smallestAxis: Vector2 | null = null;
  for (const axis of axes) {
    const overlap = projectionOverlap(projectPolygon(a, axis), projectPolygon(b, axis));
    if (overlap <= 0) return null;
    if (overlap < smallestOverlap) {
      smallestOverlap = overlap;
      smallestAxis = axis;
    }
  }
  if (!smallestAxis) return null;
  return orientCollision(smallestAxis, smallestOverlap, polygonCenter(a), polygonCenter(b));
}

function projectionOverlap(a: { min: number; max: number }, b: { min: number; max: number }): number {
  return Math.min(a.max, b.max) - Math.max(a.min, b.min);
}

function orientCollision(axis: Vector2, depth: number, movingCenter: Vector2, solidCenter: Vector2): PolygonCollision {
  const towardSolidX = solidCenter.x - movingCenter.x;
  const towardSolidY = solidCenter.y - movingCenter.y;
  const pointsTowardSolid = towardSolidX * axis.x + towardSolidY * axis.y > 0;
  return {
    normal: pointsTowardSolid ? { x: -axis.x, y: -axis.y } : axis,
    depth,
  };
}

function polygonCenter(polygon: Polygon): Vector2 {
  const total = polygon.points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return { x: total.x / polygon.points.length, y: total.y / polygon.points.length };
}

function aabbToPolygon(aabb: Aabb): Polygon {
  return {
    x: aabb.x + aabb.width / 2,
    y: aabb.y + aabb.height / 2,
    points: [
      { x: aabb.x, y: aabb.y },
      { x: aabb.x + aabb.width, y: aabb.y },
      { x: aabb.x + aabb.width, y: aabb.y + aabb.height },
      { x: aabb.x, y: aabb.y + aabb.height },
    ],
  };
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
