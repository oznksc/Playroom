import React from "react";
import {
  Grid,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Volume2,
  Music,
  Plus,
  RotateCcw,
  Download,
} from "lucide-react";
import { Button, IconButton, Badge, cn } from "@/ui";
import sheetStyles from "../SheetChrome.module.css";
import type { AssetStudioTab } from "../../hooks/useAssetStudioGeneration.js";

type Variation = {
  id: string;
  dataUrl: string | null;
  category?: string;
};

type AssetStudioPreviewStageProps = {
  activeTab: AssetStudioTab;
  // Viewport controls
  zoomLevel: number;
  setZoomLevel: (fn: (z: number) => number) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  // Sprite
  spriteSize: number;
  variations: Variation[];
  selectedVariationIndex: number;
  setSelectedVariationIndex: (i: number) => void;
  activeVariation: Variation | null | undefined;
  // Animation
  sheetFrameSize: number;
  sheetFrames: number;
  sheetFps: number;
  sheetCurrentFrame: number;
  setSheetCurrentFrame: (fn: (prev: number) => number) => void;
  isPlayingSheetAnim: boolean;
  setIsPlayingSheetAnim: (v: boolean) => void;
  canvasAnimRef: React.RefObject<HTMLCanvasElement>;
  sheetAnimation: string;
  // Audio
  audioVisualBars: number[];
  sfxPreset: string;
  musicPreset: string;
  isPlayingMusicPreview: boolean;
  toggleMusicPlay: () => void;
  handlePlaySfxPreset: (preset: string) => void;
  // Bottom actions
  sfxId: string;
  musicId: string;
  sheetId: string;
  sheetPreviewUrl: string | null;
  onAttachAudioToEntity?: ((assetId: string, isBgm?: boolean) => void) | null;
  onSpawnEntityWithAnimation?:
    ((assetId: string, fw: number, fh: number, frames: number, fps: number) => void) | null;
  onSpawnEntityWithSprite?:
    ((assetId: string, w: number, h: number, category?: string) => void) | null;
  onClose: () => void;
  handleGenerateWithAi: () => void;
  handleGenerateMusic: (preset: string, preview: boolean) => void;
};

export function AssetStudioPreviewStage({
  activeTab,
  zoomLevel,
  setZoomLevel,
  showGrid,
  setShowGrid,
  spriteSize,
  variations,
  selectedVariationIndex,
  setSelectedVariationIndex,
  activeVariation,
  sheetFrameSize,
  sheetFrames,
  sheetCurrentFrame,
  setSheetCurrentFrame,
  isPlayingSheetAnim,
  setIsPlayingSheetAnim,
  canvasAnimRef,
  sheetAnimation,
  audioVisualBars,
  sfxPreset,
  musicPreset,
  isPlayingMusicPreview,
  toggleMusicPlay,
  handlePlaySfxPreset,
  sfxId,
  musicId,
  sheetId,
  sheetPreviewUrl,
  onAttachAudioToEntity,
  onSpawnEntityWithAnimation,
  onSpawnEntityWithSprite,
  onClose,
  handleGenerateWithAi,
  handleGenerateMusic,
}: AssetStudioPreviewStageProps) {
  function handleDownloadAsset(dataUrl: string | null, filename: string) {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
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
      <div
        key={activeTab === "sfx" || activeTab === "music" ? "audio" : activeTab}
        className={cn(
          sheetStyles["studio-station-pane"],
          "flex-1 flex flex-col items-center justify-center my-3 gap-3"
        )}
      >
        {/* STAGE A: AUDIO EQUALIZER */}
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
                showGrid &&
                  "bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px]"
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
                onClick={() =>
                  setSheetCurrentFrame((prev) => (prev - 1 + sheetFrames) % sheetFrames)
                }
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
                showGrid &&
                  "bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px]"
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
              onSpawnEntityWithAnimation(sheetId, sheetFrameSize, sheetFrameSize, sheetFrames, 12);
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
              onSpawnEntityWithSprite(
                activeVariation.id,
                spriteSize,
                spriteSize,
                activeVariation.category
              );
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
              else if (activeTab === "animated")
                handleDownloadAsset(sheetPreviewUrl, `${sheetId}.png`);
              else if (activeVariation)
                handleDownloadAsset(activeVariation.dataUrl, `${activeVariation.id}.png`);
            }}
            className="flex-1"
          >
            <Download size={12} /> Export
          </Button>
        </div>
      </div>
    </div>
  );
}
