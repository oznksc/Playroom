import type { GameKitAsset, GameKitScene, TransformComponent, GuiComponent, TilemapComponent } from "@gamekit/schema";
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
import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { useImageCache } from "../hooks/useImageCache.js";
import {
  drawScene,
  drawSceneFrame,
  drawScreenSpaceText,
  drawWorldGrid,
  hitEntity,
  hitGuiNode,
  hitComponentInstance,
  hitPolygonVertex,
} from "../lib/canvas.js";
import { findComponent } from "../lib/components.js";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu.js";
import { cn } from "@/ui";

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
  activeTool: "select" | "translate" | "rotate" | "scale" | "paint" | "erase" | "polygon-edit";
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
  onVirtualInput?: (action: "left" | "right" | "jump", pressed: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onSnapToggle: (snap: boolean) => void;
  onSnapSizeChange: (size: number) => void;
  onActiveToolChange: (tool: "select" | "translate" | "rotate" | "scale" | "paint" | "erase" | "polygon-edit") => void;
  onToggleGrid: (val: boolean) => void;
  onToggleColliders: (val: boolean) => void;
  onSelect: (id: string, shift: boolean) => void;
  onSelectGuiNode: (id: string) => void;
  onSelectComponentInstance: (id: string) => void;
  onTransform: (id: string, updates: { position?: { x: number; y: number }; rotation?: number; scale?: { x: number; y: number } }) => void;
  onPolygonPointsChange?: (id: string, points: { x: number; y: number }[]) => void;
  onPaintTile?: (entityId: string, gridX: number, gridY: number, tileId: number) => void;
  onAddEntity: () => void;
  onPasteEntity: () => void;
  onSelectAll: () => void;
  onCopyEntity: (id: string) => void;
  onCutEntity: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
  onSaveAsPrefab?: (id: string) => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const VOID_COLOR = "#090c12";

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
  showGrid,
  showColliders,
  snapSize,
  isPlaying,
  playViewPan = null,
  paintTileId = 1,
  viewResetKey = 0,
  onVirtualInput,
  onZoomChange,
  onSelect,
  onSelectGuiNode,
  onSelectComponentInstance,
  onTransform,
  onPolygonPointsChange,
  onPaintTile,
  onAddEntity,
  onPasteEntity,
  onSelectAll,
  onCopyEntity,
  onCutEntity,
  onDuplicateEntity,
  onDeleteEntity,
  onSaveAsPrefab,
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  /** Entity under the last right-click (context menu target). */
  const contextEntityIdRef = useRef<string | undefined>();
  const [, setContextMenuTick] = useState(0);

  // Drag states containing initial parameters
  const [drag, setDrag] = useState<{
    id: string;
    dx: number;
    dy: number;
    startPosition: { x: number; y: number };
    startRotation: number;
    startScale: { x: number; y: number };
    startPointer: { x: number; y: number };
  } | undefined>();

  const [polygonDrag, setPolygonDrag] = useState<{
    entityId: string;
    vertexIndex: number;
    startPoints: { x: number; y: number }[];
    startPointer: { x: number; y: number };
  } | undefined>();

  /** World-space top-left of the visible view: screen = (world - pan) * zoom */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const [panning, setPanning] = useState<{
    startX: number;
    startY: number;
    panStartX: number;
    panStartY: number;
  } | undefined>();
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const images = useImageCache(assets);
  const didInitialCenter = useRef(false);

  const centerSceneInView = useCallback(
    (nextZoom = zoomRef.current) => {
      if (!scene || viewSize.w <= 0 || viewSize.h <= 0) return;
      setPan({
        x: scene.viewport.width / 2 - viewSize.w / (2 * nextZoom),
        y: scene.viewport.height / 2 - viewSize.h / (2 * nextZoom),
      });
    },
    [scene, viewSize.w, viewSize.h]
  );

  // Full-bleed viewport size
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setViewSize({
        w: Math.max(1, Math.floor(cr.width)),
        h: Math.max(1, Math.floor(cr.height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Center when requested (tab bar “Center”)
  useEffect(() => {
    if (!viewResetKey) return;
    if (isPlaying) return;
    centerSceneInView();
  }, [viewResetKey, centerSceneInView, isPlaying]);

  // First layout: center the game viewport in the workspace
  useEffect(() => {
    if (didInitialCenter.current) return;
    if (!scene || viewSize.w <= 0) return;
    didInitialCenter.current = true;
    centerSceneInView();
  }, [scene, viewSize.w, viewSize.h, centerSceneInView]);

  // Enter play: lock editor canvas on the design game screen (do not pan workspace)
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (!wasPlayingRef.current && isPlaying) {
      // Snap workspace so the fixed game frame is centered and fully visible
      centerSceneInView();
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, centerSceneInView]);

  // Re-center when switching scenes (file id change via viewport dims + name)
  const sceneKey = scene ? `${scene.id}:${scene.viewport.width}x${scene.viewport.height}` : "";
  const prevSceneKey = useRef(sceneKey);
  useEffect(() => {
    if (!sceneKey || prevSceneKey.current === sceneKey) {
      prevSceneKey.current = sceneKey;
      return;
    }
    prevSceneKey.current = sceneKey;
    centerSceneInView();
  }, [sceneKey, centerSceneInView]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.metaKey || e.ctrlKey;
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;

      if (!isInput) {
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
          setIsSpacePressed(true);
        }

        if (ctrl && (e.key === "=" || e.key === "+")) {
          e.preventDefault();
          onZoomChange(Math.min(MAX_ZOOM, zoomRef.current + 0.1));
        } else if (ctrl && e.key === "-") {
          e.preventDefault();
          onZoomChange(Math.max(MIN_ZOOM, zoomRef.current - 0.1));
        } else if (ctrl && e.key === "0") {
          e.preventDefault();
          onZoomChange(1);
          centerSceneInView(1);
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === " ") {
        setIsSpacePressed(false);
      }
    }

    function handleBlur() {
      setIsSpacePressed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onZoomChange, centerSceneInView]);

  // Wheel pan / pinch-zoom over the entire viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const target = canvasRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const z = zoomRef.current;
      const p = panRef.current;
      const worldX = sx / z + p.x;
      const worldY = sy / z + p.y;

      if (event.ctrlKey || event.metaKey) {
        const delta = event.deltaY > 0 ? -0.08 : 0.08;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 100) / 100));
        setPan({
          x: worldX - sx / next,
          y: worldY - sy / next,
        });
        onZoomChange(next);
      } else {
        setPan((prev) => ({
          x: prev.x + event.deltaX / z,
          y: prev.y + event.deltaY / z,
        }));
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [onZoomChange]);

  // Full-viewport draw: void + world grid + scene + frame
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || viewSize.w <= 0 || viewSize.h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = viewSize.w;
    const cssH = viewSize.h;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    // Void fill (screen space)
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = VOID_COLOR;
    context.fillRect(0, 0, cssW, cssH);

    // World transform: screen = (world - pan) * zoom
    context.setTransform(
      dpr * zoom,
      0,
      0,
      dpr * zoom,
      -pan.x * zoom * dpr,
      -pan.y * zoom * dpr
    );

    const worldLeft = pan.x;
    const worldTop = pan.y;
    const worldRight = pan.x + cssW / zoom;
    const worldBottom = pan.y + cssH / zoom;

    if (showGrid) {
      drawWorldGrid(context, worldLeft, worldTop, worldRight, worldBottom, zoom, snapSize || 32);
    }

    if (scene) {
      const vw = scene.viewport.width;
      const vh = scene.viewport.height;
      // Game camera lives only inside the locked screen (0,0)–(vw,vh)
      const camX = isPlaying && playViewPan ? playViewPan.x : 0;
      const camY = isPlaying && playViewPan ? playViewPan.y : 0;

      if (isPlaying) {
        // Fixed game screen background
        context.fillStyle = scene.viewport.background;
        context.fillRect(0, 0, vw, vh);

        // Clip + scroll world only inside the game screen — editor canvas pan stays put
        context.save();
        context.beginPath();
        context.rect(0, 0, vw, vh);
        context.clip();
        context.translate(-camX, -camY);

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
          { skipViewportChrome: true, skipScreenSpaceText: true, activeTool },
        );
        context.restore();

        // HUD text stays fixed to the game screen (not world camera)
        context.save();
        context.beginPath();
        context.rect(0, 0, vw, vh);
        context.clip();
        drawScreenSpaceText(context, scene);
        context.restore();

        drawSceneFrame(
          context,
          vw,
          vh,
          zoom,
          { worldLeft, worldTop, worldRight, worldBottom },
          `Play  ${Math.round(vw)}×${Math.round(vh)}`,
        );
      } else {
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
          { activeTool },
        );
        drawSceneFrame(context, vw, vh, zoom, {
          worldLeft,
          worldTop,
          worldRight,
          worldBottom,
        });
      }
    }
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
  ]);

  function clientToWorld(clientX: number, clientY: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const z = zoom;
    return {
      x: (clientX - rect.left) / z + pan.x,
      y: (clientY - rect.top) / z + pan.y,
    };
  }

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
      : activeTool === "paint" || activeTool === "erase"
        ? "cell"
        : "crosshair";

  return (
    <section
      className={cn(
        "canvas-panel relative min-h-0 overflow-hidden bg-bg-base",
        isPlaying && "shadow-[inset_0_0_0_2px_var(--accent-green)]"
      )}
    >
      <ContextMenu items={getCanvasContextMenuItems()} fill>
        <div
          ref={viewportRef}
          className="canvas-viewport"
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

              // Tile paint / erase — paint on selected tilemap entity or hit tilemap
              if ((activeTool === "paint" || activeTool === "erase") && onPaintTile && !isPlaying) {
                const tileTarget =
                  [...selectedEntityIds]
                    .map((id) => scene.entities.find((e) => e.id === id))
                    .find((e) => e && findComponent(e, "Tilemap")) ??
                  [...scene.entities].reverse().find((entity) => {
                    const tm = findComponent<TilemapComponent>(entity, "Tilemap");
                    const tr = findComponent<TransformComponent>(entity, "Transform");
                    if (!tm || !tr) return false;
                    const gx = Math.floor((point.x - tr.position.x) / tm.tileWidth);
                    const gy = Math.floor((point.y - tr.position.y) / tm.tileHeight);
                    return gx >= 0 && gy >= 0 && gx < tm.gridWidth && gy < tm.gridHeight;
                  });
                if (tileTarget) {
                  const tm = findComponent<TilemapComponent>(tileTarget, "Tilemap");
                  const tr = findComponent<TransformComponent>(tileTarget, "Transform");
                  if (tm && tr) {
                    const gx = Math.floor((point.x - tr.position.x) / tm.tileWidth);
                    const gy = Math.floor((point.y - tr.position.y) / tm.tileHeight);
                    if (gx >= 0 && gy >= 0 && gx < tm.gridWidth && gy < tm.gridHeight) {
                      onSelect(tileTarget.id, false);
                      onPaintTile(
                        tileTarget.id,
                        gx,
                        gy,
                        activeTool === "erase" ? 0 : paintTileId
                      );
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDrag({
                        id: tileTarget.id,
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
                }
              }

              if (showGuiTools) {
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
                    const polygon = findComponent(entity, "PolygonCollider") as { points: { x: number; y: number }[] } | undefined;
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

              const hit = [...scene.entities]
                .reverse()
                .find((entity) => hitEntity(entity, point));
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
              if (polygonDrag && scene && onPolygonPointsChange) {
                let point = pointerPosition(event);
                if (snap) {
                  point = {
                    x: Math.round(point.x / snapSize) * snapSize,
                    y: Math.round(point.y / snapSize) * snapSize,
                  };
                }
                const entity = scene.entities.find((e) => e.id === polygonDrag.entityId);
                const polygon = entity ? findComponent(entity, "PolygonCollider") as { offset: { x: number; y: number }; points: { x: number; y: number }[] } | undefined : undefined;
                if (polygon) {
                  const ox = (entity ? findComponent(entity, "Transform") as { position: { x: number; y: number } } | undefined : undefined)?.position.x ?? 0;
                  const oy = (entity ? findComponent(entity, "Transform") as { position: { x: number; y: number } } | undefined : undefined)?.position.y ?? 0;
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

              if ((activeTool === "paint" || activeTool === "erase") && onPaintTile) {
                const entity = scene.entities.find((e) => e.id === drag.id);
                const tm = entity ? findComponent<TilemapComponent>(entity, "Tilemap") : undefined;
                const tr = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
                if (tm && tr) {
                  const gx = Math.floor((point.x - tr.position.x) / tm.tileWidth);
                  const gy = Math.floor((point.y - tr.position.y) / tm.tileHeight);
                  if (gx >= 0 && gy >= 0 && gx < tm.gridWidth && gy < tm.gridHeight) {
                    onPaintTile(drag.id, gx, gy, activeTool === "erase" ? 0 : paintTileId);
                  }
                }
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
              setDrag(undefined);
              setPanning(undefined);
              setPolygonDrag(undefined);
            }}
          />
        </div>
      </ContextMenu>

      {isPlaying && onVirtualInput && (
        <div className="canvas-virtual-pad" aria-label="Virtual game controls">
          <div className="flex gap-1">
            {(
              [
                ["left", "◀"],
                ["right", "▶"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                type="button"
                className="flex size-11 items-center justify-center rounded-md border border-border-default bg-bg-surface/90 text-sm text-text-primary shadow-md active:border-accent active:bg-accent-muted"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onVirtualInput(action, true);
                }}
                onPointerUp={() => onVirtualInput(action, false)}
                onPointerLeave={() => onVirtualInput(action, false)}
                onPointerCancel={() => onVirtualInput(action, false)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex h-11 items-center justify-center rounded-md border border-border-default bg-bg-surface/90 px-4 text-[11px] font-semibold text-text-primary shadow-md active:border-accent-green active:bg-accent-green/15"
            onPointerDown={(e) => {
              e.preventDefault();
              onVirtualInput("jump", true);
            }}
            onPointerUp={() => onVirtualInput("jump", false)}
            onPointerLeave={() => onVirtualInput("jump", false)}
            onPointerCancel={() => onVirtualInput("jump", false)}
          >
            ▲ Jump
          </button>
        </div>
      )}
    </section>
  );
}
