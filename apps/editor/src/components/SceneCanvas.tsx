import type { GameKitAsset, GameKitScene, TransformComponent, GuiComponent, TilemapComponent } from "@gamekit/schema";
import {
  ZoomIn,
  ZoomOut,
  Magnet,
  Plus,
  ClipboardPaste,
  MousePointer,
  Move,
  RefreshCcw,
  Maximize,
  Grid,
  Eye,
  EyeOff,
  Copy,
  Scissors,
  Trash2,
  CopyPlus,
  Focus,
  Paintbrush,
  Eraser,
} from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useImageCache } from "../hooks/useImageCache.js";
import { drawScene, hitEntity, hitGuiNode, hitComponentInstance } from "../lib/canvas.js";
import { findComponent } from "../lib/components.js";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu.js";

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
  activeTool: "select" | "translate" | "rotate" | "scale" | "paint" | "erase";
  showGrid: boolean;
  showColliders: boolean;
  snapSize: number;
  isPlaying: boolean;
  /** Active paint brush tile id (1-based tileset index; 0 clears). */
  paintTileId?: number;
  onVirtualInput?: (action: "left" | "right" | "jump", pressed: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onSnapToggle: (snap: boolean) => void;
  onSnapSizeChange: (size: number) => void;
  onActiveToolChange: (tool: "select" | "translate" | "rotate" | "scale" | "paint" | "erase") => void;
  onToggleGrid: (val: boolean) => void;
  onToggleColliders: (val: boolean) => void;
  onSelect: (id: string, shift: boolean) => void;
  onSelectGuiNode: (id: string) => void;
  onSelectComponentInstance: (id: string) => void;
  onTransform: (id: string, updates: { position?: { x: number; y: number }; rotation?: number; scale?: { x: number; y: number } }) => void;
  onPaintTile?: (entityId: string, gridX: number, gridY: number, tileId: number) => void;
  onAddEntity: () => void;
  onPasteEntity: () => void;
  onSelectAll: () => void;
  onCopyEntity: (id: string) => void;
  onCutEntity: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

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
  paintTileId = 1,
  onVirtualInput,
  onZoomChange,
  onSnapToggle,
  onSnapSizeChange,
  onActiveToolChange,
  onToggleGrid,
  onToggleColliders,
  onSelect,
  onSelectGuiNode,
  onSelectComponentInstance,
  onTransform,
  onPaintTile,
  onAddEntity,
  onPasteEntity,
  onSelectAll,
  onCopyEntity,
  onCutEntity,
  onDuplicateEntity,
  onDeleteEntity
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; panStartX: number; panStartY: number } | undefined>();
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const images = useImageCache(assets);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.metaKey || e.ctrlKey;
      const isInput = document.activeElement instanceof HTMLInputElement ||
                      document.activeElement instanceof HTMLTextAreaElement ||
                      document.activeElement instanceof HTMLSelectElement;

      if (!isInput) {
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
          setIsSpacePressed(true);
        }

        if (ctrl && (e.key === "=" || e.key === "+")) {
          e.preventDefault();
          onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1));
        } else if (ctrl && e.key === "-") {
          e.preventDefault();
          onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1));
        } else if (ctrl && e.key === "0") {
          e.preventDefault();
          onZoomChange(1);
          setPan({ x: 0, y: 0 });
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
  }, [zoom, onZoomChange, setPan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      if (event.ctrlKey) {
        // Pinch-to-zoom (trackpad) or Ctrl + scroll wheel
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)));
      } else {
        // 2-finger panning (trackpad) or mouse wheel panning
        setPan((prev) => ({
          x: prev.x + event.deltaX / zoom,
          y: prev.y + event.deltaY / zoom,
        }));
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !scene) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = scene.viewport.width * pixelRatio;
    canvas.height = scene.viewport.height * pixelRatio;
    canvas.style.width = `${scene.viewport.width}px`;
    canvas.style.height = `${scene.viewport.height}px`;

    context.resetTransform();
    context.scale(pixelRatio, pixelRatio);
    drawScene(context, scene, assets, images, selectedEntityIds, showGrid, showColliders, selectedGuiNodeId, guiComponents, selectedComponentInstanceId, showGuiTools);
  }, [scene, assets, images, selectedEntityIds, showGrid, showColliders, selectedGuiNodeId, guiComponents, selectedComponentInstanceId, showGuiTools]);

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!scene) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left) / zoom + pan.x,
      y: (event.clientY - rect.top) / zoom + pan.y
    };
  }

  function getCanvasContextMenuItems(): ContextMenuItem[] {
    const hasSelection = selectedEntityIds.size > 0;
    const selectedId = [...selectedEntityIds][0];

    return [
      {
        id: "add",
        label: "Add Entity",
        icon: <Plus size={14} />,
        onClick: onAddEntity
      },
      {
        id: "paste",
        label: "Paste",
        icon: <ClipboardPaste size={14} />,
        shortcut: "⌘V",
        disabled: !hasClipboard,
        onClick: onPasteEntity
      },
      { id: "sep1", label: "", separator: true },
      {
        id: "selectAll",
        label: "Select All",
        icon: <MousePointer size={14} />,
        shortcut: "⌘A",
        onClick: onSelectAll
      },
      ...(hasSelection && selectedId ? [
        { id: "sep2", label: "", separator: true },
        {
          id: "copy",
          label: "Copy",
          icon: <Copy size={14} />,
          shortcut: "⌘C",
          onClick: () => onCopyEntity(selectedId)
        },
        {
          id: "cut",
          label: "Cut",
          icon: <Scissors size={14} />,
          shortcut: "⌘X",
          onClick: () => onCutEntity(selectedId)
        },
        {
          id: "duplicate",
          label: "Duplicate",
          icon: <CopyPlus size={14} />,
          shortcut: "⌘D",
          onClick: () => onDuplicateEntity(selectedId)
        },
        { id: "sep3", label: "", separator: true },
        {
          id: "delete",
          label: "Delete",
          icon: <Trash2 size={14} />,
          shortcut: "⌫",
          danger: true,
          onClick: () => onDeleteEntity(selectedId)
        }
      ] : [])
    ];
  }

  const containerStyle: React.CSSProperties = scene
    ? {
        width: scene.viewport.width,
        height: scene.viewport.height,
        transform: `scale(${zoom}) translate(${-pan.x}px, ${-pan.y}px)`,
        transformOrigin: "0 0",
        cursor: panning ? "grabbing" : isSpacePressed ? "grab" : "default",
      }
    : {};

  return (
    <section className={`canvasPanel ${isPlaying ? "live-simulating" : ""}`}>
      {isPlaying && (
        <div className="play-mode-banner" role="status">
          <span className="play-mode-dot" />
          PLAY MODE — Arrow keys / WASD / Space · On-screen pad below
        </div>
      )}

      {/* Floating HUD - Left Side: Transform Tools & Snap settings */}
      <div className="canvas-hud-toolbar hud-left">
        <div className="hud-button-group">
          <button
            type="button"
            className={activeTool === "select" ? "hud-btn active" : "hud-btn"}
            onClick={() => onActiveToolChange("select")}
            title="Selection Tool (Q)"
          >
            <MousePointer size={14} />
          </button>
          <button
            type="button"
            className={activeTool === "translate" ? "hud-btn active" : "hud-btn"}
            onClick={() => onActiveToolChange("translate")}
            title="Translate Gizmo (W)"
          >
            <Move size={14} />
          </button>
          <button
            type="button"
            className={activeTool === "rotate" ? "hud-btn active" : "hud-btn"}
            onClick={() => onActiveToolChange("rotate")}
            title="Rotate Tool (E)"
          >
            <RefreshCcw size={14} />
          </button>
          <button
            type="button"
            className={activeTool === "scale" ? "hud-btn active" : "hud-btn"}
            onClick={() => onActiveToolChange("scale")}
            title="Scale Gizmo (R)"
          >
            <Maximize size={14} />
          </button>
          <button
            type="button"
            className={activeTool === "paint" ? "hud-btn active" : "hud-btn"}
            onClick={() => onActiveToolChange("paint")}
            title="Tile paint (B)"
          >
            <Paintbrush size={14} />
          </button>
          <button
            type="button"
            className={activeTool === "erase" ? "hud-btn active" : "hud-btn"}
            onClick={() => onActiveToolChange("erase")}
            title="Tile erase (X)"
          >
            <Eraser size={14} />
          </button>
        </div>

        <div className="hud-divider" />

        <div className="hud-button-group">
          <button
            type="button"
            className={snap ? "hud-btn active" : "hud-btn"}
            onClick={() => onSnapToggle(!snap)}
            title="Toggle Snap to Grid"
          >
            <Magnet size={14} />
          </button>
          {snap && (
            <select
              className="hud-select"
              value={snapSize}
              onChange={(e) => onSnapSizeChange(Number(e.target.value))}
              title="Grid Snapping Dimension"
            >
              <option value="8">8px</option>
              <option value="16">16px</option>
              <option value="32">32px</option>
              <option value="64">64px</option>
            </select>
          )}
        </div>
      </div>

      {/* Floating HUD - Right Side: Grid toggles, Colliders, reset */}
      <div className="canvas-hud-toolbar hud-right">
        <div className="hud-button-group">
          <button
            type="button"
            className={showGrid ? "hud-btn active" : "hud-btn"}
            onClick={() => onToggleGrid(!showGrid)}
            title="Toggle Visual Grid"
          >
            <Grid size={14} />
          </button>
          <button
            type="button"
            className={showColliders ? "hud-btn active" : "hud-btn"}
            onClick={() => onToggleColliders(!showColliders)}
            title="Toggle Collider Geometry"
          >
            {showColliders ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>

        <div className="hud-divider" />

        <div className="hud-button-group">
          <button
            type="button"
            className="hud-btn"
            onClick={() => { onZoomChange(1); setPan({ x: 0, y: 0 }); }}
            title="Center Canvas camera"
          >
            <Focus size={14} />
          </button>
        </div>
      </div>

      <ContextMenu items={getCanvasContextMenuItems()}>
        <div className="canvas-viewport">
          <div style={containerStyle}>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              onPointerDown={(event) => {
                if (!scene) return;

                if (event.button === 1 || (event.button === 0 && event.altKey) || (event.button === 0 && isSpacePressed)) {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setPanning({ startX: event.clientX, startY: event.clientY, panStartX: pan.x, panStartY: pan.y });
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
                          activeTool === "erase" ? 0 : paintTileId,
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
                  // Check component instances first (highest layer)
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
                  // Check loose GUI nodes next
                  const guiNodes = scene.gui?.nodes ?? [];
                  const hitGui = [...guiNodes].reverse().find((node) => hitGuiNode(node, point));
                  if (hitGui) {
                    onSelectGuiNode(hitGui.id);
                    return;
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
                
                // Store starting transform structures
                setDrag({
                  id: hit.id,
                  dx: point.x - transform.position.x,
                  dy: point.y - transform.position.y,
                  startPosition: { x: transform.position.x, y: transform.position.y },
                  startRotation: transform.rotation,
                  startScale: { x: transform.scale.x, y: transform.scale.y },
                  startPointer: { x: point.x, y: point.y }
                });
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (panning) {
                  const dx = (panning.startX - event.clientX) / zoom;
                  const dy = (panning.startY - event.clientY) / zoom;
                  setPan({ x: panning.panStartX + dx, y: panning.panStartY + dy });
                  return;
                }
                if (!drag || !scene) return;
                const point = pointerPosition(event);

                // Paint drag
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

                // Q: Raw select mode - dragging disabled
                if (activeTool === "select") {
                  return;
                }

                // W: Translate mode
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

                // E: Rotate mode
                if (activeTool === "rotate") {
                  const deltaX = point.x - drag.startPointer.x;
                  let rotation = drag.startRotation + Math.round(deltaX * 0.5);
                  if (snap) {
                    // Snap rotation to 15-degree increments
                    rotation = Math.round(rotation / 15) * 15;
                  }
                  onTransform(drag.id, { rotation });
                  return;
                }

                // R: Scale mode
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
                  return;
                }
              }}
              onPointerUp={() => { setDrag(undefined); setPanning(undefined); }}
            />
          </div>
        </div>
      </ContextMenu>

      {/* Floating Status Badge / Play indicators overlay */}
      {isPlaying && (
        <div className="canvas-playing-overlay">
          <div className="playing-pulse" />
          <span>SIMULATION MODE ACTIVE</span>
        </div>
      )}

      {isPlaying && onVirtualInput && (
        <div className="virtual-controls" aria-label="Virtual game controls">
          <div className="virtual-dpad">
            <button
              type="button"
              className="virtual-btn"
              onPointerDown={(e) => { e.preventDefault(); onVirtualInput("left", true); }}
              onPointerUp={() => onVirtualInput("left", false)}
              onPointerLeave={() => onVirtualInput("left", false)}
              onPointerCancel={() => onVirtualInput("left", false)}
            >
              ◀
            </button>
            <button
              type="button"
              className="virtual-btn"
              onPointerDown={(e) => { e.preventDefault(); onVirtualInput("right", true); }}
              onPointerUp={() => onVirtualInput("right", false)}
              onPointerLeave={() => onVirtualInput("right", false)}
              onPointerCancel={() => onVirtualInput("right", false)}
            >
              ▶
            </button>
          </div>
          <button
            type="button"
            className="virtual-btn virtual-jump"
            onPointerDown={(e) => { e.preventDefault(); onVirtualInput("jump", true); }}
            onPointerUp={() => onVirtualInput("jump", false)}
            onPointerLeave={() => onVirtualInput("jump", false)}
            onPointerCancel={() => onVirtualInput("jump", false)}
          >
            ▲ Jump
          </button>
        </div>
      )}

      {/* Canvas Foot Controls */}
      <div className="canvas-controls">
        <button type="button" onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))} title="Zoom out">
          <ZoomOut size={13} />
        </button>
        <span className="zoom-text">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))} title="Zoom in">
          <ZoomIn size={13} />
        </button>
      </div>
    </section>
  );
}
