import type { AudioSourceComponent, GameKitEntity } from "@gamekit/schema";

export type ResolvedAudioSource = {
  entityId: string;
  assetId: string;
  volume: number;
  loop: boolean;
  playOnStart: boolean;
  url?: string;
};

export type AudioController = {
  sources: ResolvedAudioSource[];
  play: (entityId: string) => void;
  stop: (entityId: string) => void;
  stopAll: () => void;
  dispose: () => void;
};

type AssetResolver = (assetId: string) => string | undefined;

/**
 * Lightweight audio controller for AudioSource components.
 * Uses HTMLAudioElement when available (web / editor preview).
 * On React Native without a DOM Audio API, methods no-op safely.
 */
export function createAudioController(
  entities: GameKitEntity[],
  resolveAssetUrl: AssetResolver,
): AudioController {
  const sources: ResolvedAudioSource[] = [];
  const players = new Map<string, HTMLAudioElement>();

  for (const entity of entities) {
    const audio = entity.components.find(
      (c): c is AudioSourceComponent => c.type === "AudioSource",
    );
    if (!audio) continue;
    sources.push({
      entityId: entity.id,
      assetId: audio.assetId,
      volume: audio.volume,
      loop: audio.loop,
      playOnStart: audio.playOnStart,
      url: resolveAssetUrl(audio.assetId),
    });
  }

  function getPlayer(source: ResolvedAudioSource): HTMLAudioElement | null {
    if (typeof Audio === "undefined") return null;
    let player = players.get(source.entityId);
    if (!player) {
      if (!source.url) return null;
      player = new Audio(source.url);
      player.loop = source.loop;
      player.volume = Math.max(0, Math.min(1, source.volume));
      players.set(source.entityId, player);
    }
    return player;
  }

  const controller: AudioController = {
    sources,
    play(entityId: string) {
      const source = sources.find((s) => s.entityId === entityId);
      if (!source) return;
      const player = getPlayer(source);
      if (!player) return;
      void player.play().catch(() => {
        // Autoplay policies may block — ignore
      });
    },
    stop(entityId: string) {
      const player = players.get(entityId);
      if (!player) return;
      player.pause();
      player.currentTime = 0;
    },
    stopAll() {
      for (const player of players.values()) {
        player.pause();
        player.currentTime = 0;
      }
    },
    dispose() {
      controller.stopAll();
      players.clear();
      sources.length = 0;
    },
  };

  for (const source of sources) {
    if (source.playOnStart) {
      controller.play(source.entityId);
    }
  }

  return controller;
}

export function collectAudioSources(entities: GameKitEntity[]): AudioSourceComponent[] {
  const list: AudioSourceComponent[] = [];
  for (const entity of entities) {
    for (const comp of entity.components) {
      if (comp.type === "AudioSource") list.push(comp);
    }
  }
  return list;
}
