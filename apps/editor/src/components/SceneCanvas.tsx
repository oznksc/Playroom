import type { GameKitAsset, GameKitScene, TransformComponent } from "@gamekit/schema";
import { ZoomIn, ZoomOut, Magnet } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useImageCache } from "../hooks/useImageCache.js";
import { drawScene, hitEntity } from "../lib/canvas.js";
import { findComponent } from "../lib/components.js";

type SceneCanvasProps = {
  scene?: GameKitScene;
  assets: GameKitAsset[];
  selectedEntityIds: Set<string>;
  zoom: number;
  snap: boolean;
  onZoomChange: (zoom: number) => void;
  onSnapToggle: (snap: boolean) => void;
  onSelect: (id: string, shift: boolean) => void;
  onMove: (id: string, position: { x: number; y: number }) => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const GRID_SIZE = 32;

export function SceneCanvas({
  scene,
  assets,
  selectedEntityIds,
  zoom,
  snap,
  onZoomChange,
  onSnapToggle,
  onSelect,
  onMove
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | undefined>();
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; panStartX: number; panStartY: number } | undefined>();
  const images = useImageCache(assets);

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
    drawScene(context, scene, assets, images, selectedEntityIds);
  }, [scene, assets, images, selectedEntityIds]);

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!scene) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left) / zoom + pan.x,
      y: (event.clientY - rect.top) / zoom + pan.y
    };
  }

  const containerStyle: React.CSSProperties = scene
    ? {
        width: scene.viewport.width,
        height: scene.viewport.height,
        transform: `scale(${zoom}) translate(${-pan.x}px, ${-pan.y}px)`,
        transformOrigin: "0 0",
        cursor: panning ? "grabbing" : "default",
      }
    : {};

  return (
    <section className="canvasPanel">
      <div className="canvas-viewport">
        <div style={containerStyle}>
          <canvas
            ref={canvasRef}
            onPointerDown={(event) => {
              if (!scene) return;

              if (event.button === 1 || (event.button === 0 && event.altKey)) {
                event.currentTarget.setPointerCapture(event.pointerId);
                setPanning({ startX: event.clientX, startY: event.clientY, panStartX: pan.x, panStartY: pan.y });
                return;
              }

              const point = pointerPosition(event);
              const hit = [...scene.entities].reverse().find((entity) => hitEntity(entity, point));
              if (!hit) return;
              const transform = findComponent<TransformComponent>(hit, "Transform");
              if (!transform) return;
              onSelect(hit.id, event.shiftKey);
              setDrag({ id: hit.id, dx: point.x - transform.position.x, dy: point.y - transform.position.y });
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
              let x = point.x - drag.dx;
              let y = point.y - drag.dy;
              if (snap) {
                x = Math.round(x / GRID_SIZE) * GRID_SIZE;
                y = Math.round(y / GRID_SIZE) * GRID_SIZE;
              }
              onMove(drag.id, { x: Math.round(x), y: Math.round(y) });
            }}
            onPointerUp={() => { setDrag(undefined); setPanning(undefined); }}
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY > 0 ? -0.1 : 0.1;
              onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)));
            }}
          />
        </div>
      </div>
      <div className="canvas-controls">
        <button type="button" onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))} title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))} title="Zoom in">
          <ZoomIn size={14} />
        </button>
        <button type="button" className="canvas-reset-button" onClick={() => { onZoomChange(1); setPan({ x: 0, y: 0 }); }} title="Reset view">
          Reset
        </button>
        <button
          type="button"
          className={snap ? "canvas-snap active" : "canvas-snap"}
          onClick={() => onSnapToggle(!snap)}
          title="Toggle grid snap"
        >
          <Magnet size={12} />
        </button>
      </div>
    </section>
  );
}