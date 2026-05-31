import type { Vector2 } from "@gamekit/schema";

export type CameraState = {
  position: Vector2;
  zoom: number;
};

export function createCameraFollow(options: {
  viewport: Vector2;
  smoothing?: number;
  initial?: CameraState;
}) {
  const smoothing = options.smoothing ?? 0.18;
  const state: CameraState = options.initial ?? {
    position: { x: 0, y: 0 },
    zoom: 1
  };

  return {
    state,
    update(target: Vector2): CameraState {
      const desired = {
        x: target.x - options.viewport.x / 2,
        y: target.y - options.viewport.y / 2
      };

      state.position.x = lerp(state.position.x, desired.x, smoothing);
      state.position.y = lerp(state.position.y, desired.y, smoothing);
      return state;
    }
  };
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * clamp01(amount);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
