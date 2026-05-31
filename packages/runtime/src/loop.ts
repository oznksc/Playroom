import { useEffect, useRef } from "react";

export type GameLoopCallback = (deltaTime: number) => void;

export function useGameLoop(callback: GameLoopCallback, running: boolean = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    let lastTime: number | null = null;
    let frameId: number;

    const tick = (timestamp: number) => {
      if (lastTime !== null && runningRef.current) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        callbackRef.current(dt);
      }
      lastTime = timestamp;
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);
}