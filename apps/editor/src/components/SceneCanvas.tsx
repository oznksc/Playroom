import type {
  GameKitAsset,
  GameKitScene,
  TransformComponent,
  GuiComponent,
  TilemapComponent,
} from "@gamekit/schema";
import type { CanvasTool, TilePaintMode } from "../lib/editor-tools.js";
import { isTilePaintTool } from "../lib/editor-tools.js";
import {
  fillRectCells,
  findTilemapHit,
  floodFill,
  stampBrush,
  type TileCell,
  type TilePaintOverlay,
} from "../lib/tile-paint.js";
import {
  Plus,
  ClipboardPaste,
  MousePointer,
  Copy,
  Scissors,
  Trash2,
  CopyPlus,
  Boxes,
} from "lucide-react";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useImageCache } from "../hooks/useImageCache.js";
import { hitEntity, hitGuiNode, hitComponentInstance, hitPolygonVertex } from "../lib/canvas.js";
import { findComponent } from "../lib/components.js";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu.js";
import { cn } from "@/ui";
import workspaceStyles from "./Workspace.module.css";
import { useSceneViewport } from "../hooks/useSceneViewport.js";
import { drawSceneCanvas } from "../lib/scene-canvas-drawing.js";
import {
  VirtualGameControls,
  type VirtualInputAction,
  type VirtualTouchControl,
} from "./SceneCanvasOverlays.js";

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
  /** Entity under the last right-click (context menu target). */
  const contextEntityIdRef = useRef<string | undefined>();
  const [, setContextMenuTick] = useState(0);

  // Drag states containing initial parameters
  const [drag, setDrag] = useState<
    | {
        id: string;
        dx: number;
        dy: number;
        startPosition: { x: number; y: number };
        startRotation: number;
        startScale: { x: number; y: number };
        startPointer: { x: number; y: number };
      }
    | undefined
  >();

  const [polygonDrag, setPolygonDrag] = useState<
    | {
        entityId: string;
        vertexIndex: number;
        startPoints: { x: number; y: number }[];
        startPointer: { x: number; y: number };
      }
    | undefined
  >();

  const [paintHover, setPaintHover] = useState<{ entityId: string; cell: TileCell } | null>(null);
  const [paintDraft, setPaintDraft] = useState<{ entityId: string; tiles: number[] } | null>(null);
  const [paintRectStart, setPaintRectStart] = useState<{ entityId: string; cell: TileCell } | null>(
    null
  );
  const paintMode = activeTool === "erase" ? "erase" : tilePaintMode;
  const paintOverlayForDraw = useMemo<TilePaintOverlay | null>(() => {
    if (!isTilePaintTool(activeTool) || isPlaying) return null;
    const entityId = paintDraft?.entityId ?? paintHover?.entityId ?? paintRectStart?.entityId;
    if (!entityId) return null;
    return {
      entityId,
      hover: paintHover?.entityId === entityId ? paintHover.cell : null,
      rectStart: paintRectStart?.entityId === entityId ? paintRectStart.cell : null,
      tileId: paintMode === "erase" ? 0 : paintTileId,
      brushSize,
      mode: paintMode,
      draftTiles: paintDraft?.entityId === entityId ? paintDraft.tiles : undefined,
    };
  }, [
    activeTool,
    isPlaying,
    paintDraft,
    paintHover,
    paintRectStart,
    paintMode,
    paintTileId,
    brushSize,
  ]);

  const images = useImageCache(assets);
  const {
    canvasRef,
    viewportRef,
    viewSize,
    pan,
    setPan,
    panning,
    setPanning,
    isSpacePressed,
    clientToWorld,
  } = useSceneViewport({ scene, isPlaying, viewResetKey, zoom, onZoomChange });

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

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    return clientToWorld(event.clientX, event.clientY, event.currentTarget);
  }

  function hitEntityAtClient(clientX: number, clientY: number, el: HTMLElement) {
    if (!scene) return undefined;
    const point = clientToWorld(clientX, clientY, el);
    return [...scene.entities].reverse().find((entity) => hitEntity(entity, point));
  }

  function resolveMenuEntityId(): string | undefined {
    return contextEntityIdRef.current ?? [...selectedEntityIds][0];
  }

  function getCanvasContextMenuItems(): ContextMenuItem[] {
    const selectedId = resolveMenuEntityId();
    const hasSelection = !!selectedId;

    return [
      {
        id: "add",
        label: "Add Entity",
        icon: <Plus size={14} />,
        onClick: onAddEntity,
      },
      {
        id: "paste",
        label: "Paste",
        icon: <ClipboardPaste size={14} />,
        shortcut: "⌘V",
        disabled: !hasClipboard,
        onClick: onPasteEntity,
      },
      { id: "sep1", label: "", separator: true },
      {
        id: "selectAll",
        label: "Select All",
        icon: <MousePointer size={14} />,
        shortcut: "⌘A",
        onClick: onSelectAll,
      },
      ...(hasSelection && selectedId
        ? [
            { id: "sep2", label: "", separator: true },
            {
              id: "copy",
              label: "Copy",
              icon: <Copy size={14} />,
              shortcut: "⌘C",
              onClick: () => onCopyEntity(selectedId),
            },
            {
              id: "cut",
              label: "Cut",
              icon: <Scissors size={14} />,
              shortcut: "⌘X",
              onClick: () => onCutEntity(selectedId),
            },
            {
              id: "duplicate",
              label: "Duplicate",
              icon: <CopyPlus size={14} />,
              shortcut: "⌘D",
              onClick: () => onDuplicateEntity(selectedId),
            },
            ...(onSaveAsPrefab
              ? [
                  {
                    id: "prefab",
                    label: "Save as Prefab…",
                    icon: <Boxes size={14} />,
                    onClick: () => onSaveAsPrefab(selectedId),
                  },
                ]
              : []),
            { id: "sep3", label: "", separator: true },
            {
              id: "delete",
              label: "Delete",
              icon: <Trash2 size={14} />,
              shortcut: "⌫",
              danger: true,
              onClick: () => onDeleteEntity(selectedId),
            },
          ]
        : []),
    ];
  }

  const cursor = panning
    ? "grabbing"
    : isSpacePressed
      ? "grab"
      : isTilePaintTool(activeTool)
        ? paintMode === "eyedropper"
          ? "copy"
          : "cell"
        : "crosshair";

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
      <ContextMenu items={getCanvasContextMenuItems()} fill>
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
            onContextMenu={(event) => {
              // Select entity under cursor so context actions (incl. prefab) target it
              if (isPlaying || !scene) {
                contextEntityIdRef.current = undefined;
                return;
              }
              const hit = hitEntityAtClient(event.clientX, event.clientY, event.currentTarget);
              contextEntityIdRef.current = hit?.id;
              setContextMenuTick((t) => t + 1);
              if (hit) onSelect(hit.id, false);
            }}
            onDoubleClick={(event) => {
              if (isPlaying || !scene || !onSaveAsPrefab) return;
              event.preventDefault();
              const hit = hitEntityAtClient(event.clientX, event.clientY, event.currentTarget);
              if (!hit) return;
              // Double-click entity → select + save as prefab
              onSelect(hit.id, false);
              onSaveAsPrefab(hit.id);
            }}
            onPointerDown={(event) => {
              // Always allow pan gestures on the full workspace
              if (
                event.button === 1 ||
                (event.button === 0 && event.altKey) ||
                (event.button === 0 && isSpacePressed)
              ) {
                event.currentTarget.setPointerCapture(event.pointerId);
                setPanning({
                  startX: event.clientX,
                  startY: event.clientY,
                  panStartX: pan.x,
                  panStartY: pan.y,
                });
                return;
              }

              if (!scene) {
                onSelect("", false);
                return;
              }

              const point = pointerPosition(event);

              // Tile paint / erase / fill / rect / eyedropper
              if (isTilePaintTool(activeTool) && onPaintTiles && !isPlaying) {
                const hit = findTilemapHit(scene.entities, point, selectedEntityIds);
                if (hit) {
                  onSelect(hit.entityId, false);
                  setPaintHover({ entityId: hit.entityId, cell: hit.cell });
                  const pick = paintMode === "eyedropper" || event.altKey;
                  if (pick) {
                    const idx = hit.cell.gy * hit.tilemap.gridWidth + hit.cell.gx;
                    onSampleTile?.(hit.tilemap.tiles[idx] ?? 0);
                    return;
                  }
                  const value = paintMode === "erase" ? 0 : paintTileId;
                  if (paintMode === "fill") {
                    onPaintTiles(
                      hit.entityId,
                      floodFill(
                        hit.tilemap.tiles,
                        hit.tilemap.gridWidth,
                        hit.tilemap.gridHeight,
                        hit.cell.gx,
                        hit.cell.gy,
                        value
                      )
                    );
                    return;
                  }
                  if (paintMode === "rect") {
                    setPaintRectStart({ entityId: hit.entityId, cell: hit.cell });
                    event.currentTarget.setPointerCapture(event.pointerId);
                    return;
                  }
                  const next = stampBrush(
                    hit.tilemap.tiles,
                    hit.tilemap.gridWidth,
                    hit.tilemap.gridHeight,
                    hit.cell.gx,
                    hit.cell.gy,
                    value,
                    brushSize
                  );
                  setPaintDraft({ entityId: hit.entityId, tiles: next });
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDrag({
                    id: hit.entityId,
                    dx: 0,
                    dy: 0,
                    startPosition: { x: 0, y: 0 },
                    startRotation: 0,
                    startScale: { x: 1, y: 1 },
                    startPointer: { x: point.x, y: point.y },
                  });
                  return;
                }
              }

              // Play mode: fire GUI Button actions (menu shell navigation)
              if (isPlaying && onGuiAction) {
                const guiNodes = scene.gui?.nodes ?? [];
                const hitGui = [...guiNodes].reverse().find((node) => hitGuiNode(node, point));
                if (hitGui && hitGui.type === "Button" && hitGui.action) {
                  onGuiAction(hitGui.action);
                  return;
                }
                const instances = scene.gui?.componentInstances ?? [];
                const compMap = new Map((guiComponents ?? []).map((c) => [c.id, c]));
                for (const inst of [...instances].reverse()) {
                  if (inst.visible === false) continue;
                  const comp = compMap.get(inst.componentId);
                  if (!comp) continue;
                  for (const node of [...comp.nodes].reverse()) {
                    if (node.visible === false || node.type !== "Button" || !node.action) continue;
                    const ox = node.x + inst.x;
                    const oy = node.y + inst.y;
                    if (
                      point.x >= ox &&
                      point.x <= ox + node.width &&
                      point.y >= oy &&
                      point.y <= oy + node.height
                    ) {
                      onGuiAction(node.action);
                      return;
                    }
                  }
                }
              }

              if (showGuiTools && !isPlaying) {
                const instances = scene.gui?.componentInstances ?? [];
                const compMap = new Map((guiComponents ?? []).map((c) => [c.id, c]));
                const hitInst = [...instances].reverse().find((inst) => {
                  const comp = compMap.get(inst.componentId);
                  return comp && hitComponentInstance(inst, comp, point);
                });
                if (hitInst) {
                  onSelectComponentInstance(hitInst.id);
                  return;
                }
                const guiNodes = scene.gui?.nodes ?? [];
                const hitGui = [...guiNodes].reverse().find((node) => hitGuiNode(node, point));
                if (hitGui) {
                  onSelectGuiNode(hitGui.id);
                  return;
                }
              }

              // Polygon vertex hit — only in polygon-edit mode
              if (activeTool === "polygon-edit" && !isPlaying) {
                for (const entity of [...scene.entities].reverse()) {
                  const vi = hitPolygonVertex(entity, point, zoom);
                  if (vi >= 0) {
                    onSelect(entity.id, false);
                    const polygon = findComponent(entity, "PolygonCollider") as
                      { points: { x: number; y: number }[] } | undefined;
                    if (polygon) {
                      setPolygonDrag({
                        entityId: entity.id,
                        vertexIndex: vi,
                        startPoints: polygon.points.map((p) => ({ ...p })),
                        startPointer: { x: point.x, y: point.y },
                      });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }
                    return;
                  }
                }
              }

              const hit = [...scene.entities].reverse().find((entity) => hitEntity(entity, point));
              if (!hit) {
                onSelect("", false);
                return;
              }

              const transform = findComponent<TransformComponent>(hit, "Transform");
              if (!transform) return;
              onSelect(hit.id, event.shiftKey);

              setDrag({
                id: hit.id,
                dx: point.x - transform.position.x,
                dy: point.y - transform.position.y,
                startPosition: { x: transform.position.x, y: transform.position.y },
                startRotation: transform.rotation,
                startScale: { x: transform.scale.x, y: transform.scale.y },
                startPointer: { x: point.x, y: point.y },
              });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (panning) {
                const z = zoom;
                const dx = (panning.startX - event.clientX) / z;
                const dy = (panning.startY - event.clientY) / z;
                setPan({ x: panning.panStartX + dx, y: panning.panStartY + dy });
                return;
              }
              if (isTilePaintTool(activeTool) && scene && !isPlaying) {
                const point = pointerPosition(event);
                const hit = findTilemapHit(scene.entities, point, selectedEntityIds);
                if (hit) setPaintHover({ entityId: hit.entityId, cell: hit.cell });
                else if (!paintRectStart && !paintDraft) setPaintHover(null);

                if (paintRectStart && hit && hit.entityId === paintRectStart.entityId) {
                  setPaintHover({ entityId: hit.entityId, cell: hit.cell });
                  return;
                }
                if (paintDraft && hit && hit.entityId === paintDraft.entityId) {
                  const value = paintMode === "erase" ? 0 : paintTileId;
                  setPaintDraft({
                    entityId: hit.entityId,
                    tiles: stampBrush(
                      paintDraft.tiles,
                      hit.tilemap.gridWidth,
                      hit.tilemap.gridHeight,
                      hit.cell.gx,
                      hit.cell.gy,
                      value,
                      brushSize
                    ),
                  });
                  return;
                }
                if (paintDraft || paintRectStart) return;
              }
              if (polygonDrag && scene && onPolygonPointsChange) {
                let point = pointerPosition(event);
                if (snap) {
                  point = {
                    x: Math.round(point.x / snapSize) * snapSize,
                    y: Math.round(point.y / snapSize) * snapSize,
                  };
                }
                const entity = scene.entities.find((e) => e.id === polygonDrag.entityId);
                const polygon = entity
                  ? (findComponent(entity, "PolygonCollider") as
                      | { offset: { x: number; y: number }; points: { x: number; y: number }[] }
                      | undefined)
                  : undefined;
                if (polygon) {
                  const ox =
                    (entity
                      ? (findComponent(entity, "Transform") as
                          { position: { x: number; y: number } } | undefined)
                      : undefined
                    )?.position.x ?? 0;
                  const oy =
                    (entity
                      ? (findComponent(entity, "Transform") as
                          { position: { x: number; y: number } } | undefined)
                      : undefined
                    )?.position.y ?? 0;
                  const newPoints = polygonDrag.startPoints.map((p, i) => {
                    if (i !== polygonDrag.vertexIndex) return p;
                    return {
                      x: Math.round(point.x - ox - polygon.offset.x),
                      y: Math.round(point.y - oy - polygon.offset.y),
                    };
                  });
                  onPolygonPointsChange(polygonDrag.entityId, newPoints);
                }
                return;
              }
              if (!drag || !scene) return;
              const point = pointerPosition(event);

              if (isTilePaintTool(activeTool)) {
                return;
              }

              if (activeTool === "select") {
                return;
              }

              if (activeTool === "translate") {
                let x = point.x - drag.dx;
                let y = point.y - drag.dy;
                if (snap) {
                  x = Math.round(x / snapSize) * snapSize;
                  y = Math.round(y / snapSize) * snapSize;
                }
                onTransform(drag.id, { position: { x: Math.round(x), y: Math.round(y) } });
                return;
              }

              if (activeTool === "rotate") {
                const deltaX = point.x - drag.startPointer.x;
                let rotation = drag.startRotation + Math.round(deltaX * 0.5);
                if (snap) {
                  rotation = Math.round(rotation / 15) * 15;
                }
                onTransform(drag.id, { rotation });
                return;
              }

              if (activeTool === "scale") {
                const deltaX = point.x - drag.startPointer.x;
                const deltaY = point.y - drag.startPointer.y;

                let sx = drag.startScale.x + deltaX * 0.01;
                let sy = drag.startScale.y - deltaY * 0.01;

                if (snap) {
                  sx = Math.round(sx / 0.1) * 0.1;
                  sy = Math.round(sy / 0.1) * 0.1;
                }

                sx = Math.max(0.1, Math.round(sx * 100) / 100);
                sy = Math.max(0.1, Math.round(sy * 100) / 100);

                onTransform(drag.id, { scale: { x: sx, y: sy } });
              }
            }}
            onPointerUp={() => {
              if (paintRectStart && scene && onPaintTiles) {
                const entity = scene.entities.find((e) => e.id === paintRectStart.entityId);
                const tm = entity ? findComponent<TilemapComponent>(entity, "Tilemap") : undefined;
                const hover =
                  paintHover?.entityId === paintRectStart.entityId
                    ? paintHover.cell
                    : paintRectStart.cell;
                if (tm) {
                  onPaintTiles(
                    paintRectStart.entityId,
                    fillRectCells(
                      tm.tiles,
                      tm.gridWidth,
                      tm.gridHeight,
                      paintRectStart.cell,
                      hover,
                      paintMode === "erase" ? 0 : paintTileId
                    )
                  );
                }
              } else if (paintDraft && onPaintTiles) {
                onPaintTiles(paintDraft.entityId, paintDraft.tiles);
              }
              setPaintDraft(null);
              setPaintRectStart(null);
              setDrag(undefined);
              setPanning(undefined);
              setPolygonDrag(undefined);
            }}
            onPointerLeave={() => {
              if (!paintDraft && !paintRectStart) setPaintHover(null);
            }}
          />
        </div>
      </ContextMenu>

      {isPlaying && onVirtualInput && (
        <VirtualGameControls controls={virtualTouchControls} onInput={onVirtualInput} />
      )}
    </section>
  );
}
