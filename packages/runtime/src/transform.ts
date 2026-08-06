import type { Transforms3d } from "@shopify/react-native-skia";
import type { TransformComponent } from "@gamekit/schema";

/**
 * Rotation/scale around a pivot point. The entity Transform position is the
 * pivot — matching Phaser, where the game object's position is its origin and
 * rotation/scale happen around it.
 */
export function pivotTransform(transform: TransformComponent, px: number, py: number): Transforms3d {
  const t: Transforms3d = [{ translateX: px }, { translateY: py }];
  const rotation = transform.rotation ?? 0;
  if (rotation !== 0) t.push({ rotate: (rotation * Math.PI) / 180 });
  const sx = transform.scale?.x ?? 1;
  const sy = transform.scale?.y ?? 1;
  if (sx !== 1 || sy !== 1) {
    t.push({ scaleX: sx });
    t.push({ scaleY: sy });
  }
  t.push({ translateX: -px }, { translateY: -py });
  return t;
}
