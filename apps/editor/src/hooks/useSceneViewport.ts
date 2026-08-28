import type { GameKitScene } from "@gamekit/schema";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export interface ViewportPanGesture {
  startX: number;
  startY: number;
  panStartX: number;
  panStartY: number;
}

interface UseSceneViewportOptions {
  scene?: GameKitScene;
  isPlaying: boolean;
  viewResetKey: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function useSceneViewport({
  scene,
  isPlaying,
  viewResetKey,
  zoom,
  onZoomChange,
}: UseSceneViewportOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<ViewportPanGesture>();
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const didInitialCenter = useRef(false);
  const wasPlayingRef = useRef(false);

  panRef.current = pan;
  zoomRef.current = zoom;

  const centerSceneInView = useCallback(
    (nextZoom = zoomRef.current) => {
      if (!scene || viewSize.w <= 0 || viewSize.h <= 0) return;
      setPan({
        x: scene.viewport.width / 2 - viewSize.w / (2 * nextZoom),
        y: scene.viewport.height / 2 - viewSize.h / (2 * nextZoom),
      });
    },
    [scene, viewSize.w, viewSize.h],
  );

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setViewSize({
        w: Math.max(1, Math.floor(rect.width)),
        h: Math.max(1, Math.floor(rect.height)),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!viewResetKey || isPlaying) return;
    centerSceneInView();
  }, [viewResetKey, centerSceneInView, isPlaying]);

  useEffect(() => {
    if (didInitialCenter.current || !scene || viewSize.w <= 0) return;
    didInitialCenter.current = true;
    centerSceneInView();
  }, [scene, viewSize.w, viewSize.h, centerSceneInView]);

  useEffect(() => {
    if (!wasPlayingRef.current && isPlaying) centerSceneInView();
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, centerSceneInView]);

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
    function handleKeyDown(event: KeyboardEvent) {
      const ctrl = event.metaKey || event.ctrlKey;
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;

      if (isInput) return;
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        setIsSpacePressed(true);
      }
      if (ctrl && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        onZoomChange(Math.min(MAX_ZOOM, zoomRef.current + 0.1));
      } else if (ctrl && event.key === "-") {
        event.preventDefault();
        onZoomChange(Math.max(MIN_ZOOM, zoomRef.current - 0.1));
      } else if (ctrl && event.key === "0") {
        event.preventDefault();
        onZoomChange(1);
        centerSceneInView(1);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space" || event.key === " ") setIsSpacePressed(false);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const target = canvasRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const worldX = screenX / currentZoom + currentPan.x;
      const worldY = screenY / currentZoom + currentPan.y;

      if (event.ctrlKey || event.metaKey) {
        const delta = event.deltaY > 0 ? -0.08 : 0.08;
        const nextZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, Math.round((currentZoom + delta) * 100) / 100),
        );
        setPan({
          x: worldX - screenX / nextZoom,
          y: worldY - screenY / nextZoom,
        });
        onZoomChange(nextZoom);
      } else {
        setPan((previous) => ({
          x: previous.x + event.deltaX / currentZoom,
          y: previous.y + event.deltaY / currentZoom,
        }));
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [onZoomChange]);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number, element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / zoom + pan.x,
        y: (clientY - rect.top) / zoom + pan.y,
      };
    },
    [pan.x, pan.y, zoom],
  );

  return {
    canvasRef,
    viewportRef,
    viewSize,
    pan,
    setPan,
    panning,
    setPanning,
    isSpacePressed,
    centerSceneInView,
    clientToWorld,
  };
}
