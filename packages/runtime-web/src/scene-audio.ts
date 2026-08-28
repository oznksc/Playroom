import Phaser from "phaser";
import type { AudioSourceComponent, GameKitEntity, TransformComponent } from "@gamekit/schema";
import {
  computeSpatialAudio,
  findAudioListenerPosition,
  DEFAULT_MAX_DISTANCE,
  DEFAULT_MIN_DISTANCE,
  type SpatialAudioListener,
} from "@gamekit/runtime/spatial-audio";
import { findComponent } from "./scene-helpers.js";

export type SceneSoundMap = Map<string, Phaser.Sound.BaseSound>;

export function setupSceneAudio(
  scene: Phaser.Scene,
  entities: GameKitEntity[],
  sounds: SceneSoundMap
): void {
  for (const entity of entities) {
    const audio = findComponent<AudioSourceComponent>(entity, "AudioSource");
    if (!audio || !scene.cache.audio.exists(audio.assetId)) continue;

    const sound = scene.sound.add(audio.assetId, {
      loop: audio.loop,
      volume: Phaser.Math.Clamp(audio.volume, 0, 1),
    });
    sounds.set(entity.id, sound);
    if (audio.playOnStart) sound.play();
  }

  const stop = () => stopSceneAudio(sounds);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
  scene.events.once(Phaser.Scenes.Events.DESTROY, stop);
}

export function playSceneSound(sounds: SceneSoundMap, entityId: string): void {
  const sound = sounds.get(entityId);
  if (sound && !sound.isPlaying) sound.play();
}

export function stopSceneSound(sounds: SceneSoundMap, entityId: string): void {
  sounds.get(entityId)?.stop();
}

export function stopSceneAudio(sounds: SceneSoundMap): void {
  for (const sound of sounds.values()) sound.stop();
}

/**
 * Apply per-frame spatial audio: distance-based gain + stereo pan for each
 * playing source relative to the scene's AudioListener entity. Falls back to
 * authored volume (centered) when no listener exists.
 */
export function updateSceneAudio(
  scene: Phaser.Scene,
  entities: GameKitEntity[],
  sounds: SceneSoundMap
): void {
  const listener = findAudioListenerPosition(entities);
  for (const entity of entities) {
    const audio = findComponent<AudioSourceComponent>(entity, "AudioSource");
    if (!audio) continue;
    const sound = sounds.get(entity.id);
    if (!sound || !sound.isPlaying) continue;

    let volume = Phaser.Math.Clamp(audio.volume, 0, 1);
    let pan = 0;
    if (listener) {
      const transform = findComponent<TransformComponent>(entity, "Transform");
      if (transform) {
        const result = computeSpatialAudio(listener, {
          x: transform.position.x,
          y: transform.position.y,
          minDistance: audio.minDistance ?? DEFAULT_MIN_DISTANCE,
          maxDistance: audio.maxDistance ?? DEFAULT_MAX_DISTANCE,
        });
        volume *= result.gain;
        pan = result.pan;
      }
    }
    (sound as Phaser.Sound.WebAudioSound).setVolume(volume);
    if (typeof (sound as Phaser.Sound.WebAudioSound).setPan === "function") {
      (sound as Phaser.Sound.WebAudioSound).setPan(pan);
    }
  }
}

export type { SpatialAudioListener };
