import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Automatically cleanup DOM after each test in happy-dom
afterEach(() => {
  cleanup();
});

// Only run DOM setup in happy-dom / browser environments
if (typeof window !== "undefined") {
  // @ts-ignore
  import("@testing-library/jest-dom/vitest");

  // Mock HTMLCanvasElement 2D context for SceneCanvas rendering
  if (typeof HTMLCanvasElement !== "undefined") {
    const dummyCtx: Partial<CanvasRenderingContext2D> = {
      fillStyle: "#000",
      strokeStyle: "#000",
      lineWidth: 1,
      font: "10px sans-serif",
      textAlign: "left",
      textBaseline: "top",
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      rect: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: (text: string) =>
        ({ width: text.length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 } as TextMetrics),
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      drawImage: () => {},
      setLineDash: () => {},
      getLineDash: () => [],
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      transform: () => {},
      resetTransform: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} } as unknown as CanvasGradient),
      createRadialGradient: () => ({ addColorStop: () => {} } as unknown as CanvasGradient),
      createPattern: () => null,
    };

    HTMLCanvasElement.prototype.getContext = function (contextId: string) {
      if (contextId === "2d") {
        return dummyCtx as CanvasRenderingContext2D;
      }
      return null;
    } as any;
  }

  // Mock ResizeObserver
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }

  // Mock matchMedia
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}
