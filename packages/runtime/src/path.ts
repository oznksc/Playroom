import type { FollowPathComponent, TransformComponent } from "@gamekit/schema";

export function updateFollowPath(
  followPath: FollowPathComponent,
  transform: TransformComponent,
  dt: number
): void {
  if (followPath.points.length === 0 || followPath.speed <= 0) return;

  if (followPath.currentPointIndex === undefined) followPath.currentPointIndex = 0;
  if (followPath.targetPointIndex === undefined) {
    followPath.targetPointIndex = (followPath.currentPointIndex + 1) % followPath.points.length;
  }

  const target = followPath.points[followPath.targetPointIndex];
  if (!target) return;

  const dx = target.x - transform.position.x;
  const dy = target.y - transform.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const step = followPath.speed * dt;

  if (distance <= step) {
    // Reached the waypoint target
    transform.position.x = target.x;
    transform.position.y = target.y;
    followPath.currentPointIndex = followPath.targetPointIndex;

    const nextIndex = followPath.targetPointIndex + 1;
    if (nextIndex < followPath.points.length) {
      followPath.targetPointIndex = nextIndex;
    } else {
      if (followPath.loop) {
        followPath.targetPointIndex = 0;
      } else {
        // Stop moving when path is complete and loop is disabled
        followPath.targetPointIndex = followPath.currentPointIndex;
      }
    }
  } else {
    // Normal step towards waypoint
    transform.position.x += (dx / distance) * step;
    transform.position.y += (dy / distance) * step;
  }
}
