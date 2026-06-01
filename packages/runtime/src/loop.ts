import { useEffect, useRef } from "react";

export type GameLoopCallback = (deltaTime: number) => void;

export type FixedTimestepOptions = {
  fixedDt: number;
  maxSteps?: number;
};

export function useGameLoop(
  callback: GameLoopCallback,
  running: boolean = true,
  options?: FixedTimestepOptions
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    if (!options) {
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
    }

    let lastTime: number | null = null;
    let accumulator = 0;
    let frameId: number;
    const maxSteps = options.maxSteps ?? 10;

    const tick = (timestamp: number) => {
      if (lastTime !== null && runningRef.current) {
        let frameDt = Math.min((timestamp - lastTime) / 1000, 0.25);
        accumulator += frameDt;

        let steps = 0;
        while (accumulator >= options.fixedDt && steps < maxSteps) {
          callbackRef.current(options.fixedDt);
          accumulator -= options.fixedDt;
          steps++;
        }

        if (steps >= maxSteps) {
          accumulator = 0;
        }
      }
      lastTime = timestamp;
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [options?.fixedDt]);
}