import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Music,
  Image as ImageIcon,
  Film,
  Plus,
  Download,
  Wand2,
  Square,
  Zap,
  Flame,
  Shield,
  Heart,
  Skull,
  Coins,
  Crosshair,
  Footprints,
  Wind,
  Maximize2,
  Sliders,
  X,
  ChevronRight,
  ChevronLeft,
  Grid,
  ZoomIn,
  ZoomOut,
  Radio,
  RefreshCw,
  Lightbulb,
  Send,
  Bot,
  Target,
  CheckCircle2,
  Disc,
} from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  Select,
  Field,
  Badge,
  cn,
} from "@/ui";
import { getApiUrl } from "../lib/api.js";
import { useAgent } from "../hooks/useAgent.js";
import { useAgentKeys } from "../hooks/useAgentKeys.js";
import { AgentMessage } from "./AgentMessage.js";
import { AgentToolTrace } from "./AgentToolTrace.js";
import {
  parseAiPrompt,
  enhanceAiPrompt,
  generateAiVariationSet,
  renderClientSprite,
  renderClientSpritesheet,
  playWebAudioSfx,
  PALETTES,
  type PaletteName,
  type SpriteCategory,
  type AnimationAction,
  type AiSpriteVariation,
} from "../lib/client-asset-generator.js";
import type { GameKitAsset } from "@gamekit/schema";

type StudioMode = "sheet" | "expanded" | "fullscreen";
type StudioTab = "copilot" | "sprites" | "animated" | "sfx" | "music";

type AssetStudioModalProps = {
  isOpen: boolean;
  embedded?: boolean;
  onClose: () => void;
  onAssetCreated?: (asset: GameKitAsset) => void;
  onSpawnEntityWithSprite?: (assetId: string, width: number, height: number, category?: string) => void;
  onSpawnEntityWithAnimation?: (
    assetId: string,
    frameWidth: number,
    frameHeight: number,
    totalFrames: number,
    fps: number
  ) => void;
  onAttachAudioToEntity?: (assetId: string, isBgm?: boolean) => void;
  selectedEntityId?: string | null;
  activeSceneId?: string;
};

type PinpointSuggestion = {
  id: string;
  title: string;
  desc: string;
  tag: string;
  icon: typeof Sparkles;
  prompt: string;
  kind: "sprite" | "spritesheet" | "sfx" | "music";
};

const PINPOINT_SUGGESTIONS: PinpointSuggestion[] = [
  {
    id: "hero-character",
    title: "Spawn Animated Player Hero",
    desc: "4-frame walk & weapon slash cycle with collider and physics",
    tag: "Character Pack",
    icon: Sparkles,
    prompt: "Generate an animated 4-frame cyberpunk knight hero walk spritesheet (32x32) with a weapon slash cycle, then spawn it as a player entity with collider in the scene.",
    kind: "spritesheet",
  },
  {
    id: "slime-enemy",
    title: "Spawn Bouncing Slime Enemy",
    desc: "Radioactive green slime monster with hurt & death animations",
    tag: "Enemy Pack",
    icon: Skull,
    prompt: "Generate a radioactive emerald bouncing slime monster enemy with 4-frame squashing animation cycle, add collider and spawn in the active scene.",
    kind: "spritesheet",
  },
  {
    id: "essential-sfx",
    title: "Synthesize Essential 8-Bit SFX Pack",
    desc: "Jump sweep, Gem pickup chime, Laser blast, and Impact hit",
    tag: "Audio Kit",
    icon: Volume2,
    prompt: "Generate a full set of retro sound effects: jump sweep (sfx-jump), coin pickup chime (sfx-coin), laser blaster (sfx-laser), and explosion rumble (sfx-explosion).",
    kind: "sfx",
  },
  {
    id: "adventure-bgm",
    title: "Compose 130 BPM Overworld Theme",
    desc: "Upbeat loopable chiptune adventure soundtrack in C Major",
    tag: "Music & BGM",
    icon: Music,
    prompt: "Synthesize a loopable 130 BPM Chiptune Adventure soundtrack in C Major with lead synth, bassline, and 8-bit drums.",
    kind: "music",
  },
  {
    id: "collectible-gems",
    title: "Create Legendary Astral Gems Pack",
    desc: "Glowing gold coin, diamond gem, and heart container sprites",
    tag: "Items & Props",
    icon: Coins,
    prompt: "Generate 3 collectible item sprites: golden coin (32x32), sapphire diamond gem (32x32), and celestial heart container (32x32) with Cyberpunk neon palette.",
    kind: "sprite",
  },
];

const SFX_BUTTON_PRESETS = [
  { id: "jump", label: "Jump", icon: Footprints, desc: "Classic 8-bit pitch rise" },
  { id: "coin", label: "Coin / Gem", icon: Coins, desc: "Bright shimmering pickup" },
  { id: "laser", label: "Laser Gun", icon: Zap, desc: "Fast pew-pew pitch drop" },
  { id: "explosion", label: "Explosion", icon: Flame, desc: "Low rumble noise blast" },
  { id: "hit", label: "Hit Impact", icon: Shield, desc: "Punchy damage strike" },
  { id: "powerup", label: "Powerup", icon: Sparkles, desc: "Ascending victory chime" },
  { id: "hurt", label: "Hurt Grunt", icon: Heart, desc: "Damage grunt with noise" },
  { id: "ui_click", label: "UI Click", icon: Square, desc: "Crisp UI button tap" },
  { id: "defeat", label: "Defeat", icon: Skull, desc: "Sad descending slide" },
  { id: "victory", label: "Victory", icon: Sparkles, desc: "Triumphant fanfare" },
  { id: "whoosh", label: "Whoosh", icon: Wind, desc: "Air sweep transition" },
  { id: "teleport", label: "Teleport", icon: Crosshair, desc: "Sci-fi frequency warble" },
];

const MUSIC_GENRE_PRESETS = [
  { id: "chiptune_adventure", label: "Chiptune Adventure", bpm: 130, scale: "major", key: "C", desc: "Upbeat 8-bit overworld melody" },
  { id: "boss_battle", label: "Boss Battle", bpm: 145, scale: "harmonic_minor", key: "D", desc: "Tense, aggressive combat pace" },
  { id: "chill_dungeon", label: "Chill Dungeon", bpm: 92, scale: "dorian", key: "E", desc: "Mysterious ambient cave loop" },
  { id: "cyberpunk_pulse", label: "Cyberpunk Pulse", bpm: 120, scale: "minor", key: "F", desc: "Driving synthwave bassline" },
  { id: "retro_menu", label: "Retro Menu Theme", bpm: 110, scale: "major", key: "G", desc: "Catchy friendly title theme" },
  { id: "victory_fanfare", label: "Victory Fanfare", bpm: 125, scale: "major", key: "C", desc: "Celebratory brass flourish" },
  { id: "spooky_night", label: "Spooky Night", bpm: 96, scale: "minor", key: "A", desc: "Eerie suspenseful atmosphere" },
];

const PALETTE_OPTIONS: { value: PaletteName; label: string }[] = [
  { value: "pico8", label: "PICO-8 (16 Retro Colors)" },
  { value: "gameboy", label: "Game Boy (4 Green Tones)" },
  { value: "cyberpunk", label: "Cyberpunk (Neon Cyan & Violet)" },
  { value: "nes", label: "NES (8-bit Classic)" },
  { value: "pastel", label: "Pastel Fantasy" },
  { value: "monochrome", label: "Monochrome (Ink & Paper)" },
];

export function AssetStudioModal({
  isOpen,
  embedded = false,
  onClose,
  onAssetCreated,
  onSpawnEntityWithSprite,
  onSpawnEntityWithAnimation,
  onAttachAudioToEntity,
  selectedEntityId: _,
  activeSceneId,
}: AssetStudioModalProps) {
  const [studioMode, setStudioMode] = useState<StudioMode>("expanded");
  const [activeTab, setActiveTab] = useState<StudioTab>("copilot");

  // --- Shared Agent Hooks & Settings (Identical to AgentPanel) ---
  const { keys, sessionKey } = useAgentKeys();
  const [activeProvider] = useState(() => localStorage.getItem("gamekit:agent:activeProvider") || "");
  const [activeModel] = useState(() => localStorage.getItem("gamekit:agent:activeModel") || "");
  const resolvedProvider = activeProvider || (keys.length > 0 ? keys[0].provider : "anthropic");
  const activeKeyEntry = keys.find((k) => k.provider === resolvedProvider) || keys[0] || null;
  const resolvedModel =
    activeModel || activeKeyEntry?.model || (resolvedProvider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "claude-sonnet-4-5");

  // Dedicated Agent instance for Asset Studio
  const {
    messages,
    toolCalls,
    isStreaming,
    sendMessage,
    abort,
  } = useAgent(
    activeSceneId || "main.scene.json",
    resolvedModel,
    resolvedProvider,
    "off",
    onAssetCreated ? () => onAssetCreated({ id: "agent-asset", file: "agent-asset.png", kind: "image" }) : undefined,
    false,
    sessionKey(resolvedProvider),
    activeKeyEntry?.baseUrl
  );

  // --- AI Prompt Engine ---
  const [aiPrompt, setAiPrompt] = useState("cyberpunk armored knight with neon cyan blade, glowing visor");
  const [isSynthesizingAi, setIsSynthesizingAi] = useState(false);

  // --- AI 4-Variation Grid State ---
  const [variations, setVariations] = useState<AiSpriteVariation[]>([]);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<number>(0);

  // --- Stage Viewport Controls ---
  const [zoomLevel, setZoomLevel] = useState<number>(3);
  const [showGrid, setShowGrid] = useState(false);

  // --- Parameters State ---
  const [spriteId, setSpriteId] = useState("hero-cyber-knight");
  const [spriteCategory, setSpriteCategory] = useState<SpriteCategory>("character");
  const [spriteArchetype, setSpriteArchetype] = useState("knight");
  const [spritePalette, setSpritePalette] = useState<PaletteName>("cyberpunk");
  const [spriteSize, setSpriteSize] = useState(32);

  // --- Spritesheet Animation State ---
  const [sheetId, setSheetId] = useState("hero-walk");
  const [sheetAnimation, setSheetAnimation] = useState<AnimationAction>("walk");
  const [sheetFrames, setSheetFrames] = useState(4);
  const [sheetFrameSize, setSheetFrameSize] = useState(32);
  const [sheetFps, setSheetFps] = useState(8);
  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);
  const [isPlayingSheetAnim, setIsPlayingSheetAnim] = useState(true);
  const [sheetCurrentFrame, setSheetCurrentFrame] = useState(0);

  // --- SFX State ---
  const [sfxId, setSfxId] = useState("sfx-laser");
  const [sfxPreset, setSfxPreset] = useState("laser");
  const [sfxVolume, setSfxVolume] = useState(0.8);
  const [isSynthesizingSfx, setIsSynthesizingSfx] = useState(false);

  // --- Music & BGM State ---
  const [musicId, setMusicId] = useState("bgm-cyberpunk_pulse");
  const [musicPreset, setMusicPreset] = useState("cyberpunk_pulse");
  const [musicBpm, setMusicBpm] = useState(120);
  const [musicDuration, setMusicDuration] = useState(8);
  const [musicKey, setMusicKey] = useState("F");
  const [musicScale, setMusicScale] = useState("minor");
  const [isPlayingMusicPreview, setIsPlayingMusicPreview] = useState(false);
  const [musicAudioUrl, setMusicAudioUrl] = useState<string | null>(null);
  const [audioVisualBars, setAudioVisualBars] = useState<number[]>([12, 24, 18, 30, 42, 28, 14, 36, 48, 20]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasAnimRef = useRef<HTMLCanvasElement | null>(null);
  const sheetImageRef = useRef<HTMLImageElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll agent message container
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, isStreaming]);

  // Initial Seed
  useEffect(() => {
    if (isOpen && variations.length === 0) {
      const analysis = parseAiPrompt(aiPrompt);
      setSpriteCategory(analysis.category);
      setSpriteArchetype(analysis.archetype);
      setSpritePalette(analysis.palette);
      setSheetAnimation(analysis.animationAction);
      setVariations(generateAiVariationSet(aiPrompt, analysis.category, analysis.palette, spriteSize));
      setSelectedVariationIndex(0);
    }
  }, [isOpen]);

  // Spritesheet animation loop
  useEffect(() => {
    if (!sheetPreviewUrl) return;

    const img = new Image();
    img.src = sheetPreviewUrl;
    img.onload = () => {
      sheetImageRef.current = img;
    };

    let intervalId: any;
    if (isPlayingSheetAnim) {
      intervalId = setInterval(() => {
        setSheetCurrentFrame((prev) => (prev + 1) % sheetFrames);
      }, 1000 / Math.max(1, sheetFps));
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [sheetPreviewUrl, sheetFrames, sheetFps, isPlayingSheetAnim]);

  // Canvas Stage Drawing
  useEffect(() => {
    const canvas = canvasAnimRef.current;
    const img = sheetImageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pw = 8;
    for (let y = 0; y < canvas.height; y += pw) {
      for (let x = 0; x < canvas.width; x += pw) {
        ctx.fillStyle = (Math.floor(x / pw) + Math.floor(y / pw)) % 2 === 0 ? "#0c111c" : "#131a29";
        ctx.fillRect(x, y, pw, pw);
      }
    }

    const sx = sheetCurrentFrame * sheetFrameSize;
    const sy = 0;
    const sWidth = sheetFrameSize;
    const sHeight = sheetFrameSize;

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  }, [sheetCurrentFrame, sheetFrameSize, sheetPreviewUrl]);

  // Audio wave visualizer effect
  useEffect(() => {
    let animId: number;
    if (isPlayingMusicPreview || isSynthesizingSfx || isStreaming) {
      const updateBars = () => {
        setAudioVisualBars(
          Array.from({ length: 20 }, () => Math.floor(8 + Math.random() * 64))
        );
        animId = requestAnimationFrame(updateBars);
      };
      animId = requestAnimationFrame(updateBars);
    } else {
      setAudioVisualBars([12, 18, 14, 22, 16, 28, 20, 15, 24, 18, 12, 20, 16, 22, 14, 10, 18, 12, 16, 14]);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlayingMusicPreview, isSynthesizingSfx, isStreaming]);

  // ----------------------------------------------------
  // Generation & Agent Dispatch
  // ----------------------------------------------------

  async function handleGenerateWithAi(customPrompt?: string) {
    const p = customPrompt ?? aiPrompt;
    setIsSynthesizingAi(true);

    const analysis = parseAiPrompt(p);
    setSpriteCategory(analysis.category);
    setSpriteArchetype(analysis.archetype);
    setSpritePalette(analysis.palette);
    setSheetAnimation(analysis.animationAction);

    const baseName = `${analysis.category}-${analysis.archetype.replace(/[^a-z0-9]+/g, "-")}`;
    setSpriteId(baseName);
    setSheetId(`anim-${baseName}`);

    if (activeTab === "sprites" || activeTab === "copilot") {
      const variationSet = generateAiVariationSet(p, analysis.category, analysis.palette, spriteSize);
      setVariations(variationSet);
      setSelectedVariationIndex(0);

      // Attempt backend persistence
      try {
        const res = await fetch(getApiUrl("/api/assets/generate/sprite"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: baseName,
            category: analysis.category,
            archetype: analysis.archetype,
            palette: analysis.palette,
            size: spriteSize,
            prompt: p,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { asset: GameKitAsset };
          if (onAssetCreated) onAssetCreated(data.asset);
        }
      } catch {
        // Offline
      }
    } else if (activeTab === "animated") {
      const dataUrl = renderClientSpritesheet(
        analysis.archetype,
        analysis.animationAction,
        sheetFrames,
        sheetFrameSize,
        analysis.palette
      );
      setSheetPreviewUrl(dataUrl);
      setSheetCurrentFrame(0);
    } else if (activeTab === "sfx") {
      setSfxPreset(analysis.sfxPreset);
      playWebAudioSfx(analysis.sfxPreset, sfxVolume);
    } else if (activeTab === "music") {
      setMusicPreset(analysis.musicGenre);
      handleGenerateMusic(analysis.musicGenre, true);
    }

    setIsSynthesizingAi(false);
  }

  async function handleExecutePinpointSuggestion(suggestion: PinpointSuggestion) {
    setActiveTab("copilot");
    setAiPrompt(suggestion.prompt);
    await sendMessage(suggestion.prompt);
  }

  async function handlePlaySfxPreset(presetName: string) {
    setSfxPreset(presetName);
    const chosenId = `sfx-${presetName}`;
    setSfxId(chosenId);
    setIsSynthesizingSfx(true);

    try {
      const res = await fetch(getApiUrl("/api/assets/generate/sfx"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chosenId,
          preset: presetName,
          volume: sfxVolume,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { asset: GameKitAsset };
        if (onAssetCreated) onAssetCreated(data.asset);

        const audioUrl = getApiUrl(`/gamekit/assets/${data.asset.file}`);
        const sound = new Audio(audioUrl);
        sound.volume = sfxVolume;
        sound.play().catch(() => playWebAudioSfx(presetName, sfxVolume));
        setIsSynthesizingSfx(false);
        return;
      }
    } catch {
      // Backend offline — use Web Audio
    }

    playWebAudioSfx(presetName, sfxVolume);
    setIsSynthesizingSfx(false);
  }

  async function handleGenerateMusic(presetName?: string, autoPlay = true) {
    const p = presetName || musicPreset;
    const chosenId = `bgm-${p}`;
    setMusicId(chosenId);
    setIsSynthesizingAi(true);

    try {
      const res = await fetch(getApiUrl("/api/assets/generate/music"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chosenId,
          preset: p,
          bpm: musicBpm,
          durationSec: musicDuration,
          key: musicKey,
          scale: musicScale,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { asset: GameKitAsset };
        const fileUrl = getApiUrl(`/gamekit/assets/${data.asset.file}`);
        setMusicAudioUrl(fileUrl);
        if (onAssetCreated) onAssetCreated(data.asset);

        if (autoPlay && audioRef.current) {
          audioRef.current.src = fileUrl;
          audioRef.current.loop = true;
          audioRef.current.play().catch(() => {});
          setIsPlayingMusicPreview(true);
        }
      }
    } catch {
      // Offline
    } finally {
      setIsSynthesizingAi(false);
    }
  }

  function toggleMusicPlay() {
    if (!audioRef.current) return;
    if (isPlayingMusicPreview) {
      audioRef.current.pause();
      setIsPlayingMusicPreview(false);
    } else {
      if (musicAudioUrl) {
        audioRef.current.src = musicAudioUrl;
        audioRef.current.loop = true;
        audioRef.current.play().catch(() => {});
        setIsPlayingMusicPreview(true);
      } else {
        handleGenerateMusic(musicPreset, true);
      }
    }
  }

  function handleDownloadAsset(dataUrl: string | null, filename: string) {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const activeVariation = variations[selectedVariationIndex] || variations[0];

  if (!isOpen) return null;

  return (
    <div className={cn(embedded ? "asset-studio-embedded" : "asset-studio-scrim", isOpen && "open")}>
      <div
        className={cn(
          embedded ? "asset-studio-workspace" : "asset-studio-sheet",
          isOpen && "open",
          studioMode === "sheet" && "mode-sheet",
          studioMode === "expanded" && "mode-expanded",
          studioMode === "fullscreen" && "mode-fullscreen"
        )}
      >
        {/* Content-sheet chrome: the Studio is an extension of Content, not a separate surface. */}
        <div className={cn("asset-studio-internal-header bottom-sheet-header relative select-none !h-auto !min-h-12 !px-3 !pb-2 !pt-4", embedded && "hidden")}>
          {/* Drag Handle */}
          <div
            className="bottom-sheet-handle !top-2 flex items-center justify-center cursor-pointer"
            onClick={() =>
              setStudioMode((prev) => (prev === "sheet" ? "expanded" : prev === "expanded" ? "fullscreen" : "sheet"))
            }
            title="Toggle Studio Size"
          >
            <div className="asset-studio-handle" />
          </div>

          {/* Top Header Bar */}
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-black">
                <Target size={16} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="bottom-sheet-title !p-0">Asset Studio</h2>
                  <Badge variant="accent" className="text-[9px] uppercase font-mono px-1.5 py-0.5 tracking-wider bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                    Agent Powered • {resolvedProvider}
                  </Badge>
                </div>
                <span className="text-[11px] text-text-muted">
                  Generate and prepare assets for the current scene
                </span>
              </div>
            </div>

            {/* Sizing & Close */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] mr-2">
                <button
                  type="button"
                  onClick={() => setStudioMode("sheet")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] rounded-md font-medium transition-all flex items-center gap-1",
                    studioMode === "sheet"
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "text-text-muted hover:text-white"
                  )}
                  title="Compact Sheet Mode"
                >
                  <Sliders size={12} />
                  Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setStudioMode("expanded")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] rounded-md font-medium transition-all flex items-center gap-1",
                    studioMode === "expanded"
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "text-text-muted hover:text-white"
                  )}
                  title="Studio Mode"
                >
                  <Maximize2 size={12} />
                  Studio
                </button>
                <button
                  type="button"
                  onClick={() => setStudioMode("fullscreen")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] rounded-md font-medium transition-all flex items-center gap-1",
                    studioMode === "fullscreen"
                      ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                      : "text-text-muted hover:text-white"
                  )}
                  title="Fullscreen Workstation (F)"
                >
                  <Radio size={12} />
                  Full
                </button>
              </div>

              <IconButton
                size="sm"
                variant="ghost"
                onClick={onClose}
                title="Close Studio (Esc)"
                className="hover:bg-white/[0.1] text-text-muted hover:text-white"
              >
                <X size={16} />
              </IconButton>
            </div>
          </div>

          {/* ── Pinpoint Spot-on Suggestions Carousel Bar ── */}
          <div className="w-full pt-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 shrink-0 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-2 py-1 rounded-lg">
                <Target size={12} /> Pinpoint Suggestions:
              </span>
              {PINPOINT_SUGGESTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleExecutePinpointSuggestion(item)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 hover:border-cyan-500/40 border border-white/[0.08] transition-all shrink-0 text-left group"
                  >
                    <Icon size={13} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-white group-hover:text-cyan-300 leading-tight">
                        {item.title}
                      </span>
                      <span className="text-[9px] text-text-muted">{item.tag}</span>
                    </div>
                    <Badge variant="accent" className="text-[8px] font-mono px-1 py-0 ml-1">
                      1-Click
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 3-Zone Workspace Layout ── */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-transparent">
          {/* ZONE 1: Navigation Rail */}
          <nav className="w-56 border-r border-white/[0.06] bg-black/30 p-3 flex flex-col justify-between shrink-0 select-none">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted px-2 mb-1">
                Studio Stations
              </span>

              <button
                type="button"
                onClick={() => setActiveTab("copilot")}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left active:scale-[0.98]",
                  activeTab === "copilot"
                    ? "bg-gradient-to-r from-cyan-500/25 to-violet-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-transform duration-150",
                    activeTab === "copilot" ? "bg-cyan-500 text-black font-bold scale-105" : "bg-white/[0.06] text-cyan-400"
                  )}
                >
                  <Bot size={13} />
                </div>
                <span>AI Asset Copilot</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("sprites");
                  handleGenerateWithAi();
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left active:scale-[0.98]",
                  activeTab === "sprites"
                    ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/10 text-blue-300 border border-blue-500/30"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-transform duration-150",
                  activeTab === "sprites" ? "bg-blue-500 text-black font-bold scale-105" : "bg-white/[0.06] text-blue-400"
                )}>
                  <ImageIcon size={13} />
                </div>
                <span>Sprites & Props Matrix</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("animated");
                  handleGenerateWithAi();
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left active:scale-[0.98]",
                  activeTab === "animated"
                    ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-violet-300 border border-violet-500/30"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-transform duration-150",
                  activeTab === "animated" ? "bg-violet-500 text-white font-bold scale-105" : "bg-white/[0.06] text-violet-400"
                )}>
                  <Film size={13} />
                </div>
                <span>Animation Cycles</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("sfx");
                  handlePlaySfxPreset("laser");
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left active:scale-[0.98]",
                  activeTab === "sfx"
                    ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-300 border border-yellow-500/30"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-transform duration-150",
                  activeTab === "sfx" ? "bg-yellow-500 text-black font-bold scale-105" : "bg-white/[0.06] text-yellow-400"
                )}>
                  <Volume2 size={13} />
                </div>
                <span>Sound FX (SFX)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("music");
                  handleGenerateMusic("cyberpunk_pulse", true);
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left active:scale-[0.98]",
                  activeTab === "music"
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-300 border border-purple-500/30"
                    : "text-text-muted hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-transform duration-150",
                  activeTab === "music" ? "bg-purple-500 text-white font-bold scale-105" : "bg-white/[0.06] text-purple-400"
                )}>
                  <Music size={13} />
                </div>
                <span>Chiptune BGM Studio</span>
              </button>
            </div>

            {/* Agent Engine Status */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1.5 text-[10px] text-text-muted">
              <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                <CheckCircle2 size={12} className="text-cyan-400" />
                <span>Agent Connected</span>
              </div>
              <span className="text-white/60">Model: {resolvedModel}</span>
              <span className="text-white/40">MCP Tools: Active</span>
            </div>
          </nav>

          {/* ZONE 2: Middle Parameter Deck & Chat Stream */}
          <div className="flex-1 flex flex-col border-r border-white/[0.06] bg-black/20 overflow-hidden min-h-0">
            <div key={activeTab} className="studio-station-pane flex-1 flex flex-col min-h-0">
              {/* 1. COPILOT CHAT VIEW */}
              {activeTab === "copilot" && (
                <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
                        <Bot size={24} />
                      </div>
                      <div className="max-w-md">
                        <h3 className="text-sm font-bold text-white mb-1">Playroom AI Asset Copilot</h3>
                        <p className="text-xs text-text-muted leading-relaxed">
                          Powered by the Playroom Agent system with specialized asset generation and scene synthesis tools.
                          Ask for characters, animations, sounds, or click any pinpoint suggestion above.
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => <AgentMessage key={m.id} message={m} />)
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {toolCalls.length > 0 && (
                  <div className="max-h-48 border-t border-white/[0.06] bg-black/30">
                    <AgentToolTrace toolCalls={toolCalls} />
                  </div>
                )}

                <div className="p-3 border-t border-white/[0.08] bg-black/40 flex items-center gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isStreaming) {
                        sendMessage(aiPrompt);
                      }
                    }}
                    placeholder="Ask the Agent to create or refine any game asset..."
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-400"
                  />

                  {isStreaming ? (
                    <Button variant="secondary" size="sm" onClick={abort} className="border-error/40 text-error">
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="solid"
                      size="sm"
                      onClick={() => sendMessage(aiPrompt)}
                      disabled={!aiPrompt.trim()}
                      className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold"
                    >
                      <Send size={13} /> Send
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 2. SPRITES WORKBENCH VIEW */}
            {activeTab === "sprites" && (
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                <Field label="Palette Style">
                  <Select
                    value={spritePalette}
                    onChange={(e) => setSpritePalette(e.target.value as PaletteName)}
                  >
                    {PALETTE_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Resolution Grid">
                  <Select
                    value={String(spriteSize)}
                    onChange={(e) => setSpriteSize(Number(e.target.value))}
                  >
                    <option value="16">16×16 (Retro Micro)</option>
                    <option value="24">24×24 (Classic 8-bit)</option>
                    <option value="32">32×32 (Standard 16-bit)</option>
                    <option value="48">48×48 (High Detail)</option>
                    <option value="64">64×64 (Ultra Pixel HD)</option>
                  </Select>
                </Field>

                <Button
                  variant="solid"
                  size="md"
                  onClick={() => handleGenerateWithAi()}
                  disabled={isSynthesizingAi}
                  className="bg-cyan-500 text-black font-bold hover:bg-cyan-400"
                >
                  <RefreshCw size={14} className={isSynthesizingAi ? "animate-spin" : ""} />
                  {isSynthesizingAi ? "Synthesizing..." : "Synthesize AI Variations"}
                </Button>
              </div>
            )}

            {/* 3. ANIMATED CYCLES VIEW */}
            {activeTab === "animated" && (
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                <Field label="Character Archetype">
                  <Select
                    value={spriteArchetype}
                    onChange={(e) => {
                      setSpriteArchetype(e.target.value);
                      setSheetId(`anim-${e.target.value}-${sheetAnimation}`);
                    }}
                  >
                    <option value="hero">Hero / Adventurer</option>
                    <option value="knight">Armored Knight</option>
                    <option value="rogue">Shadow Rogue</option>
                    <option value="wizard">Mystic Wizard</option>
                    <option value="slime">Bouncy Slime</option>
                    <option value="robot">Cyber Robot</option>
                    <option value="alien">Green Alien</option>
                  </Select>
                </Field>

                <Field label="Animation Action Cycle">
                  <Select
                    value={sheetAnimation}
                    onChange={(e) => setSheetAnimation(e.target.value as AnimationAction)}
                  >
                    <option value="walk">Walk Cycle (4 Frames)</option>
                    <option value="idle">Idle Breathing (4 Frames)</option>
                    <option value="run">Sprint Run (4 Frames)</option>
                    <option value="jump">Jump & Land (4 Frames)</option>
                    <option value="attack">Weapon Slash (4 Frames)</option>
                    <option value="hurt">Hurt Knockback (3 Frames)</option>
                    <option value="die">Collapse / Die (4 Frames)</option>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Frames Count">
                    <Select
                      value={String(sheetFrames)}
                      onChange={(e) => setSheetFrames(Number(e.target.value))}
                    >
                      <option value="2">2 Frames</option>
                      <option value="4">4 Frames</option>
                      <option value="6">6 Frames</option>
                      <option value="8">8 Frames</option>
                    </Select>
                  </Field>

                  <Field label="Playback FPS">
                    <Input
                      type="number"
                      min={2}
                      max={24}
                      value={sheetFps}
                      onChange={(e) => setSheetFps(Number(e.target.value) || 8)}
                      className="font-mono text-xs"
                    />
                  </Field>
                </div>

                <Button
                  variant="solid"
                  size="md"
                  onClick={() => handleGenerateWithAi()}
                  disabled={isSynthesizingAi}
                  className="bg-violet-600 text-white font-bold hover:bg-violet-500"
                >
                  <RefreshCw size={14} className={isSynthesizingAi ? "animate-spin" : ""} />
                  {isSynthesizingAi ? "Synthesizing..." : "Synthesize Animation"}
                </Button>
              </div>
            )}

            {/* 4. SOUND EFFECTS (SFX) VIEW */}
            {activeTab === "sfx" && (
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">12 SFX Presets</span>
                  <Badge variant="muted" className="font-mono text-[10px]">16-BIT PCM</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-72 pr-1">
                  {SFX_BUTTON_PRESETS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = sfxPreset === p.id;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePlaySfxPreset(p.id)}
                        className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all relative",
                          isSelected
                            ? "bg-yellow-500/15 border-yellow-500/50 text-white shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                            : "bg-white/[0.03] border-white/[0.06] text-text-muted hover:bg-white/[0.06] hover:text-white"
                        )}
                      >
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-yellow-500 text-black font-bold" : "bg-white/[0.06] text-yellow-400"
                          )}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold block truncate leading-tight">{p.label}</span>
                          <span className="text-[9px] text-text-muted truncate block">{p.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Field label="Master Volume">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                    className="w-full accent-yellow-400"
                  />
                </Field>
              </div>
            )}

            {/* 5. CHIPTUNE BGM VIEW */}
            {activeTab === "music" && (
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">7 Chiptune Genres</span>
                  <Badge variant="accent" className="font-mono text-[10px]">{musicBpm} BPM</Badge>
                </div>

                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {MUSIC_GENRE_PRESETS.map((m) => {
                    const isSelected = musicPreset === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMusicPreset(m.id);
                          setMusicBpm(m.bpm);
                          setMusicKey(m.key);
                          setMusicScale(m.scale);
                          handleGenerateMusic(m.id, true);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all",
                          isSelected
                            ? "bg-purple-500/15 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                            : "bg-white/[0.03] border-white/[0.06] text-text-muted hover:bg-white/[0.06] hover:text-white"
                        )}
                      >
                        <div>
                          <span className="text-xs font-bold block">{m.label}</span>
                          <span className="text-[9px] text-text-muted">{m.desc}</span>
                        </div>
                        <Badge variant="muted" className="text-[9px] font-mono">
                          {m.bpm} BPM
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tempo (BPM)">
                    <Input
                      type="number"
                      min={60}
                      max={200}
                      value={musicBpm}
                      onChange={(e) => setMusicBpm(Number(e.target.value) || 120)}
                      className="text-xs font-mono"
                    />
                  </Field>
                  <Field label="Key & Scale">
                    <Select
                      value={musicScale}
                      onChange={(e) => setMusicScale(e.target.value)}
                    >
                      <option value="major">Major (Upbeat)</option>
                      <option value="minor">Minor (Tense)</option>
                      <option value="harmonic_minor">Harmonic Minor</option>
                      <option value="dorian">Dorian (Mystic)</option>
                    </Select>
                  </Field>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* ZONE 3: Right Live Interactive Stage & Audio Visualizer */}
          <div className="w-80 lg:w-96 flex flex-col justify-between p-4 bg-[#05080e] relative overflow-hidden shrink-0">
            {/* Viewport Floating Controls */}
            <div className="flex items-center justify-between z-10">
              <Badge variant="muted" className="font-mono text-[10px] uppercase">
                {activeTab === "sfx"
                  ? `SFX: ${sfxPreset}`
                  : activeTab === "music"
                  ? `BGM: ${musicPreset}`
                  : activeTab === "animated"
                  ? `Cycle: ${sheetAnimation}`
                  : "Active Preview"}
              </Badge>

              {activeTab !== "sfx" && activeTab !== "music" && (
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.08]">
                  <IconButton
                    size="sm"
                    variant={showGrid ? "active" : "ghost"}
                    onClick={() => setShowGrid(!showGrid)}
                    title="Toggle Pixel Grid"
                  >
                    <Grid size={13} />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setZoomLevel((z) => Math.max(1, z - 1))}
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </IconButton>
                  <span className="text-[10px] font-mono px-1.5 text-text-muted">{zoomLevel}x</span>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setZoomLevel((z) => Math.min(6, z + 1))}
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </IconButton>
                </div>
              )}
            </div>

            {/* Stage Center Viewport */}
            <div key={activeTab === "sfx" || activeTab === "music" ? "audio" : activeTab} className="studio-station-pane flex-1 flex flex-col items-center justify-center my-3 gap-3">
              {/* STAGE A: AUDIO EQUALIZER (SFX & MUSIC) */}
              {activeTab === "sfx" || activeTab === "music" ? (
                <div className="flex flex-col items-center justify-center gap-5 w-full">
                  <div className="w-full h-32 rounded-2xl bg-black/60 border border-white/[0.08] p-4 flex items-end justify-center gap-1.5 shadow-inner">
                    {audioVisualBars.map((height, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2.5 rounded-full transition-all duration-75",
                          activeTab === "sfx"
                            ? "bg-gradient-to-t from-yellow-500 to-amber-300 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                            : "bg-gradient-to-t from-purple-600 via-fuchsia-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                        )}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {activeTab === "sfx" ? (
                      <Button
                        variant="solid"
                        size="md"
                        onClick={() => handlePlaySfxPreset(sfxPreset)}
                        className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold shadow-lg shadow-yellow-500/20"
                      >
                        <Volume2 size={14} /> Play {sfxPreset}
                      </Button>
                    ) : (
                      <Button
                        variant="solid"
                        size="md"
                        onClick={toggleMusicPlay}
                        className="bg-purple-600 text-white hover:bg-purple-500 font-bold shadow-lg shadow-purple-500/20"
                      >
                        {isPlayingMusicPreview ? <Pause size={14} /> : <Play size={14} />}
                        {isPlayingMusicPreview ? "Pause Track" : "Play Chiptune Loop"}
                      </Button>
                    )}
                  </div>
                </div>
              ) : activeTab === "animated" ? (
                /* STAGE B: ANIMATED CYCLES CANVAS */
                <div className="flex flex-col items-center justify-center gap-3">
                  <div
                    className={cn(
                      "relative rounded-2xl border-2 border-violet-500/40 p-4 bg-[#080d17] shadow-[0_0_50px_rgba(139,92,246,0.15)] flex items-center justify-center",
                      showGrid && "bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px]"
                    )}
                    style={{
                      width: `${Math.min(220, sheetFrameSize * zoomLevel * 3)}px`,
                      height: `${Math.min(220, sheetFrameSize * zoomLevel * 3)}px`,
                    }}
                  >
                    <canvas
                      ref={canvasAnimRef}
                      width={128}
                      height={128}
                      className="w-full h-full object-contain [image-rendering:pixelated]"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/[0.08]">
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setSheetCurrentFrame((prev) => (prev - 1 + sheetFrames) % sheetFrames)}
                      title="Previous Frame"
                    >
                      <ChevronLeft size={13} />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant={isPlayingSheetAnim ? "active" : "ghost"}
                      onClick={() => setIsPlayingSheetAnim(!isPlayingSheetAnim)}
                      title={isPlayingSheetAnim ? "Pause" : "Play"}
                    >
                      {isPlayingSheetAnim ? <Pause size={13} /> : <Play size={13} />}
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setSheetCurrentFrame((prev) => (prev + 1) % sheetFrames)}
                      title="Next Frame"
                    >
                      <ChevronRight size={13} />
                    </IconButton>
                    <span className="text-[10px] font-mono text-text-muted px-1.5">
                      {sheetCurrentFrame + 1} / {sheetFrames}
                    </span>
                  </div>
                </div>
              ) : (
                /* STAGE C: SPRITE & 4-VARIATION GRID */
                <div className="flex flex-col items-center justify-center gap-3">
                  <div
                    className={cn(
                      "relative rounded-2xl border-2 border-dashed border-cyan-500/30 flex items-center justify-center p-4 bg-[#080d17] shadow-[0_0_40px_rgba(0,240,255,0.08)]",
                      showGrid && "bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px]"
                    )}
                    style={{
                      width: `${Math.min(220, spriteSize * zoomLevel * 3)}px`,
                      height: `${Math.min(220, spriteSize * zoomLevel * 3)}px`,
                    }}
                  >
                    {activeVariation?.dataUrl ? (
                      <img
                        src={activeVariation.dataUrl}
                        alt="Generated Sprite"
                        className="w-full h-full object-contain [image-rendering:pixelated] drop-shadow-[0_0_20px_rgba(0,240,255,0.35)]"
                      />
                    ) : (
                      <ImageIcon size={32} className="opacity-30 text-text-muted" />
                    )}
                  </div>

                  {variations.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {variations.map((v, i) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariationIndex(i)}
                          className={cn(
                            "w-7 h-7 rounded-lg border text-[11px] font-mono font-bold flex items-center justify-center transition-all",
                            selectedVariationIndex === i
                              ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/30"
                              : "bg-white/[0.04] text-text-muted border-white/[0.08] hover:bg-white/[0.08]"
                          )}
                        >
                          V{i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Dock */}
            <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.08]">
              {/* Contextual Primary Action Button */}
              {activeTab === "sfx" && onAttachAudioToEntity ? (
                <Button
                  variant="solid"
                  size="md"
                  onClick={() => {
                    onAttachAudioToEntity(sfxId, false);
                    onClose();
                  }}
                  className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-bold shadow-lg shadow-yellow-500/20"
                >
                  <Plus size={14} /> Attach SFX to Selected Entity
                </Button>
              ) : activeTab === "music" && onAttachAudioToEntity ? (
                <Button
                  variant="solid"
                  size="md"
                  onClick={() => {
                    onAttachAudioToEntity(musicId, true);
                    onClose();
                  }}
                  className="w-full bg-purple-600 text-white hover:bg-purple-500 font-bold shadow-lg shadow-purple-500/20"
                >
                  <Music size={14} /> Attach BGM Soundtrack to Scene
                </Button>
              ) : activeTab === "animated" && onSpawnEntityWithAnimation ? (
                <Button
                  variant="solid"
                  size="md"
                  onClick={() => {
                    onSpawnEntityWithAnimation(sheetId, sheetFrameSize, sheetFrameSize, sheetFrames, sheetFps);
                    onClose();
                  }}
                  className="w-full bg-violet-600 text-white hover:bg-violet-500 font-bold shadow-lg shadow-violet-500/20"
                >
                  <Plus size={14} /> Spawn Animated Entity
                </Button>
              ) : activeVariation && onSpawnEntityWithSprite ? (
                <Button
                  variant="solid"
                  size="md"
                  onClick={() => {
                    onSpawnEntityWithSprite(activeVariation.id, spriteSize, spriteSize, activeVariation.category);
                    onClose();
                  }}
                  className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold shadow-lg shadow-cyan-500/20"
                >
                  <Plus size={14} /> Spawn Sprite into Scene
                </Button>
              ) : null}

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "sfx") handlePlaySfxPreset(sfxPreset);
                    else if (activeTab === "music") handleGenerateMusic(musicPreset, true);
                    else handleGenerateWithAi();
                  }}
                  className="flex-1"
                >
                  <RotateCcw size={12} /> Re-roll
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "sfx") handleDownloadAsset(null, `${sfxId}.wav`);
                    else if (activeTab === "animated") handleDownloadAsset(sheetPreviewUrl, `${sheetId}.png`);
                    else if (activeVariation) handleDownloadAsset(activeVariation.dataUrl, `${activeVariation.id}.png`);
                  }}
                  className="flex-1"
                >
                  <Download size={12} /> Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
