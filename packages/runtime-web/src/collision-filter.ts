import type { GameKitEntity } from "@gamekit/schema";

/**
 * Layer/mask semantics shared with the Skia runtime.
 *
 * - Solid collision is one-directional: a dynamic body collides with a static
 *   solid only when the dynamic body's `mask` includes the solid's `layer`
 *   (the solid's own mask is not consulted).
 * - Trigger overlap is two-directional: both the trigger's `mask` must include
 *   the other body's `layer` and the other body's `mask` must include the
 *   trigger's `layer`.
 *
 * Defaults match Skia: `layer: 1`, `mask: 0xffffffff`.
 */

export type ColliderFilter = { layer: number; mask: number };

export function colliderLayerMask(entity: GameKitEntity): ColliderFilter {
  const collider = entity.components.find(
    (c) => c.type === "AabbCollider" || c.type === "CircleCollider" || c.type === "PolygonCollider"
  ) as { layer?: number; mask?: number } | undefined;
  return { layer: collider?.layer ?? 1, mask: collider?.mask ?? 0xffffffff };
}

export function solidCollides(dynamicMask: number, staticLayer: number): boolean {
  return (dynamicMask & staticLayer) !== 0;
}

export function triggerOverlaps(player: ColliderFilter, trigger: ColliderFilter): boolean {
  return (trigger.mask & player.layer) !== 0 && (player.mask & trigger.layer) !== 0;
}
