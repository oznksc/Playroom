import type { GameKitAsset } from "@gamekit/schema";
import { useEffect, useRef, useState } from "react";
import { playWebAudioSfx } from "../lib/client-asset-generator.js";
import { getApiUrl } from "../lib/api.js";

interface UseAssetStudioAudioOptions {
  isAgentStreaming: boolean;
  onAssetCreated?: (asset: GameKitAsset) => void;
}

const IDLE_VISUAL_BARS = [
  12, 18, 14, 22, 16, 28, 20, 15, 24, 18, 12, 20, 16, 22, 14, 10, 18, 12, 16, 14,
];

export function useAssetStudioAudio({
  isAgentStreaming,
  onAssetCreated,
}: UseAssetStudioAudioOptions) {
  const [sfxId, setSfxId] = useState("sfx-laser");
  const [sfxPreset, setSfxPreset] = useState("laser");
  const [sfxVolume, setSfxVolume] = useState(0.8);
  const [isSynthesizingSfx, setIsSynthesizingSfx] = useState(false);
  const [musicId, setMusicId] = useState("bgm-cyberpunk_pulse");
  const [musicPreset, setMusicPreset] = useState("cyberpunk_pulse");
  const [musicBpm, setMusicBpm] = useState(120);
  const [musicDuration, setMusicDuration] = useState(8);
  const [musicKey, setMusicKey] = useState("F");
  const [musicScale, setMusicScale] = useState("minor");
  const [isPlayingMusicPreview, setIsPlayingMusicPreview] = useState(false);
  const [isSynthesizingMusic, setIsSynthesizingMusic] = useState(false);
  const [musicAudioUrl, setMusicAudioUrl] = useState<string | null>(null);
  const [audioVisualBars, setAudioVisualBars] = useState<number[]>(IDLE_VISUAL_BARS);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    let animationId: number | undefined;
    if (isPlayingMusicPreview || isSynthesizingSfx || isSynthesizingMusic || isAgentStreaming) {
      const updateBars = () => {
        setAudioVisualBars(Array.from({ length: 20 }, () => Math.floor(8 + Math.random() * 64)));
        animationId = requestAnimationFrame(updateBars);
      };
      animationId = requestAnimationFrame(updateBars);
    } else {
      setAudioVisualBars(IDLE_VISUAL_BARS);
    }
    return () => {
      if (animationId !== undefined) cancelAnimationFrame(animationId);
    };
  }, [isPlayingMusicPreview, isSynthesizingSfx, isSynthesizingMusic, isAgentStreaming]);

  async function playSfxPreset(presetName: string) {
    setSfxPreset(presetName);
    const chosenId = `sfx-${presetName}`;
    setSfxId(chosenId);
    setIsSynthesizingSfx(true);

    try {
      const response = await fetch(getApiUrl("/api/assets/generate/sfx"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chosenId, preset: presetName, volume: sfxVolume }),
      });
      if (response.ok) {
        const data = (await response.json()) as { asset: GameKitAsset };
        onAssetCreated?.(data.asset);
        const sound = new Audio(getApiUrl(`/gamekit/assets/${data.asset.file}`));
        sound.volume = sfxVolume;
        await sound.play().catch(() => playWebAudioSfx(presetName, sfxVolume));
        return;
      }
    } catch {
      // Fall back to local Web Audio when the editor backend is unavailable.
    } finally {
      setIsSynthesizingSfx(false);
    }

    playWebAudioSfx(presetName, sfxVolume);
  }

  async function generateMusic(presetName?: string, autoPlay = true) {
    const preset = presetName || musicPreset;
    const chosenId = `bgm-${preset}`;
    setMusicId(chosenId);
    setIsSynthesizingMusic(true);

    try {
      const response = await fetch(getApiUrl("/api/assets/generate/music"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chosenId,
          preset,
          bpm: musicBpm,
          durationSec: musicDuration,
          key: musicKey,
          scale: musicScale,
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { asset: GameKitAsset };
      const fileUrl = getApiUrl(`/gamekit/assets/${data.asset.file}`);
      setMusicAudioUrl(fileUrl);
      onAssetCreated?.(data.asset);

      if (autoPlay && audioRef.current) {
        audioRef.current.src = fileUrl;
        audioRef.current.loop = true;
        await audioRef.current.play().catch(() => undefined);
        setIsPlayingMusicPreview(true);
      }
    } catch {
      // The music generator has no client-side fallback.
    } finally {
      setIsSynthesizingMusic(false);
    }
  }

  function toggleMusicPlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlayingMusicPreview) {
      audio.pause();
      setIsPlayingMusicPreview(false);
      return;
    }
    if (!musicAudioUrl) {
      void generateMusic(musicPreset, true);
      return;
    }
    audio.src = musicAudioUrl;
    audio.loop = true;
    void audio.play();
    setIsPlayingMusicPreview(true);
  }

  return {
    sfxId,
    sfxPreset,
    sfxVolume,
    setSfxVolume,
    isSynthesizingSfx,
    musicId,
    musicPreset,
    setMusicPreset,
    musicBpm,
    setMusicBpm,
    musicDuration,
    setMusicDuration,
    musicKey,
    setMusicKey,
    musicScale,
    setMusicScale,
    isPlayingMusicPreview,
    isSynthesizingMusic,
    audioVisualBars,
    playSfxPreset,
    generateMusic,
    toggleMusicPlay,
  };
}
