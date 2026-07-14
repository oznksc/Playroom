import type { GameKitEntity, GameKitScene, TransformComponent } from "@gamekit/schema";

export function findComponent<T extends { type: string }>(
  entity: GameKitEntity,
  type: T["type"],
): T | undefined {
  return entity.components.find((component) => component.type === type) as T | undefined;
}

export function computeWorldBounds(scene: GameKitScene): { width: number; height: number } {
  let maxX = scene.viewport.width;
  let maxY = scene.viewport.height;

  for (const entity of scene.entities) {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    if (!transform) continue;
    const sprite = findComponent<{ type: "Sprite"; width: number; height: number }>(entity, "Sprite");
    const collider = findComponent<{ type: "AabbCollider"; size: { x: number; y: number } }>(entity, "AabbCollider");
    const halfW = sprite ? sprite.width / 2 : collider ? collider.size.x / 2 : 0;
    const halfH = sprite ? sprite.height / 2 : collider ? collider.size.y / 2 : 0;
    maxX = Math.max(maxX, transform.position.x + halfW + 64);
    maxY = Math.max(maxY, transform.position.y + halfH + 64);
  }

  return {
    width: Math.max(scene.viewport.width, Math.ceil(maxX)),
    height: Math.max(scene.viewport.height, Math.ceil(maxY)),
  };
}
