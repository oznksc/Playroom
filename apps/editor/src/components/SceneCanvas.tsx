import type { GameKitAsset, GameKitScene, GuiComponent } from "@gamekit/schema";
import type { CanvasTool, TilePaintMode } from "../lib/editor-tools.js";
import { useEffect } from "react";
import { useImageCache } from "../hooks/useImageCache.js";
import { ContextMenu } from "./ContextMenu.js";
import { cn } from "@/ui";
import workspaceStyles from "./Workspace.module.css";
import { useSceneViewport } from "../hooks/useSceneViewport.js";
import { drawSceneCanvas } from "../lib/scene-canvas-drawing.js";
import {
  VirtualGameControls,
  type VirtualInputAction,
  type VirtualTouchControl,
} from "./SceneCanvasOverlays.js";
import { buildCanvasContextMenuItems } from "./SceneCanvas/canvasContextMenu.js";
import { useCanvasInteractions } from "./SceneCanvas/useCanvasInteractions.js";

type SceneCanvasProps = {
  scene?: GameKitScene;
  assets: GameKitAsset[];
  selectedEntityIds: Set<string>;
  selectedGuiNodeId?: string | null;
  guiComponents?: GuiComponent[];
  selectedComponentInstanceId?: string | null;
  showGuiTools?: boolean;
  zoom: number;
  snap: boolean;
  hasClipboard: boolean;
  activeTool: CanvasTool;
  tilePaintMode?: TilePaintMode;
  brushSize?: number;
  showGrid: boolean;
  showColliders: boolean;
  snapSize: number;
  isPlaying: boolean;
  /**
   * Play-mode game camera (world top-left of the locked game screen).
   * Only scrolls content *inside* the design viewport frame — never the
   * editor canvas pan/workspace.
   */
  playViewPan?: { x: number; y: number } | null;
  /** Active paint brush tile id (1-based tileset index; 0 clears). */
  paintTileId?: number;
  /** Increment to re-center the scene in the viewport. */
  viewResetKey?: number;
  /** Discrete virtual-pad actions for play mode (maps to scene.inputMap). */
  onVirtualInput?: (action: VirtualInputAction, pressed: boolean) => void;
  /** Which touch buttons to show (from scene.inputMap). Defaults to jump only. */
  virtualTouchControls?: VirtualTouchControl[];
  /** Play-mode: GUI Button.action fired on pointer up. */
  onGuiAction?: (action: string) => void;
  onZoomChange: (zoom: number) => void;
  onSnapToggle: (snap: boolean) => void;
  onSnapSizeChange: (size: number) => void;
  onActiveToolChange: (tool: CanvasTool) => void;
  onToggleGrid: (val: boolean) => void;
  onToggleColliders: (val: boolean) => void;
  onSelect: (id: string, shift: boolean) => void;
  onSelectGuiNode: (id: string) => void;
  onSelectComponentInstance: (id: string) => void;
  onTransform: (
    id: string,
    updates: {
      position?: { x: number; y: number };
      rotation?: number;
      scale?: { x: number; y: number };
    }
  ) => void;
  onPolygonPointsChange?: (id: string, points: { x: number; y: number }[]) => void;
  onPaintTiles?: (entityId: string, tiles: number[]) => void;
  onSampleTile?: (tileId: number) => void;
  onAddEntity: () => void;
  onPasteEntity: () => void;
  onSelectAll: () => void;
  onCopyEntity: (id: string) => void;
  onCutEntity: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
  onSaveAsPrefab?: (id: string) => void;
};

export function SceneCanvas({
  scene,
  assets,
  selectedEntityIds,
  selectedGuiNodeId,
  guiComponents,
  selectedComponentInstanceId,
  showGuiTools = true,
  zoom,
  snap,
  hasClipboard,
  activeTool,
  tilePaintMode = "brush",
  brushSize = 1,
  showGrid,
  showColliders,
  snapSize,
  isPlaying,
  playViewPan = null,
  paintTileId = 1,
  viewResetKey = 0,
  onVirtualInput,
  virtualTouchControls = ["jump"],
  onGuiAction,
  onZoomChange,
  onSelect,
  onSelectGuiNode,
  onSelectComponentInstance,
  onTransform,
  onPolygonPointsChange,
  onPaintTiles,
  onSampleTile,
  onAddEntity,
  onPasteEntity,
  onSelectAll,
  onCopyEntity,
  onCutEntity,
  onDuplicateEntity,
  onDeleteEntity,
  onSaveAsPrefab,
}: SceneCanvasProps) {
  const images = useImageCache(assets);
  const {
    canvasRef,
    viewportRef,
    viewSize,
    pan,
    panning,
    setPanning,
    isSpacePressed,
    clientToWorld,
  } = useSceneViewport({ scene, isPlaying, viewResetKey, zoom, onZoomChange });

  const {
    cursor,
    paintOverlayForDraw,
    contextEntityIdRef,
    handleContextMenu,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  } = useCanvasInteractions({
    scene,
    guiComponents,
    zoom,
    isPlaying,
    activeTool,
    tilePaintMode,
    brushSize,
    paintTileId,
    snap,
    snapSize,
    selectedEntityIds,
    pan,
    panning,
    isSpacePressed,
    setPanning,
    clientToWorld,
    onSelect,
    onSelectGuiNode,
    onSelectComponentInstance,
    onTransform,
    onPolygonPointsChange,
    onPaintTiles,
    onSampleTile,
    onGuiAction,
    onSaveAsPrefab,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawSceneCanvas({
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
      paintOverlay: paintOverlayForDraw,
    });
  }, [
    scene,
    assets,
    images,
    selectedEntityIds,
    showGrid,
    showColliders,
    selectedGuiNodeId,
    guiComponents,
    selectedComponentInstanceId,
    showGuiTools,
    viewSize.w,
    viewSize.h,
    pan.x,
    pan.y,
    zoom,
    snapSize,
    isPlaying,
    playViewPan?.x,
    playViewPan?.y,
    activeTool,
    paintOverlayForDraw,
  ]);

  const contextMenuItems = buildCanvasContextMenuItems({
    selectedEntityId: contextEntityIdRef.current ?? [...selectedEntityIds][0],
    hasClipboard,
    onAddEntity,
    onPasteEntity,
    onSelectAll,
    onCopyEntity,
    onCutEntity,
    onDuplicateEntity,
    onDeleteEntity,
    onSaveAsPrefab,
  });

  return (
    <section
      id="tour-canvas-stage"
      className={cn(
        workspaceStyles["canvas-panel"],
        "relative min-h-0 overflow-hidden bg-bg-base",
        isPlaying && "shadow-[inset_0_0_0_2px_var(--accent-green)]"
      )}
    >
      <span
        id="tour-canvas-tour-anchor"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-4 h-px w-px"
      />
      <ContextMenu items={contextMenuItems} fill>
        <div
          ref={viewportRef}
          className={workspaceStyles["canvas-viewport"]}
          data-canvas-shell
          data-canvas-workspace
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            className="block h-full w-full outline-none [image-rendering:pixelated]"
            style={{ cursor }}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          />
        </div>
      </ContextMenu>

      {isPlaying && onVirtualInput && (
        <VirtualGameControls controls={virtualTouchControls} onInput={onVirtualInput} />
      )}
    </section>
  );
}
