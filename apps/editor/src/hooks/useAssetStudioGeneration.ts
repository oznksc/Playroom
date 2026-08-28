import type { GameKitAsset } from "@gamekit/schema";
import { useEffect, useRef, useState } from "react";
import {
  generateAiVariationSet,
  parseAiPrompt,
  renderClientSpritesheet,
  type AiSpriteVariation,
  type AnimationAction,
  type PaletteName,
  type SpriteCategory,
} from "../lib/client-asset-generator.js";
import { getApiUrl } from "../lib/api.js";

export type AssetStudioTab = "copilot" | "sprites" | "animated" | "sfx" | "music";

interface UseAssetStudioGenerationOptions {
  activeTab: AssetStudioTab;
  isOpen: boolean;
  onAssetCreated?: (asset: GameKitAsset) => void;
  onGenerateSfx: (preset: string) => Promise<void>;
  onGenerateMusic: (preset: string) => Promise<void>;
}

export function useAssetStudioGeneration({
  activeTab,
  isOpen,
  onAssetCreated,
  onGenerateSfx,
  onGenerateMusic,
}: UseAssetStudioGenerationOptions) {
  const [aiPrompt, setAiPrompt] = useState(
    "cyberpunk armored knight with neon cyan blade, glowing visor"
  );
  const [isSynthesizingAi, setIsSynthesizingAi] = useState(false);
  const [variations, setVariations] = useState<AiSpriteVariation[]>([]);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [spriteId, setSpriteId] = useState("hero-cyber-knight");
  const [spriteCategory, setSpriteCategory] = useState<SpriteCategory>("character");
  const [spriteArchetype, setSpriteArchetype] = useState("knight");
  const [spritePalette, setSpritePalette] = useState<PaletteName>("cyberpunk");
  const [spriteSize, setSpriteSize] = useState(32);
  const [sheetId, setSheetId] = useState("hero-walk");
  const [sheetAnimation, setSheetAnimation] = useState<AnimationAction>("walk");
  const [sheetFrames, setSheetFrames] = useState(4);
  const [sheetFrameSize] = useState(32);
  const [sheetFps, setSheetFps] = useState(8);
  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);
  const [isPlayingSheetAnim, setIsPlayingSheetAnim] = useState(true);
  const [sheetCurrentFrame, setSheetCurrentFrame] = useState(0);
  const canvasAnimRef = useRef<HTMLCanvasElement | null>(null);
  const sheetImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isOpen || variations.length > 0) return;
    const analysis = parseAiPrompt(aiPrompt);
    setSpriteCategory(analysis.category);
    setSpriteArchetype(analysis.archetype);
    setSpritePalette(analysis.palette);
    setSheetAnimation(analysis.animationAction);
    setVariations(
      generateAiVariationSet(aiPrompt, analysis.category, analysis.palette, spriteSize)
    );
    setSelectedVariationIndex(0);
  }, [isOpen, variations.length, aiPrompt, spriteSize]);

  useEffect(() => {
    if (!sheetPreviewUrl) return;
    const image = new Image();
    image.src = sheetPreviewUrl;
    image.onload = () => {
      sheetImageRef.current = image;
    };
    if (!isPlayingSheetAnim) return;
    const intervalId = window.setInterval(
      () => {
        setSheetCurrentFrame((previous) => (previous + 1) % sheetFrames);
      },
      1000 / Math.max(1, sheetFps)
    );
    return () => window.clearInterval(intervalId);
  }, [sheetPreviewUrl, sheetFrames, sheetFps, isPlayingSheetAnim]);

  useEffect(() => {
    const canvas = canvasAnimRef.current;
    const image = sheetImageRef.current;
    if (!canvas || !image || !image.complete) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const checkerSize = 8;
    for (let y = 0; y < canvas.height; y += checkerSize) {
      for (let x = 0; x < canvas.width; x += checkerSize) {
        context.fillStyle =
          (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0
            ? "#0c111c"
            : "#131a29";
        context.fillRect(x, y, checkerSize, checkerSize);
      }
    }
    context.drawImage(
      image,
      sheetCurrentFrame * sheetFrameSize,
      0,
      sheetFrameSize,
      sheetFrameSize,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [sheetCurrentFrame, sheetFrameSize, sheetPreviewUrl]);

  async function generate(customPrompt?: string, targetTab: AssetStudioTab = activeTab) {
    const prompt = customPrompt ?? aiPrompt;
    setIsSynthesizingAi(true);
    try {
      const analysis = parseAiPrompt(prompt);
      setSpriteCategory(analysis.category);
      setSpriteArchetype(analysis.archetype);
      setSpritePalette(analysis.palette);
      setSheetAnimation(analysis.animationAction);
      const baseName = `${analysis.category}-${analysis.archetype.replace(/[^a-z0-9]+/g, "-")}`;
      setSpriteId(baseName);
      setSheetId(`anim-${baseName}`);

      if (targetTab === "sprites" || targetTab === "copilot") {
        setVariations(
          generateAiVariationSet(prompt, analysis.category, analysis.palette, spriteSize)
        );
        setSelectedVariationIndex(0);
        try {
          const response = await fetch(getApiUrl("/api/assets/generate/sprite"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: baseName,
              category: analysis.category,
              archetype: analysis.archetype,
              palette: analysis.palette,
              size: spriteSize,
              prompt,
            }),
          });
          if (response.ok) {
            const data = (await response.json()) as { asset: GameKitAsset };
            onAssetCreated?.(data.asset);
          }
        } catch {
          // Client variations remain available when the backend is offline.
        }
      } else if (targetTab === "animated") {
        setSheetPreviewUrl(
          renderClientSpritesheet(
            analysis.archetype,
            analysis.animationAction,
            sheetFrames,
            sheetFrameSize,
            analysis.palette
          )
        );
        setSheetCurrentFrame(0);
      } else if (targetTab === "sfx") {
        await onGenerateSfx(analysis.sfxPreset);
      } else {
        await onGenerateMusic(analysis.musicGenre);
      }
    } finally {
      setIsSynthesizingAi(false);
    }
  }

  return {
    aiPrompt,
    setAiPrompt,
    isSynthesizingAi,
    variations,
    selectedVariationIndex,
    setSelectedVariationIndex,
    activeVariation: variations[selectedVariationIndex] || variations[0],
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
    generate,
  };
}
