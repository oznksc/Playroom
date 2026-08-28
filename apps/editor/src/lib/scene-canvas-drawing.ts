import type { GameKitAsset, GameKitScene, GuiComponent } from "@gamekit/schema";
import type { CanvasTool } from "./editor-tools.js";
import type { TilePaintOverlay } from "./tile-paint.js";
import { drawScene, drawSceneFrame, drawScreenSpaceText, drawWorldGrid } from "./canvas.js";

const VOID_COLOR = "#090c12";

interface DrawSceneCanvasOptions {
  canvas: HTMLCanvasElement;
  viewSize: { w: number; h: number };
  scene?: GameKitScene;
  assets: GameKitAsset[];
  images: Map<string, HTMLImageElement>;
  selectedEntityIds: Set<string>;
  selectedGuiNodeId?: string | null;
  guiComponents?: GuiComponent[];
  selectedComponentInstanceId?: string | null;
  showGuiTools: boolean;
  showGrid: boolean;
  showColliders: boolean;
  snapSize: number;
  activeTool: CanvasTool;
  zoom: number;
  pan: { x: number; y: number };
  isPlaying: boolean;
  playViewPan: { x: number; y: number } | null;
  paintOverlay: TilePaintOverlay | null;
}

export function drawSceneCanvas({
  canvas,
  viewSize,
  scene,
  assets,
  images,
  selectedEntityIds,
  selectedGuiNodeId,
  guiComponents,
  selectedComponentInstanceId,
  showGuiTools,
  showGrid,
  showColliders,
  snapSize,
  activeTool,
  zoom,
  pan,
  isPlaying,
  playViewPan,
  paintOverlay,
}: DrawSceneCanvasOptions) {
  const context = canvas.getContext("2d");
  if (!context || viewSize.w <= 0 || viewSize.h <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = viewSize.w;
  const cssHeight = viewSize.h;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = VOID_COLOR;
  context.fillRect(0, 0, cssWidth, cssHeight);
  context.setTransform(dpr * zoom, 0, 0, dpr * zoom, -pan.x * zoom * dpr, -pan.y * zoom * dpr);

  const bounds = {
    worldLeft: pan.x,
    worldTop: pan.y,
    worldRight: pan.x + cssWidth / zoom,
    worldBottom: pan.y + cssHeight / zoom,
  };

  if (showGrid) {
    drawWorldGrid(
      context,
      bounds.worldLeft,
      bounds.worldTop,
      bounds.worldRight,
      bounds.worldBottom,
      zoom,
      snapSize || 32
    );
  }
  if (!scene) return;

  const viewportWidth = scene.viewport.width;
  const viewportHeight = scene.viewport.height;
  const cameraX = isPlaying && playViewPan ? playViewPan.x : 0;
  const cameraY = isPlaying && playViewPan ? playViewPan.y : 0;

  if (isPlaying) {
    context.fillStyle = scene.viewport.background;
    context.fillRect(0, 0, viewportWidth, viewportHeight);
    context.save();
    context.beginPath();
    context.rect(0, 0, viewportWidth, viewportHeight);
    context.clip();
    context.translate(-cameraX, -cameraY);
    drawScene(
      context,
      scene,
      assets,
      images,
      selectedEntityIds,
      false,
      showColliders,
      selectedGuiNodeId,
      guiComponents,
      selectedComponentInstanceId,
      showGuiTools,
      { skipViewportChrome: true, skipScreenSpaceText: true, activeTool, zoom }
    );
    context.restore();
    context.save();
    context.beginPath();
    context.rect(0, 0, viewportWidth, viewportHeight);
    context.clip();
    drawScreenSpaceText(context, scene);
    context.restore();
    drawSceneFrame(
      context,
      viewportWidth,
      viewportHeight,
      zoom,
      bounds,
      `Play  ${Math.round(viewportWidth)}×${Math.round(viewportHeight)}`
    );
    return;
  }

  drawScene(
    context,
    scene,
    assets,
    images,
    selectedEntityIds,
    false,
    showColliders,
    selectedGuiNodeId,
    guiComponents,
    selectedComponentInstanceId,
    showGuiTools,
    { activeTool, zoom, paintOverlay }
  );
  drawSceneFrame(context, viewportWidth, viewportHeight, zoom, bounds);
}
