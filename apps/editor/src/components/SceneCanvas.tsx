import type { GameKitAsset, GameKitScene, TransformComponent } from "@gamekit/schema";
import { ZoomIn, ZoomOut } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useImageCache } from "../hooks/useImageCache.js";
import { drawScene, hitEntity } from "../lib/canvas.js";
import { findComponent } from "../lib/components.js";

type SceneCanvasProps = {
  scene?: GameKitScene;
  assets: GameKitAsset[];
  selectedEntityId?: string;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, position: { x: number; y: number }) => void;
};

export function SceneCanvas({
  scene,
  assets,
  selectedEntityId,
  zoom,
  onSelect,
  onMove
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | undefined>();
  const images = useImageCache(assets);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !scene) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = scene.viewport.width * pixelRatio;
    canvas.height = scene.viewport.height * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawScene(context, scene, assets, images, selectedEntityId);
  }, [scene, assets, images, selectedEntityId]);

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!scene) {
      return { x: 0, y: 0 };
    }
    return {
      x: (event.clientX - rect.left) * (scene.viewport.width / rect.width),
      y: (event.clientY - rect.top) * (scene.viewport.height / rect.height)
    };
  }

  return (
    <section className="canvasPanel">
      <canvas
        ref={canvasRef}
        style={{
          aspectRatio: scene ? `${scene.viewport.width} / ${scene.viewport.height}` : "390 / 844"
        }}
        onPointerDown={(event) => {
          if (!scene) {
            return;
          }
          const point = pointerPosition(event);
          const hit = [...scene.entities].reverse().find((entity) => hitEntity(entity, point));
          if (!hit) {
            return;
          }
          const transform = findComponent<TransformComponent>(hit, "Transform");
          if (!transform) {
            return;
          }
          onSelect(hit.id);
          setDrag({ id: hit.id, dx: point.x - transform.position.x, dy: point.y - transform.position.y });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag) {
            return;
          }
          const point = pointerPosition(event);
          onMove(drag.id, { x: Math.round(point.x - drag.dx), y: Math.round(point.y - drag.dy) });
        }}
        onPointerUp={() => setDrag(undefined)}
      />
      <div className="canvas-controls">
        <button type="button" title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" title="Zoom in">
          <ZoomIn size={14} />
        </button>
      </div>
    </section>
  );
}
