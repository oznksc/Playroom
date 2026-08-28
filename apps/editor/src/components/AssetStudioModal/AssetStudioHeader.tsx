import React from "react";
import {
  Target,
  Sliders,
  Maximize2,
  Radio,
  X,
  Sparkles,
  Skull,
  Volume2,
  Music,
  Coins,
} from "lucide-react";
import { Badge, IconButton, SegmentedControl, cn } from "@/ui";
import sheetStyles from "../SheetChrome.module.css";
import styles from "../AssetStudioModal.module.css";

type StudioMode = "sheet" | "expanded" | "fullscreen";

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
    prompt:
      "Generate an animated 4-frame cyberpunk knight hero walk spritesheet (32x32) with a weapon slash cycle, then spawn it as a player entity with collider in the scene.",
    kind: "spritesheet",
  },
  {
    id: "slime-enemy",
    title: "Spawn Bouncing Slime Enemy",
    desc: "Radioactive green slime monster with hurt & death animations",
    tag: "Enemy Pack",
    icon: Skull,
    prompt:
      "Generate a radioactive emerald bouncing slime monster enemy with 4-frame squashing animation cycle, add collider and spawn in the active scene.",
    kind: "spritesheet",
  },
  {
    id: "essential-sfx",
    title: "Synthesize Essential 8-Bit SFX Pack",
    desc: "Jump sweep, Gem pickup chime, Laser blast, and Impact hit",
    tag: "Audio Kit",
    icon: Volume2,
    prompt:
      "Generate a full set of retro sound effects: jump sweep (sfx-jump), coin pickup chime (sfx-coin), laser blaster (sfx-laser), and explosion rumble (sfx-explosion).",
    kind: "sfx",
  },
  {
    id: "adventure-bgm",
    title: "Compose 130 BPM Overworld Theme",
    desc: "Upbeat loopable chiptune adventure soundtrack in C Major",
    tag: "Music & BGM",
    icon: Music,
    prompt:
      "Synthesize a loopable 130 BPM Chiptune Adventure soundtrack in C Major with lead synth, bassline, and 8-bit drums.",
    kind: "music",
  },
  {
    id: "collectible-gems",
    title: "Create Legendary Astral Gems Pack",
    desc: "Glowing gold coin, diamond gem, and heart container sprites",
    tag: "Items & Props",
    icon: Coins,
    prompt:
      "Generate 3 collectible item sprites: golden coin (32x32), sapphire diamond gem (32x32), and celestial heart container (32x32) with Cyberpunk neon palette.",
    kind: "sprite",
  },
];

type AssetStudioHeaderProps = {
  studioMode: StudioMode;
  setStudioMode: (mode: StudioMode) => void;
  resolvedProvider: string;
  onClose: () => void;
  onExecutePinpointSuggestion: (suggestion: PinpointSuggestion) => void;
  embedded?: boolean;
};

export { type PinpointSuggestion, PINPOINT_SUGGESTIONS };

export function AssetStudioHeader({
  studioMode,
  setStudioMode,
  resolvedProvider,
  onClose,
  onExecutePinpointSuggestion,
  embedded,
}: AssetStudioHeaderProps) {
  return (
    <div
      className={cn(
        styles["asset-studio-internal-header"],
        sheetStyles["bottom-sheet-header"],
        "relative select-none !h-auto !min-h-12 !px-3 !pb-2 !pt-4",
        embedded && "hidden"
      )}
    >
      {/* Drag Handle */}
      <div
        className={cn(
          sheetStyles["bottom-sheet-handle"],
          "!top-2 flex items-center justify-center cursor-pointer"
        )}
        onClick={() =>
          setStudioMode(
            studioMode === "sheet" ? "expanded" : studioMode === "expanded" ? "fullscreen" : "sheet"
          )
        }
        title="Toggle Studio Size"
      >
        <div className={styles["asset-studio-handle"]} />
      </div>

      {/* Top Header Bar */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-black">
            <Target size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className={cn(sheetStyles["bottom-sheet-title"], "!p-0")}>Asset Studio</h2>
              <Badge
                variant="accent"
                className="text-[9px] uppercase font-mono px-1.5 py-0.5 tracking-wider bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              >
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
          <SegmentedControl
            value={studioMode}
            onValueChange={setStudioMode}
            ariaLabel="Asset Studio size"
            className="mr-2"
            options={[
              {
                value: "sheet",
                label: (
                  <span className="flex items-center gap-1">
                    <Sliders size={12} /> Sheet
                  </span>
                ),
              },
              {
                value: "expanded",
                label: (
                  <span className="flex items-center gap-1">
                    <Maximize2 size={12} /> Studio
                  </span>
                ),
              },
              {
                value: "fullscreen",
                label: (
                  <span className="flex items-center gap-1">
                    <Radio size={12} /> Full
                  </span>
                ),
              },
            ]}
          />

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
                onClick={() => onExecutePinpointSuggestion(item)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 hover:border-cyan-500/40 border border-white/[0.08] transition-all shrink-0 text-left group"
              >
                <Icon
                  size={13}
                  className="text-cyan-400 group-hover:scale-110 transition-transform"
                />
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
  );
}
