import type {
  GameKitComponent,
  GameKitEntity,
  GameKitScene,
  TransformComponent,
} from "@gamekit/schema";

export type EntityBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  anchorX: number;
  anchorY: number;
};

export type EntitySummary = {
  id: string;
  name: string;
  tags: string[];
  components: string[];
  position: { x: number; y: number } | null;
  bounds: EntityBounds | null;
};

export function getTransform(entity: GameKitEntity): TransformComponent | undefined {
  return entity.components.find((c): c is TransformComponent => c.type === "Transform");
}

export function getEntityBounds(entity: GameKitEntity): EntityBounds | null {
  const transform = getTransform(entity);
  if (!transform) return null;

  let width = 1;
  let height = 1;
  let anchorX = 0.5;
  let anchorY = 0.5;

  for (const comp of entity.components) {
    if (comp.type === "Sprite") {
      width = comp.width;
      height = comp.height;
      anchorX = comp.anchor?.x ?? 0.5;
      anchorY = comp.anchor?.y ?? 0.5;
      break;
    }
    if (comp.type === "NineSlice") {
      width = comp.width;
      height = comp.height;
      break;
    }
    if (comp.type === "AabbCollider") {
      width = comp.size.x;
      height = comp.size.y;
    }
    if (comp.type === "CircleCollider") {
      width = comp.radius * 2;
      height = comp.radius * 2;
    }
    if (comp.type === "Tilemap") {
      width = comp.tileWidth * comp.gridWidth;
      height = comp.tileHeight * comp.gridHeight;
      anchorX = 0;
      anchorY = 0;
    }
  }

  const minX = transform.position.x - width * anchorX;
  const minY = transform.position.y - height * anchorY;
  return {
    x: transform.position.x,
    y: transform.position.y,
    width,
    height,
    minX,
    minY,
    maxX: minX + width,
    maxY: minY + height,
    anchorX,
    anchorY,
  };
}

export function setPositionFromMin(entity: GameKitEntity, minX: number, minY: number): void {
  const transform = getTransform(entity);
  const bounds = getEntityBounds(entity);
  if (!transform || !bounds) return;
  transform.position = {
    x: minX + bounds.width * bounds.anchorX,
    y: minY + bounds.height * bounds.anchorY,
  };
}

export function aabbOverlap(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

export function boundsOverlap(a: EntityBounds, b: EntityBounds): boolean {
  return aabbOverlap(a, b);
}

export function summarizeEntity(entity: GameKitEntity): EntitySummary {
  return {
    id: entity.id,
    name: entity.name,
    tags: entity.tags ?? [],
    components: entity.components.map((c) => c.type),
    position: getTransform(entity)?.position ?? null,
    bounds: getEntityBounds(entity),
  };
}

export function summarizeComponent(comp: GameKitComponent): Record<string, unknown> {
  switch (comp.type) {
    case "Transform":
      return {
        type: comp.type,
        position: comp.position,
        rotation: comp.rotation,
        scale: comp.scale,
      };
    case "Sprite":
      return { type: comp.type, assetId: comp.assetId, width: comp.width, height: comp.height };
    case "AabbCollider":
      return {
        type: comp.type,
        size: comp.size,
        isStatic: comp.isStatic,
        isTrigger: comp.isTrigger ?? false,
      };
    case "CircleCollider":
      return {
        type: comp.type,
        radius: comp.radius,
        isStatic: comp.isStatic,
        isTrigger: comp.isTrigger,
      };
    case "PolygonCollider":
      return { type: comp.type, points: comp.points.length, isStatic: comp.isStatic };
    case "PlayerController":
      return {
        type: comp.type,
        speed: comp.speed,
        jumpVelocity: comp.jumpVelocity,
        gravity: comp.gravity,
      };
    case "CameraFollow":
      return { type: comp.type, targetId: comp.targetId, smoothing: comp.smoothing };
    case "RigidBody":
      return { type: comp.type, mass: comp.mass, isKinematic: comp.isKinematic };
    case "Text":
      return { type: comp.type, text: comp.text, size: comp.size };
    case "Animation":
      return { type: comp.type, assetId: comp.assetId, totalFrames: comp.totalFrames };
    default:
      return { type: comp.type };
  }
}

export function isOffScreen(
  bounds: EntityBounds,
  viewport: { width: number; height: number }
): boolean {
  return (
    bounds.maxX < 0 ||
    bounds.maxY < 0 ||
    bounds.minX > viewport.width ||
    bounds.minY > viewport.height
  );
}

export function findEntity(scene: GameKitScene, entityId: string): GameKitEntity | undefined {
  return scene.entities.find((e) => e.id === entityId);
}
