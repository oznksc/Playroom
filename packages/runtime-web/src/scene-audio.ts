import Phaser from "phaser";
import type { AudioSourceComponent, GameKitEntity } from "@gamekit/schema";
import { findComponent } from "./scene-helpers.js";

export type SceneSoundMap = Map<string, Phaser.Sound.BaseSound>;

export function setupSceneAudio(
  scene: Phaser.Scene,
  entities: GameKitEntity[],
  sounds: SceneSoundMap,
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
