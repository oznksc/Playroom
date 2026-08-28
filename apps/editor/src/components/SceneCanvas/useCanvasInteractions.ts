import type {
  GameKitScene,
  TransformComponent,
  GuiComponent,
  TilemapComponent,
} from "@gamekit/schema";
import type { CanvasTool, TilePaintMode } from "../../lib/editor-tools.js";
import { isTilePaintTool } from "../../lib/editor-tools.js";
import {
  fillRectCells,
  findTilemapHit,
  floodFill,
  stampBrush,
  type TileCell,
  type TilePaintOverlay,
} from "../../lib/tile-paint.js";
import { type PointerEvent, useMemo, useRef, useState } from "react";
import { hitEntity, hitGuiNode, hitComponentInstance, hitPolygonVertex } from "../../lib/canvas.js";
import { findComponent } from "../../lib/components.js";

type UseCanvasInteractionsOptions = {
  scene?: GameKitScene;
  guiComponents?: GuiComponent[];
  zoom: number;
  isPlaying: boolean;
  activeTool: CanvasTool;
  tilePaintMode: TilePaintMode;
  brushSize: number;
  paintTileId: number;
  snap: boolean;
  snapSize: number;
  selectedEntityIds: Set<string>;
  pan: { x: number; y: number };
  panning: unknown;
  isSpacePressed: boolean;
  setPanning: (
    val: { startX: number; startY: number; panStartX: number; panStartY: number } | undefined
  ) => void;
  clientToWorld: (clientX: number, clientY: number, el: HTMLElement) => { x: number; y: number };
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
  onGuiAction?: (action: string) => void;
  onSaveAsPrefab?: (id: string) => void;
};

export function useCanvasInteractions({
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
}: UseCanvasInteractionsOptions) {
  const contextEntityIdRef = useRef<string | undefined>();
  const [, setContextMenuTick] = useState(0);

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

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    return clientToWorld(event.clientX, event.clientY, event.currentTarget);
  }

  function hitEntityAtClient(clientX: number, clientY: number, el: HTMLElement) {
    if (!scene) return undefined;
    const point = clientToWorld(clientX, clientY, el);
    return [...scene.entities].reverse().find((entity) => hitEntity(entity, point));
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

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
    if (isPlaying || !scene) {
      contextEntityIdRef.current = undefined;
      return;
    }
    const hit = hitEntityAtClient(event.clientX, event.clientY, event.currentTarget);
    contextEntityIdRef.current = hit?.id;
    setContextMenuTick((t) => t + 1);
    if (hit) onSelect(hit.id, false);
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (isPlaying || !scene || !onSaveAsPrefab) return;
    event.preventDefault();
    const hit = hitEntityAtClient(event.clientX, event.clientY, event.currentTarget);
    if (!hit) return;
    onSelect(hit.id, false);
    onSaveAsPrefab(hit.id);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
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

    if (isPlaying && onGuiAction) {
      const guiNodes = scene.gui?.nodes ?? [];
      const hitGui = [...guiNodes].reverse().find((node) => hitGuiNode(node, point));
      if (hitGui && hitGui.type === "Button" && hitGui.action) {
        onGuiAction(hitGui.action);
        return;
      }
      const instances = scene.gui?.componentInstances ?? [];
      const hitInst = [...instances].reverse().find((inst) => {
        const comp = guiComponents?.find((c) => c.id === inst.componentId);
        return comp ? hitComponentInstance(inst, comp, point) : false;
      });
      if (hitInst) {
        const comp = guiComponents?.find((c) => c.id === hitInst.componentId);
        const btn = comp?.nodes.find((n) => n.type === "Button" && Boolean(n.action)) as
          { action?: string } | undefined;
        if (btn?.action) {
          onGuiAction(btn.action);
          return;
        }
      }
    }

    if (!isPlaying && scene.gui?.nodes?.length) {
      const hitGui = [...scene.gui.nodes].reverse().find((node) => hitGuiNode(node, point));
      if (hitGui) {
        onSelectGuiNode(hitGui.id);
        return;
      }
    }

    if (!isPlaying && scene.gui?.componentInstances?.length) {
      const hitInst = [...scene.gui.componentInstances].reverse().find((inst) => {
        const comp = guiComponents?.find((c) => c.id === inst.componentId);
        return comp ? hitComponentInstance(inst, comp, point) : false;
      });
      if (hitInst) {
        onSelectComponentInstance(hitInst.id);
        return;
      }
    }

    if (activeTool === "polygon-edit" && onPolygonPointsChange) {
      for (const entity of [...scene.entities].reverse()) {
        const polygon = findComponent(entity, "PolygonCollider") as
          { offset: { x: number; y: number }; points: { x: number; y: number }[] } | undefined;
        if (polygon && polygon.points.length >= 3) {
          const hitIdx = hitPolygonVertex(entity, point, zoom);
          if (hitIdx >= 0) {
            onSelect(entity.id, false);
            event.currentTarget.setPointerCapture(event.pointerId);
            setPolygonDrag({
              entityId: entity.id,
              vertexIndex: hitIdx,
              startPoints: polygon.points.map((p) => ({ ...p })),
              startPointer: { x: point.x, y: point.y },
            });
            return;
          }
        }
      }
    }

    const hit = [...scene.entities].reverse().find((entity) => hitEntity(entity, point));
    if (hit) {
      onSelect(hit.id, event.shiftKey);
      const transform = findComponent(hit, "Transform") as TransformComponent | undefined;
      const position = transform?.position ?? { x: 0, y: 0 };
      const rotation = transform?.rotation ?? 0;
      const scale = transform?.scale ?? { x: 1, y: 1 };
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({
        id: hit.id,
        dx: point.x - position.x,
        dy: point.y - position.y,
        startPosition: position,
        startRotation: rotation,
        startScale: scale,
        startPointer: { x: point.x, y: point.y },
      });
      return;
    }

    onSelect("", false);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (isTilePaintTool(activeTool) && scene && onPaintTiles && !isPlaying) {
      const point = pointerPosition(event);
      const hit = findTilemapHit(scene.entities, point, selectedEntityIds);
      if (!paintDraft && !paintRectStart) {
        setPaintHover(hit ? { entityId: hit.entityId, cell: hit.cell } : null);
        return;
      }
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
            { offset: { x: number; y: number }; points: { x: number; y: number }[] } | undefined)
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

    if (isTilePaintTool(activeTool) || activeTool === "select") {
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
  }

  function handlePointerUp() {
    if (paintRectStart && scene && onPaintTiles) {
      const entity = scene.entities.find((e) => e.id === paintRectStart.entityId);
      const tm = entity ? findComponent<TilemapComponent>(entity, "Tilemap") : undefined;
      const hover =
        paintHover?.entityId === paintRectStart.entityId ? paintHover.cell : paintRectStart.cell;
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
  }

  function handlePointerLeave() {
    if (!paintDraft && !paintRectStart) setPaintHover(null);
  }

  return {
    cursor,
    paintOverlayForDraw,
    contextEntityIdRef,
    handleContextMenu,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}
