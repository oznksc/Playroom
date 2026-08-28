import type { ComponentProps, RefObject } from "react";
import {
  Bot,
  Coins,
  Flame,
  Footprints,
  Heart,
  RefreshCw,
  Send,
  Shield,
  Skull,
  Sparkles,
  Square,
  Volume2,
  Wind,
  Zap,
  Crosshair,
} from "lucide-react";
import { Badge, Button, Field, Input, Select, cn } from "@/ui";
import type { AnimationAction, PaletteName } from "../lib/client-asset-generator.js";
import type { AssetStudioTab } from "../hooks/useAssetStudioGeneration.js";
import { AgentMessage } from "./AgentMessage.js";
import { AgentToolTrace } from "./AgentToolTrace.js";

const PALETTE_OPTIONS: { value: PaletteName; label: string }[] = [
  { value: "pico8", label: "PICO-8 (16 Retro Colors)" },
  { value: "gameboy", label: "Game Boy (4 Green Tones)" },
  { value: "cyberpunk", label: "Cyberpunk (Neon Cyan & Violet)" },
  { value: "nes", label: "NES (8-bit Classic)" },
  { value: "pastel", label: "Pastel Fantasy" },
  { value: "monochrome", label: "Monochrome (Ink & Paper)" },
];

const SFX_PRESETS = [
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

const MUSIC_PRESETS = [
  {
    id: "chiptune_adventure",
    label: "Chiptune Adventure",
    bpm: 130,
    scale: "major",
    key: "C",
    desc: "Upbeat 8-bit overworld melody",
  },
  {
    id: "boss_battle",
    label: "Boss Battle",
    bpm: 145,
    scale: "harmonic_minor",
    key: "D",
    desc: "Tense, aggressive combat pace",
  },
  {
    id: "chill_dungeon",
    label: "Chill Dungeon",
    bpm: 92,
    scale: "dorian",
    key: "E",
    desc: "Mysterious ambient cave loop",
  },
  {
    id: "cyberpunk_pulse",
    label: "Cyberpunk Pulse",
    bpm: 120,
    scale: "minor",
    key: "F",
    desc: "Driving synthwave bassline",
  },
  {
    id: "retro_menu",
    label: "Retro Menu Theme",
    bpm: 110,
    scale: "major",
    key: "G",
    desc: "Catchy friendly title theme",
  },
  {
    id: "victory_fanfare",
    label: "Victory Fanfare",
    bpm: 125,
    scale: "major",
    key: "C",
    desc: "Celebratory brass flourish",
  },
  {
    id: "spooky_night",
    label: "Spooky Night",
    bpm: 96,
    scale: "minor",
    key: "A",
    desc: "Eerie suspenseful atmosphere",
  },
];

type AgentMessageValue = ComponentProps<typeof AgentMessage>["message"];
type AgentToolCalls = ComponentProps<typeof AgentToolTrace>["toolCalls"];

export interface AssetStudioStationDeckProps {
  activeTab: AssetStudioTab;
  copilot: {
    messages: AgentMessageValue[];
    toolCalls: AgentToolCalls;
    messagesEndRef: RefObject<HTMLDivElement>;
    prompt: string;
    setPrompt: (prompt: string) => void;
    isStreaming: boolean;
    sendMessage: (prompt: string) => void;
    abort: () => void;
  };
  sprites: {
    palette: PaletteName;
    setPalette: (palette: PaletteName) => void;
    size: number;
    setSize: (size: number) => void;
    synthesizing: boolean;
    generate: () => void;
  };
  animation: {
    archetype: string;
    setArchetype: (value: string) => void;
    animation: AnimationAction;
    setAnimation: (value: AnimationAction) => void;
    frames: number;
    setFrames: (value: number) => void;
    fps: number;
    setFps: (value: number) => void;
    synthesizing: boolean;
    generate: () => void;
  };
  sfx: {
    preset: string;
    volume: number;
    setVolume: (value: number) => void;
    playPreset: (preset: string) => void;
  };
  music: {
    preset: string;
    bpm: number;
    setBpm: (value: number) => void;
    scale: string;
    setScale: (value: string) => void;
    selectPreset: (preset: { id: string; bpm: number; key: string; scale: string }) => void;
  };
}

export function AssetStudioStationDeck(props: AssetStudioStationDeckProps) {
  switch (props.activeTab) {
    case "copilot":
      return <CopilotStation {...props.copilot} />;
    case "sprites":
      return <SpriteStation {...props.sprites} />;
    case "animated":
      return <AnimationStation {...props.animation} />;
    case "sfx":
      return <SfxStation {...props.sfx} />;
    case "music":
      return <MusicStation {...props.music} />;
  }
}

function CopilotStation({
  messages,
  toolCalls,
  messagesEndRef,
  prompt,
  setPrompt,
  isStreaming,
  sendMessage,
  abort,
}: AssetStudioStationDeckProps["copilot"]) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
              <Bot size={24} />
            </div>
            <div className="max-w-md">
              <h3 className="mb-1 text-sm font-bold text-white">Playroom AI Asset Copilot</h3>
              <p className="text-xs leading-relaxed text-text-muted">
                Powered by the Playroom Agent system with specialized asset generation and scene
                synthesis tools. Ask for characters, animations, sounds, or use a pinpoint
                suggestion.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => <AgentMessage key={message.id} message={message} />)
        )}
        <div ref={messagesEndRef} />
      </div>
      {toolCalls.length > 0 && (
        <div className="max-h-48 border-t border-white/[0.06] bg-black/30">
          <AgentToolTrace toolCalls={toolCalls} />
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-white/[0.08] bg-black/40 p-3">
        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isStreaming) sendMessage(prompt);
          }}
          placeholder="Ask the Agent to create or refine any game asset..."
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2 text-xs text-white placeholder:text-text-muted focus:border-cyan-400 focus:outline-none"
        />
        {isStreaming ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={abort}
            className="border-error/40 text-error"
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="solid"
            size="sm"
            onClick={() => sendMessage(prompt)}
            disabled={!prompt.trim()}
            className="bg-cyan-500 font-bold text-black hover:bg-cyan-400"
          >
            <Send size={13} /> Send
          </Button>
        )}
      </div>
    </div>
  );
}

function SpriteStation({
  palette,
  setPalette,
  size,
  setSize,
  synthesizing,
  generate,
}: AssetStudioStationDeckProps["sprites"]) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Field label="Palette Style">
        <Select value={palette} onChange={(event) => setPalette(event.target.value as PaletteName)}>
          {PALETTE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Resolution Grid">
        <Select value={String(size)} onChange={(event) => setSize(Number(event.target.value))}>
          <option value="16">16×16 (Retro Micro)</option>
          <option value="24">24×24 (Classic 8-bit)</option>
          <option value="32">32×32 (Standard 16-bit)</option>
          <option value="48">48×48 (High Detail)</option>
          <option value="64">64×64 (Ultra Pixel HD)</option>
        </Select>
      </Field>
      <GenerateButton
        color="cyan"
        label="Synthesize AI Variations"
        synthesizing={synthesizing}
        generate={generate}
      />
    </div>
  );
}

function AnimationStation({
  archetype,
  setArchetype,
  animation,
  setAnimation,
  frames,
  setFrames,
  fps,
  setFps,
  synthesizing,
  generate,
}: AssetStudioStationDeckProps["animation"]) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Field label="Character Archetype">
        <Select value={archetype} onChange={(event) => setArchetype(event.target.value)}>
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
          value={animation}
          onChange={(event) => setAnimation(event.target.value as AnimationAction)}
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
            value={String(frames)}
            onChange={(event) => setFrames(Number(event.target.value))}
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
            value={fps}
            onChange={(event) => setFps(Number(event.target.value) || 8)}
            className="font-mono text-xs"
          />
        </Field>
      </div>
      <GenerateButton
        color="violet"
        label="Synthesize Animation"
        synthesizing={synthesizing}
        generate={generate}
      />
    </div>
  );
}

function SfxStation({ preset, volume, setVolume, playPreset }: AssetStudioStationDeckProps["sfx"]) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white">
          12 SFX Presets
        </span>
        <Badge variant="muted" className="font-mono text-[10px]">
          16-BIT PCM
        </Badge>
      </div>
      <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {SFX_PRESETS.map((item) => {
          const Icon = item.icon;
          const selected = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => playPreset(item.id)}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                selected
                  ? "border-yellow-500/50 bg-yellow-500/15 text-white shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                  : "border-white/[0.06] bg-white/[0.03] text-text-muted hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  selected
                    ? "bg-yellow-500 font-bold text-black"
                    : "bg-white/[0.06] text-yellow-400"
                )}
              >
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold leading-tight">
                  {item.label}
                </span>
                <span className="block truncate text-[9px] text-text-muted">{item.desc}</span>
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
          value={volume}
          onChange={(event) => setVolume(parseFloat(event.target.value))}
          className="w-full accent-yellow-400"
        />
      </Field>
    </div>
  );
}

function MusicStation({
  preset,
  bpm,
  setBpm,
  scale,
  setScale,
  selectPreset,
}: AssetStudioStationDeckProps["music"]) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white">
          7 Chiptune Genres
        </span>
        <Badge variant="accent" className="font-mono text-[10px]">
          {bpm} BPM
        </Badge>
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {MUSIC_PRESETS.map((item) => {
          const selected = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectPreset(item)}
              className={cn(
                "flex items-center justify-between rounded-xl border p-2.5 text-left transition-all",
                selected
                  ? "border-purple-500/50 bg-purple-500/15 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                  : "border-white/[0.06] bg-white/[0.03] text-text-muted hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <div>
                <span className="block text-xs font-bold">{item.label}</span>
                <span className="text-[9px] text-text-muted">{item.desc}</span>
              </div>
              <Badge variant="muted" className="font-mono text-[9px]">
                {item.bpm} BPM
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
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value) || 120)}
            className="font-mono text-xs"
          />
        </Field>
        <Field label="Key & Scale">
          <Select value={scale} onChange={(event) => setScale(event.target.value)}>
            <option value="major">Major (Upbeat)</option>
            <option value="minor">Minor (Tense)</option>
            <option value="harmonic_minor">Harmonic Minor</option>
            <option value="dorian">Dorian (Mystic)</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function GenerateButton({
  color,
  label,
  synthesizing,
  generate,
}: {
  color: "cyan" | "violet";
  label: string;
  synthesizing: boolean;
  generate: () => void;
}) {
  return (
    <Button
      variant="solid"
      size="md"
      onClick={generate}
      disabled={synthesizing}
      className={
        color === "cyan"
          ? "bg-cyan-500 font-bold text-black hover:bg-cyan-400"
          : "bg-violet-600 font-bold text-white hover:bg-violet-500"
      }
    >
      <RefreshCw size={14} className={synthesizing ? "animate-spin" : ""} />
      {synthesizing ? "Synthesizing..." : label}
    </Button>
  );
}
