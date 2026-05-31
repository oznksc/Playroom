import type {
  AabbColliderComponent,
  GameKitAsset,
  GameKitEntity,
  GameKitScene,
  SpriteComponent,
  TransformComponent
} from "@gamekit/schema";
import { findComponent, colorForAsset } from "./components.js";

export function drawScene(
  context: CanvasRenderingContext2D,
  scene: GameKitScene,
  assets: GameKitAsset[],
  images: Map<string, HTMLImageElement>,
  selectedEntityIds: Set<string>,
  showGrid = true,
  showColliders = true
) {
  context.clearRect(0, 0, scene.viewport.width, scene.viewport.height);
  context.fillStyle = scene.viewport.background;
  context.fillRect(0, 0, scene.viewport.width, scene.viewport.height);
  
  if (showGrid) {
    drawGrid(context, scene.viewport.width, scene.viewport.height);
  }

  for (const entity of scene.entities) {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    const sprite = findComponent<SpriteComponent>(entity, "Sprite");
    const collider = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    if (!transform) {
      continue;
    }

    if (sprite) {
      const image = images.get(sprite.assetId);
      const x = transform.position.x - sprite.width * sprite.anchor.x;
      const y = transform.position.y - sprite.height * sprite.anchor.y;
      if (image) {
        context.drawImage(image, x, y, sprite.width, sprite.height);
      } else {
        context.fillStyle = colorForAsset(sprite.assetId, assets);
        context.fillRect(x, y, sprite.width, sprite.height);
      }
    }

    if (collider && showColliders) {
      const isSelected = selectedEntityIds.has(entity.id);
      context.strokeStyle = isSelected ? "#ffb300" : collider.isStatic ? "#10b981" : "#00f0ff";
      context.lineWidth = isSelected ? 2 : 1;
      context.setLineDash(isSelected ? [] : [4, 4]);
      context.strokeRect(
        transform.position.x + collider.offset.x,
        transform.position.y + collider.offset.y,
        collider.size.x,
        collider.size.y
      );
      context.setLineDash([]);
    }
  }

  for (const id of selectedEntityIds) {
    const entity = scene.entities.find((e) => e.id === id);
    const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
    if (transform) {
      context.fillStyle = "#ffb300";
      context.beginPath();
      context.arc(transform.position.x, transform.position.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number) {
  context.strokeStyle = "rgba(255, 255, 255, 0.04)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

export function hitEntity(entity: GameKitEntity, point: { x: number; y: number }): boolean {
  const transform = findComponent<TransformComponent>(entity, "Transform");
  const sprite = findComponent<SpriteComponent>(entity, "Sprite");
  const collider = findComponent<AabbColliderComponent>(entity, "AabbCollider");
  if (!transform) {
    return false;
  }
  const box = collider
    ? {
        x: transform.position.x + collider.offset.x,
        y: transform.position.y + collider.offset.y,
        width: collider.size.x,
        height: collider.size.y
      }
    : sprite
      ? {
          x: transform.position.x - sprite.width * sprite.anchor.x,
          y: transform.position.y - sprite.height * sprite.anchor.y,
          width: sprite.width,
          height: sprite.height
        }
      : undefined;

  return !!box &&
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height;
}
