import { useEffect, useRef } from "react";
import type { GameKitLevel, GameKitScene, GuiComponent } from "@gamekit/schema";
import type { ScriptContext } from "@gamekit/runtime/script";
import { createGameKitGame } from "@gamekit/runtime-web";

export type PlayRuntimeHostProps = {
  scene: GameKitScene;
  /** assetId → absolute/relative URL */
  assetUrls: Record<string, string>;
  guiComponents?: GuiComponent[];
  sceneManager?: ScriptContext["sceneManager"];
  level?: GameKitLevel | null;
  paused?: boolean;
  /** Bump to force a full remount (scene switch). */
  remountKey?: string | number;
  onOutcome?: (kind: "won" | "lost", message: string) => void;
  onLivesChange?: (lives: number | null) => void;
  onCollectProgress?: (tag: string, collected: number, target: number) => void;
  onGuiAction?: (action: string) => void;
  /** FPS + frame ms from Phaser loop. */
  onMetrics?: (fps: number, frameMs: number) => void;
};

/**
 * Full Phaser play host for the editor canvas stage.
 * Uses the same `@gamekit/runtime-web` path as exported web games.
 */
export function PlayRuntimeHost({
  scene,
  assetUrls,
  guiComponents = [],
  sceneManager,
  level = null,
  paused = false,
  remountKey = 0,
  onOutcome,
  onLivesChange,
  onCollectProgress,
  onGuiAction,
  onMetrics,
}: PlayRuntimeHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ReturnType<typeof createGameKitGame> | null>(null);
  const callbacksRef = useRef({
    onOutcome,
    onLivesChange,
    onCollectProgress,
    onGuiAction,
    onMetrics,
    sceneManager,
  });
  callbacksRef.current = {
    onOutcome,
    onLivesChange,
    onCollectProgress,
    onGuiAction,
    onMetrics,
    sceneManager,
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = "";
    const game = createGameKitGame({
      scene,
      assets: assetUrls,
      container: el,
      pixelArt: false,
      guiComponents,
      level,
      suppressOutcomeOverlay: true,
      sceneManager: {
        switchScene: (id) => callbacksRef.current.sceneManager?.switchScene(id) ?? false,
        nextScene: () => callbacksRef.current.sceneManager?.nextScene?.() ?? false,
        nextLevel: () => callbacksRef.current.sceneManager?.nextLevel?.() ?? false,
        unlockLevel: (id) => callbacksRef.current.sceneManager?.unlockLevel?.(id) ?? false,
        completeLevel: (id) => callbacksRef.current.sceneManager?.completeLevel?.(id) ?? null,
        getState: () =>
          callbacksRef.current.sceneManager?.getState?.() ?? { currentLevelId: null },
        setPersistentVar: (k, v) => callbacksRef.current.sceneManager?.setPersistentVar(k, v),
        getPersistentVar: (k, d) =>
          callbacksRef.current.sceneManager?.getPersistentVar?.(k, d),
      },
      onGuiAction: (action) => callbacksRef.current.onGuiAction?.(action),
      onOutcome: (kind, message) => callbacksRef.current.onOutcome?.(kind, message),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange?.(lives),
      onCollectProgress: (tag, collected, target) =>
        callbacksRef.current.onCollectProgress?.(tag, collected, target),
    });
    gameRef.current = game;

    const metricsId = window.setInterval(() => {
      const g = gameRef.current;
      if (!g) return;
      const fps = Math.round(g.loop.actualFps || 0);
      const frameMs = Math.round((g.loop.delta || 0) * 10) / 10;
      callbacksRef.current.onMetrics?.(fps, frameMs);
    }, 400);

    return () => {
      window.clearInterval(metricsId);
      try {
        game.destroy(true);
      } catch {
        // ignore double-destroy
      }
      gameRef.current = null;
      if (el) el.innerHTML = "";
    };
    // remountKey + scene identity force a fresh Phaser instance on scene switch
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional remount contract
  }, [remountKey, scene.id, scene.name, scene.viewport.width, scene.viewport.height]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    try {
      if (paused) {
        game.scene.pause("gamekit");
        game.loop.sleep();
      } else {
        game.loop.wake();
        game.scene.resume("gamekit");
      }
    } catch {
      // scene key may not be ready yet
    }
  }, [paused]);

  return (
    <div
      className="play-runtime-host"
      data-testid="play-runtime-host"
      aria-label="Play-in-editor runtime"
    >
      <div className="play-runtime-frame">
        <div
          ref={containerRef}
          className="play-runtime-canvas"
          style={{
            aspectRatio: `${scene.viewport.width} / ${scene.viewport.height}`,
          }}
        />
        <div className="play-runtime-badge type-label">
          Phaser · {scene.name || scene.id}
        </div>
      </div>
    </div>
  );
}
