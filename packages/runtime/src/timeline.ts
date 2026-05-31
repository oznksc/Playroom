import type { GameKitScene, Keyframe, TimelineTrack } from "@gamekit/schema";

export type TimelineState = {
  elapsed: number;
  playing: boolean;
};

export function playTimeline(
  scene: GameKitScene,
  state: TimelineState,
  dt: number
): void {
  if (!state.playing || scene.timeline.tracks.length === 0) return;

  const duration = scene.timeline.duration;
  state.elapsed += dt;

  if (duration > 0 && state.elapsed >= duration) {
    if (scene.timeline.loop) {
      state.elapsed %= duration;
    } else {
      state.elapsed = duration;
      state.playing = false;
    }
  }

  for (const track of scene.timeline.tracks) {
    if (track.keyframes.length === 0) continue;
    const entity = scene.entities.find((e) => e.id === track.entityId);
    if (!entity) continue;

    const value = sampleTrack(track, state.elapsed);
    applyTrackValue(entity, track.property, value);
  }
}

export function sampleTrack(track: TimelineTrack, time: number): number {
  if (track.keyframes.length === 0) return 0;
  if (time <= track.keyframes[0].time) return asNumber(track.keyframes[0].value);

  for (let i = 0; i < track.keyframes.length - 1; i++) {
    const a = track.keyframes[i];
    const b = track.keyframes[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      const eased = applyEasing(t, a.easing ?? "linear");
      return lerp(asNumber(a.value), asNumber(b.value), eased);
    }
  }

  return asNumber(track.keyframes[track.keyframes.length - 1].value);
}

function applyEasing(t: number, easing: Keyframe["easing"]): number {
  switch (easing) {
    case "easeIn": return t * t;
    case "easeOut": return 1 - (1 - t) * (1 - t);
    case "easeInOut": return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default: return t;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function asNumber(value: number | number[]): number {
  return typeof value === "number" ? value : value[0] ?? 0;
}

function applyTrackValue(
  entity: GameKitScene["entities"][0],
  property: TimelineTrack["property"],
  value: number
): void {
  const transform = entity.components.find((c) => c.type === "Transform");
  if (!transform) return;

  switch (property) {
    case "position.x": transform.position.x = value; break;
    case "position.y": transform.position.y = value; break;
    case "rotation": transform.rotation = value; break;
    case "scale.x": transform.scale.x = value; break;
    case "scale.y": transform.scale.y = value; break;
  }
}
