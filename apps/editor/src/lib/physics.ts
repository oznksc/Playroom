import type { GameKitScene, TransformComponent, Vector2 } from "@gamekit/schema";

/**
 * Integrate velocity (units/sec) over dt to produce a frame displacement vector.
 * Collision solvers expect displacement rather than raw velocity.
 */
export function displacementFromVelocity(velocity: Vector2, dt: number): Vector2 {
  return { x: velocity.x * dt, y: velocity.y * dt };
}

/** Invert displacement back to velocity. Returns zero velocity when dt is zero. */
export function velocityFromDisplacement(displacement: Vector2, dt: number): Vector2 {
  if (dt <= 0) return { x: 0, y: 0 };
  return { x: displacement.x / dt, y: displacement.y / dt };
}

/**
 * Compute the world AABB that encloses all entity sprites in the scene.
 * Used by the play-mode camera clamp to prevent scrolling past content.
 */
export function computeSceneWorldBounds(
  scene: GameKitScene,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = 0;
  let minY = 0;
  let maxX = scene.viewport.width;
  let maxY = scene.viewport.height;

  for (const entity of scene.entities) {
    const t = entity.components.find(
      (c): c is TransformComponent => c.type === "Transform",
    );
    if (!t) continue;
    const sprite = entity.components.find((c) => c.type === "Sprite") as
      | { width?: number; height?: number }
      | undefined;
    const halfW = (sprite?.width ?? 64) / 2;
    const halfH = (sprite?.height ?? 64) / 2;
    minX = Math.min(minX, t.position.x - halfW);
    minY = Math.min(minY, t.position.y - halfH);
    maxX = Math.max(maxX, t.position.x + halfW);
    maxY = Math.max(maxY, t.position.y + halfH);
  }

  // Add padding so the camera shows a little beyond content
  return {
    minX: minX - 32,
    minY: Math.min(0, minY - 32),
    maxX: maxX + 64,
    maxY: maxY + 64,
  };
}

/**
 * Clamp a play-mode camera position so it never scrolls beyond the world bounds.
 */
export function clampPlayCamera(
  cam: Vector2,
  scene: GameKitScene,
  world: { minX: number; minY: number; maxX: number; maxY: number },
): Vector2 {
  const vw = scene.viewport.width;
  const vh = scene.viewport.height;
  const worldW = Math.max(vw, world.maxX - world.minX);
  const worldH = Math.max(vh, world.maxY - world.minY);
  const maxPanX = world.minX + Math.max(0, worldW - vw);
  const maxPanY = world.minY + Math.max(0, worldH - vh);
  return {
    x: Math.min(maxPanX, Math.max(world.minX, cam.x)),
    y: Math.min(maxPanY, Math.max(world.minY, cam.y)),
  };
}
