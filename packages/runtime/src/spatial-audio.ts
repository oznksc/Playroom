import type { GameKitEntity, TransformComponent } from "@gamekit/schema";

export type SpatialAudioListener = {
  x: number;
  y: number;
};

export type SpatialAudioSource = {
  x: number;
  y: number;
  minDistance: number;
  maxDistance: number;
};

export type SpatialAudioResult = {
  /** Volume attenuation from distance, 0..1. 1 when at/below minDistance. */
  gain: number;
  /** Stereo pan, -1 (left) .. 1 (right). */
  pan: number;
};

export const DEFAULT_MIN_DISTANCE = 0;
export const DEFAULT_MAX_DISTANCE = 1000;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Shared spatial audio model used by both runtimes.
 * - Gain: linear rolloff from full volume (at/below `minDistance`) to silent (at/above `maxDistance`).
 * - Pan: signed, proportional to the horizontal offset, so sources to the right of the listener
 *   are panned right. Ranges -1..1 across the full `maxDistance`.
 */
export function computeSpatialAudio(
  listener: SpatialAudioListener,
  source: SpatialAudioSource
): SpatialAudioResult {
  const dx = source.x - listener.x;
  const dy = source.y - listener.y;
  const distance = Math.hypot(dx, dy);

  const minDistance = Math.max(0, source.minDistance);
  const maxDistance = Math.max(source.maxDistance, minDistance + 0.0001);

  let gain: number;
  if (distance <= minDistance) {
    gain = 1;
  } else if (distance >= maxDistance) {
    gain = 0;
  } else {
    gain = 1 - (distance - minDistance) / (maxDistance - minDistance);
  }

  const pan = clamp(dx / maxDistance, -1, 1);

  return { gain, pan };
}

/** Position of the first enabled AudioListener entity, if any. */
export function findAudioListenerPosition(entities: GameKitEntity[]): SpatialAudioListener | null {
  for (const entity of entities) {
    const listener = entity.components.find((c) => c.type === "AudioListener");
    if (!listener || listener.enabled === false) continue;
    const transform = entity.components.find(
      (c): c is TransformComponent => c.type === "Transform"
    );
    if (!transform) continue;
    return { x: transform.position.x, y: transform.position.y };
  }
  return null;
}
