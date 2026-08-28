import React, { useState, useEffect, useRef } from "react";
import { Button, cn } from "@/ui";
import { useAgent } from "../hooks/useAgent.js";
import { useAgentKeys } from "../hooks/useAgentKeys.js";
import { AssetStudioStationDeck } from "./AssetStudioStations.js";
import { AssetStudioHeader } from "./AssetStudioModal/AssetStudioHeader.js";
import { AssetStudioNavRail } from "./AssetStudioModal/AssetStudioNavRail.js";
import { AssetStudioPreviewStage } from "./AssetStudioModal/AssetStudioPreviewStage.js";
import styles from "./AssetStudioModal.module.css";
import sheetStyles from "./SheetChrome.module.css";
import type { GameKitAsset } from "@gamekit/schema";
import { useAssetStudioAudio } from "../hooks/useAssetStudioAudio.js";
import {
  useAssetStudioGeneration,
  type AssetStudioTab,
} from "../hooks/useAssetStudioGeneration.js";
import type { PinpointSuggestion } from "./AssetStudioModal/AssetStudioHeader.js";

type StudioMode = "sheet" | "expanded" | "fullscreen";
type StudioTab = AssetStudioTab;

type AssetStudioModalProps = {
  isOpen: boolean;
  embedded?: boolean;
  onClose: () => void;
  onAssetCreated?: (asset: GameKitAsset) => void;
  onSpawnEntityWithSprite?: (
    assetId: string,
    width: number,
    height: number,
    category?: string
  ) => void;
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

  // --- Shared Agent Hooks & Settings ---
  const { keys, sessionKey } = useAgentKeys();
  const [activeProvider] = useState(
    () => localStorage.getItem("gamekit:agent:activeProvider") || ""
  );
  const [activeModel] = useState(() => localStorage.getItem("gamekit:agent:activeModel") || "");
  const resolvedProvider = activeProvider || (keys.length > 0 ? keys[0].provider : "anthropic");
  const activeKeyEntry = keys.find((k) => k.provider === resolvedProvider) || keys[0] || null;
  const resolvedModel =
    activeModel ||
    activeKeyEntry?.model ||
    (resolvedProvider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "claude-sonnet-4-5");

  const { messages, toolCalls, isStreaming, sendMessage, abort } = useAgent(
    activeSceneId || "main.scene.json",
    resolvedModel,
    resolvedProvider,
    "off",
    onAssetCreated
      ? () => onAssetCreated({ id: "agent-asset", file: "agent-asset.png", kind: "image" })
      : undefined,
    false,
    sessionKey(resolvedProvider),
    activeKeyEntry?.baseUrl
  );

  // --- Stage Viewport Controls ---
  const [zoomLevel, setZoomLevel] = useState<number>(3);
  const [showGrid, setShowGrid] = useState(false);

  const {
    sfxId,
    sfxPreset,
    sfxVolume,
    setSfxVolume,
    musicId,
    musicPreset,
    setMusicPreset,
    musicBpm,
    setMusicBpm,
    setMusicKey,
    musicScale,
    setMusicScale,
    isPlayingMusicPreview,
    audioVisualBars,
    playSfxPreset: handlePlaySfxPreset,
    generateMusic: handleGenerateMusic,
    toggleMusicPlay,
  } = useAssetStudioAudio({ isAgentStreaming: isStreaming, onAssetCreated });

  const {
    aiPrompt,
    setAiPrompt,
    isSynthesizingAi,
    variations,
    selectedVariationIndex,
    setSelectedVariationIndex,
    activeVariation,
    spriteId,
    spriteCategory,
    spriteArchetype,
    setSpriteArchetype,
    spritePalette,
    setSpritePalette,
    spriteSize,
    setSpriteSize,
    sheetId,
    setSheetId,
    sheetAnimation,
    setSheetAnimation,
    sheetFrames,
    setSheetFrames,
    sheetFrameSize,
    sheetFps,
    setSheetFps,
    sheetPreviewUrl,
    isPlayingSheetAnim,
    setIsPlayingSheetAnim,
    sheetCurrentFrame,
    setSheetCurrentFrame,
    canvasAnimRef,
    generate: handleGenerateWithAi,
  } = useAssetStudioGeneration({
    activeTab,
    isOpen,
    onAssetCreated,
    onGenerateSfx: handlePlaySfxPreset,
    onGenerateMusic: (preset) => handleGenerateMusic(preset, true),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, isStreaming]);

  async function handleExecutePinpointSuggestion(suggestion: PinpointSuggestion) {
    setActiveTab("copilot");
    setAiPrompt(suggestion.prompt);
    await sendMessage(suggestion.prompt);
  }

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        embedded ? styles["asset-studio-embedded"] : styles["asset-studio-scrim"],
        isOpen && styles.open
      )}
    >
      <div
        className={cn(
          embedded ? styles["asset-studio-workspace"] : styles["asset-studio-sheet"],
          isOpen && styles.open,
          studioMode === "sheet" && styles["mode-sheet"],
          studioMode === "expanded" && styles["mode-expanded"],
          studioMode === "fullscreen" && styles["mode-fullscreen"]
        )}
      >
        <AssetStudioHeader
          studioMode={studioMode}
          setStudioMode={setStudioMode}
          resolvedProvider={resolvedProvider}
          onClose={onClose}
          onExecutePinpointSuggestion={handleExecutePinpointSuggestion}
          embedded={embedded}
        />

        {/* ── 3-Zone Workspace Layout ── */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-transparent">
          <AssetStudioNavRail
            activeTab={activeTab}
            resolvedModel={resolvedModel}
            onSelectCopilot={() => setActiveTab("copilot")}
            onSelectSprites={() => {
              setActiveTab("sprites");
              void handleGenerateWithAi(undefined, "sprites");
            }}
            onSelectAnimated={() => {
              setActiveTab("animated");
              void handleGenerateWithAi(undefined, "animated");
            }}
            onSelectSfx={() => {
              setActiveTab("sfx");
              handlePlaySfxPreset("laser");
            }}
            onSelectMusic={() => {
              setActiveTab("music");
              handleGenerateMusic("cyberpunk_pulse", true);
            }}
          />

          {/* ZONE 2: Middle Parameter Deck & Chat Stream */}
          <div className="flex-1 flex flex-col border-r border-white/[0.06] bg-black/20 overflow-hidden min-h-0">
            <div
              key={activeTab}
              className={cn(sheetStyles["studio-station-pane"], "flex-1 flex flex-col min-h-0")}
            >
              <AssetStudioStationDeck
                activeTab={activeTab}
                copilot={{
                  messages,
                  toolCalls,
                  messagesEndRef,
                  prompt: aiPrompt,
                  setPrompt: setAiPrompt,
                  isStreaming,
                  sendMessage: (prompt) => void sendMessage(prompt),
                  abort,
                }}
                sprites={{
                  palette: spritePalette,
                  setPalette: setSpritePalette,
                  size: spriteSize,
                  setSize: setSpriteSize,
                  synthesizing: isSynthesizingAi,
                  generate: () => void handleGenerateWithAi(),
                }}
                animation={{
                  archetype: spriteArchetype,
                  setArchetype: (value) => {
                    setSpriteArchetype(value);
                    setSheetId(`anim-${value}-${sheetAnimation}`);
                  },
                  animation: sheetAnimation,
                  setAnimation: setSheetAnimation,
                  frames: sheetFrames,
                  setFrames: setSheetFrames,
                  fps: sheetFps,
                  setFps: setSheetFps,
                  synthesizing: isSynthesizingAi,
                  generate: () => void handleGenerateWithAi(),
                }}
                sfx={{
                  preset: sfxPreset,
                  volume: sfxVolume,
                  setVolume: setSfxVolume,
                  playPreset: (preset) => void handlePlaySfxPreset(preset),
                }}
                music={{
                  preset: musicPreset,
                  bpm: musicBpm,
                  setBpm: setMusicBpm,
                  scale: musicScale,
                  setScale: setMusicScale,
                  selectPreset: (preset) => {
                    setMusicPreset(preset.id);
                    setMusicBpm(preset.bpm);
                    setMusicKey(preset.key);
                    setMusicScale(preset.scale);
                    void handleGenerateMusic(preset.id, true);
                  },
                }}
              />
            </div>
          </div>

          <AssetStudioPreviewStage
            activeTab={activeTab}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            spriteSize={spriteSize}
            variations={variations}
            selectedVariationIndex={selectedVariationIndex}
            setSelectedVariationIndex={setSelectedVariationIndex}
            activeVariation={activeVariation}
            sheetFrameSize={sheetFrameSize}
            sheetFrames={sheetFrames}
            sheetFps={sheetFps}
            sheetCurrentFrame={sheetCurrentFrame}
            setSheetCurrentFrame={setSheetCurrentFrame}
            isPlayingSheetAnim={isPlayingSheetAnim}
            setIsPlayingSheetAnim={setIsPlayingSheetAnim}
            canvasAnimRef={canvasAnimRef}
            sheetAnimation={sheetAnimation}
            audioVisualBars={audioVisualBars}
            sfxPreset={sfxPreset}
            musicPreset={musicPreset}
            isPlayingMusicPreview={isPlayingMusicPreview}
            toggleMusicPlay={toggleMusicPlay}
            handlePlaySfxPreset={handlePlaySfxPreset}
            sfxId={sfxId}
            musicId={musicId}
            sheetId={sheetId}
            sheetPreviewUrl={sheetPreviewUrl}
            onAttachAudioToEntity={onAttachAudioToEntity}
            onSpawnEntityWithAnimation={onSpawnEntityWithAnimation}
            onSpawnEntityWithSprite={onSpawnEntityWithSprite}
            onClose={onClose}
            handleGenerateWithAi={() => void handleGenerateWithAi()}
            handleGenerateMusic={handleGenerateMusic}
          />
        </div>
      </div>
    </div>
  );
}
