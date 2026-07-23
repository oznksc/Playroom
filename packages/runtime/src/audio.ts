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
  /** Play by asset id (used by Script playSound action). */
  playAsset?: (assetId: string) => void;
  stop: (entityId: string) => void;
  stopAll: () => void;
  dispose: () => void;
};

type AssetResolver = (assetId: string) => string | undefined;

type BackendPlayer = {
  play: () => void | Promise<void>;
  stop: () => void;
  dispose: () => void;
};

/** Optional expo-av module shape (loaded dynamically on React Native). */
type ExpoAvModule = {
  Audio: {
    Sound: {
      createAsync: (
        source: { uri: string },
        initialStatus?: { volume?: number; isLooping?: boolean; shouldPlay?: boolean },
      ) => Promise<{ sound: { playAsync: () => Promise<unknown>; stopAsync: () => Promise<unknown>; unloadAsync: () => Promise<unknown>; setIsLoopingAsync: (v: boolean) => Promise<unknown>; setVolumeAsync: (v: number) => Promise<unknown> } }>;
    };
    setAudioModeAsync?: (mode: Record<string, unknown>) => Promise<void>;
  };
};

let expoAvModule: ExpoAvModule | null | undefined;

function tryLoadExpoAv(): ExpoAvModule | null {
  if (expoAvModule !== undefined) return expoAvModule;
  try {
    // Optional peer — present in Expo apps, absent on pure web/editor.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = (typeof require !== "undefined" ? require("expo-av") : null) as ExpoAvModule | null;
    expoAvModule = mod?.Audio ? mod : null;
  } catch {
    expoAvModule = null;
  }
  return expoAvModule;
}

function hasDomAudio(): boolean {
  return typeof Audio !== "undefined";
}

function createDomPlayer(url: string, volume: number, loop: boolean): BackendPlayer {
  const player = new Audio(url);
  player.loop = loop;
  player.volume = Math.max(0, Math.min(1, volume));
  return {
    play() {
      player.currentTime = 0;
      void player.play().catch(() => {
        // Autoplay policies may block — ignore
      });
    },
    stop() {
      player.pause();
      player.currentTime = 0;
    },
    dispose() {
      player.pause();
      player.src = "";
    },
  };
}

function createExpoPlayer(url: string, volume: number, loop: boolean): BackendPlayer {
  const expo = tryLoadExpoAv();
  let sound: {
    playAsync: () => Promise<unknown>;
    stopAsync: () => Promise<unknown>;
    unloadAsync: () => Promise<unknown>;
  } | null = null;
  let loading: Promise<void> | null = null;
  let wantPlay = false;

  const ensure = () => {
    if (!expo) return Promise.resolve();
    if (sound) return Promise.resolve();
    if (loading) return loading;
    loading = (async () => {
      try {
        await expo.Audio.setAudioModeAsync?.({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const result = await expo.Audio.Sound.createAsync(
          { uri: url },
          { volume: Math.max(0, Math.min(1, volume)), isLooping: loop, shouldPlay: false },
        );
        sound = result.sound;
        if (wantPlay) {
          await sound.playAsync();
        }
      } catch {
        sound = null;
      } finally {
        loading = null;
      }
    })();
    return loading;
  };

  return {
    play() {
      wantPlay = true;
      if (sound) {
        void sound.playAsync().catch(() => undefined);
        return;
      }
      void ensure();
    },
    stop() {
      wantPlay = false;
      if (sound) {
        void sound.stopAsync().catch(() => undefined);
      }
    },
    dispose() {
      wantPlay = false;
      if (sound) {
        void sound.unloadAsync().catch(() => undefined);
        sound = null;
      }
    },
  };
}

function createBackendPlayer(url: string, volume: number, loop: boolean): BackendPlayer | null {
  // Prefer DOM Audio on web/editor; expo-av on React Native (no DOM Audio).
  if (hasDomAudio()) {
    return createDomPlayer(url, volume, loop);
  }
  if (tryLoadExpoAv()) {
    return createExpoPlayer(url, volume, loop);
  }
  return null;
}

/**
 * Audio controller for AudioSource components.
 * - Web / editor: HTMLAudioElement
 * - React Native (Expo): expo-av when installed as a peer dependency
 * - Otherwise: safe no-op
 */
export function createAudioController(
  entities: GameKitEntity[],
  resolveAssetUrl: AssetResolver,
): AudioController {
  const sources: ResolvedAudioSource[] = [];
  const players = new Map<string, BackendPlayer>();
  const assetPlayers = new Map<string, BackendPlayer>();

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

  function getPlayer(source: ResolvedAudioSource): BackendPlayer | null {
    let player = players.get(source.entityId);
    if (!player) {
      if (!source.url) return null;
      player = createBackendPlayer(source.url, source.volume, source.loop) ?? undefined;
      if (!player) return null;
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
      player?.play();
    },
    playAsset(assetId: string) {
      let player = assetPlayers.get(assetId);
      if (!player) {
        const url = resolveAssetUrl(assetId);
        if (!url) return;
        player = createBackendPlayer(url, 1, false) ?? undefined;
        if (!player) return;
        assetPlayers.set(assetId, player);
      }
      player.play();
    },
    stop(entityId: string) {
      players.get(entityId)?.stop();
    },
    stopAll() {
      for (const player of players.values()) player.stop();
      for (const player of assetPlayers.values()) player.stop();
    },
    dispose() {
      controller.stopAll();
      for (const player of players.values()) player.dispose();
      for (const player of assetPlayers.values()) player.dispose();
      players.clear();
      assetPlayers.clear();
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
