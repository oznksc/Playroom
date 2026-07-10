import type { TweenComponent, TransformComponent } from "@gamekit/schema";

export function updateTween(
  tween: TweenComponent,
  transform: TransformComponent,
  dt: number
): void {
  if (tween.active === false) return;

  if (tween.elapsed === undefined) tween.elapsed = 0;
  tween.elapsed += dt;

  let progress = tween.elapsed / tween.duration;
  let finished = false;

  if (progress >= 1) {
    progress = 1;
    finished = true;
  }

  // Easing calculations
  let t = progress;
  switch (tween.easing) {
    case "easeIn":
      t = progress * progress;
      break;
    case "easeOut":
      t = progress * (2 - progress);
      break;
    case "easeInOut":
      t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      break;
    case "linear":
    default:
      t = progress;
      break;
  }

  // Interpolation
  const val = tween.startValue + (tween.endValue - tween.startValue) * t;

  // Apply target property
  switch (tween.property) {
    case "position.x":
      transform.position.x = val;
      break;
    case "position.y":
      transform.position.y = val;
      break;
    case "rotation":
      transform.rotation = val;
      break;
    case "scale.x":
      transform.scale.x = val;
      break;
    case "scale.y":
      transform.scale.y = val;
      break;
  }

  if (finished) {
    if (tween.loop) {
      if (tween.pingPong) {
        // Swap start & end values
        const temp = tween.startValue;
        tween.startValue = tween.endValue;
        tween.endValue = temp;
      }
      tween.elapsed = 0;
    } else {
      tween.active = false;
    }
  }
}
