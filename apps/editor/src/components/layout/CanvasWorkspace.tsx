import type { GameKitAsset, GameKitEntity, GameKitLevel, GameKitScene, GuiComponent, TilemapComponent, TransformComponent } from "@gamekit/schema";
import { GameKitEntitySchema } from "@gamekit/schema";
import { cn } from "@/ui";
import workspaceStyles from "../Workspace.module.css";
import { QuickStartBanner } from "../QuickStartBanner.js";
import { SceneTabBar } from "../SceneTabBar.js";
import { SceneCanvas } from "../SceneCanvas.js";
import { PlayRuntimeHost } from "../PlayRuntimeHost.js";
import { TilePalette } from "../TilePalette.js";
import { ProfilerOverlay } from "../ProfilerOverlay.js";
import { useImageCache } from "../../hooks/useImageCache.js";
import { isTilePaintTool, type CanvasTool, type TilePaintMode } from "../../lib/editor-tools.js";
import { createSceneWorkspace, type ScenePaneId, type SceneWorkspaceState, type SplitMode } from "../../lib/scene-workspace.js";
import type { PlayProfilerSample } from "../../lib/play-profiler.js";
import type { PlayOutcomeState } from "../../hooks/usePlaySimulation.js";
import { USE_PHASER_PLAY_HOST } from "../../hooks/usePlaySimulation.js";
import type { ProjectSnapshot } from "../../types.js";
import type { SceneManager } from "@gamekit/runtime/manager";

export interface CanvasWorkspaceProps {
  scene: GameKitScene | undefined;
  snapshot: ProjectSnapshot;
  currentSceneFile: string;
  workspace: SceneWorkspaceState;
  dirtyFiles: Set<string>;
  paneScenes: Record<string, GameKitScene>;
  activateScene: (file: string, pane?: ScenePaneId) => void;
  handleCloseSceneTab: (file: string) => void;
  handleSplitChange: (split: SplitMode) => void;
  updateScene: (mutator: (draft: GameKitScene) => void) => void;
  push: (mutator: (draft: GameKitScene | undefined) => void) => void;
  setIsDirty: (dirty: boolean) => void;
  triggerAutoSave: () => void;
  // Tools & Viewport
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  snap: boolean;
  setSnap: (snap: boolean | ((prev: boolean) => boolean)) => void;
  snapSize: number;
  setSnapSize: (size: number) => void;
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  tilePaintMode: TilePaintMode;
  setTilePaintMode: (mode: TilePaintMode) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  paintTileId: number;
  setPaintTileId: (id: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean | ((prev: boolean) => boolean)) => void;
  showColliders: boolean;
  setShowColliders: (show: boolean | ((prev: boolean) => boolean)) => void;
  viewResetKey: number;
  showGuiTools?: boolean;
  // Selection
  selectedEntityIds: Set<string>;
  setSelectedEntityIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedGuiNodeId: string | null;
  setSelectedGuiNodeId: (id: string | null) => void;
  selectedComponentInstanceId: string | null;
  setSelectedComponentInstanceId: (id: string | null) => void;
  clipboardRef: React.MutableRefObject<GameKitEntity | null>;
  addEntity: () => void;
  deleteEntity: (id: string) => void;
  duplicateEntity: (id: string) => void;
  pasteEntity: (source: GameKitEntity) => void;
  saveEntityAsPrefab: (id: string) => Promise<void>;
  // Play Simulation
  isPlaying: boolean;
  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  playViewPan: { x: number; y: number } | null;
  playOutcome: PlayOutcomeState | null;
  setPlayOutcome: React.Dispatch<React.SetStateAction<PlayOutcomeState | null>>;
  playLives: number | null;
  setPlayLives: React.Dispatch<React.SetStateAction<number | null>>;
  playHostScene: GameKitScene | null;
  playHostKey: number;
  playAssetUrls: Record<string, string>;
  playHostLevel: GameKitLevel | null;
  profilerOpen: boolean;
  profilerSample: PlayProfilerSample;
  virtualTouchControls: ("jump" | "fire" | "action")[];
  handlePlayToggle: () => Promise<void>;
  handleStop: () => void;
  handlePlayRestart: () => void;
  onVirtualInput: (action: "left" | "right" | "jump" | "fire" | "action", pressed: boolean) => void;
  onGuiAction: (action: string) => void;
  onPhaserOutcome: (kind: "won" | "lost", message: string) => void;
  onMetrics: (sample: PlayProfilerSample) => void;
  playHotSwapRef: React.MutableRefObject<(sceneId: string) => boolean>;
  playSceneManagerRef: React.MutableRefObject<SceneManager | null>;
  playLivesRef: React.MutableRefObject<number>;
  playOutcomeRef: React.MutableRefObject<"none" | "gameOver" | "win">;
  playVarsRef: React.MutableRefObject<Record<string, unknown>>;
  syncPlayLevelUnlocksFromManager: () => void;
  addConsoleLog: (type: any, message: string) => void;
  // Nav banner callbacks
  openContent: (tab?: any) => void;
  openLevels: () => void;
  openTour: () => void;
  setNewProjectWizardOpen: (open: boolean) => void;
}

export function CanvasWorkspace({
  scene,
  snapshot,
  currentSceneFile,
  workspace,
  dirtyFiles,
  paneScenes,
  activateScene,
  handleCloseSceneTab,
  handleSplitChange,
  updateScene,
  push,
  setIsDirty,
  triggerAutoSave,
  zoom,
  setZoom,
  snap,
  setSnap,
  snapSize,
  setSnapSize,
  activeTool,
  setActiveTool,
  tilePaintMode,
  setTilePaintMode,
  brushSize,
  setBrushSize,
  paintTileId,
  setPaintTileId,
  showGrid,
  setShowGrid,
  showColliders,
  setShowColliders,
  viewResetKey,
  showGuiTools = true,
  selectedEntityIds,
  setSelectedEntityIds,
  selectedGuiNodeId,
  setSelectedGuiNodeId,
  selectedComponentInstanceId,
  setSelectedComponentInstanceId,
  clipboardRef,
  addEntity,
  deleteEntity,
  duplicateEntity,
  pasteEntity,
  saveEntityAsPrefab,
  isPlaying,
  isPaused,
  setIsPaused,
  playViewPan,
  playOutcome,
  setPlayOutcome,
  playLives,
  setPlayLives,
  playHostScene,
  playHostKey,
  playAssetUrls,
  playHostLevel,
  profilerOpen,
  profilerSample,
  virtualTouchControls,
  handlePlayToggle,
  handleStop,
  handlePlayRestart,
  onVirtualInput,
  onGuiAction,
  onPhaserOutcome,
  onMetrics,
  playHotSwapRef,
  playSceneManagerRef,
  playLivesRef,
  playOutcomeRef,
  playVarsRef,
  syncPlayLevelUnlocksFromManager,
  addConsoleLog,
  openContent,
  openLevels,
  openTour,
  setNewProjectWizardOpen,
}: CanvasWorkspaceProps) {
  const paletteImages = useImageCache(snapshot.assets);

  const renderScenePane = (paneId: "a" | "b", targetFile: string) => {
    const isFocused = workspace.split === "none" || workspace.focused === paneId;
    const paneScene =
      paneId === "a"
        ? workspace.split !== "none" && workspace.focused !== "a"
          ? paneScenes[workspace.paneA] ?? scene
          : scene
        : workspace.focused === "b"
          ? scene
          : (workspace.paneB ? paneScenes[workspace.paneB] : undefined) ?? scene;

    const paneSelectedEntityIds = isFocused ? selectedEntityIds : new Set<string>();
    const paneIsPlaying = isPlaying && isFocused;

    return (
      <div
        key={paneId}
        className={cn(workspaceStyles["scene-pane"], isFocused && workspaceStyles.focused)}
        data-testid={`scene-pane-${paneId}`}
        onPointerDownCapture={() => {
          if (workspace.split !== "none" && workspace.focused !== paneId) {
            activateScene(targetFile, paneId);
          }
        }}
      >
        <SceneCanvas
          scene={paneScene}
          assets={snapshot.assets}
          selectedEntityIds={paneSelectedEntityIds}
          selectedGuiNodeId={isFocused ? selectedGuiNodeId : null}
          guiComponents={snapshot.guiComponents}
          selectedComponentInstanceId={isFocused ? selectedComponentInstanceId : null}
          showGuiTools={showGuiTools}
          zoom={zoom}
          snap={snap}
          hasClipboard={clipboardRef.current !== null}
          activeTool={activeTool}
          tilePaintMode={tilePaintMode}
          brushSize={brushSize}
          showGrid={showGrid}
          showColliders={showColliders}
          snapSize={snapSize}
          isPlaying={paneIsPlaying}
          playViewPan={playViewPan}
          paintTileId={paintTileId}
          viewResetKey={viewResetKey}
          virtualTouchControls={paneId === "a" ? virtualTouchControls : undefined}
          onVirtualInput={paneId === "a" ? onVirtualInput : undefined}
          onGuiAction={paneId === "a" ? onGuiAction : undefined}
          onZoomChange={setZoom}
          onSnapToggle={setSnap}
          onSnapSizeChange={setSnapSize}
          onActiveToolChange={setActiveTool}
          onToggleGrid={setShowGrid}
          onToggleColliders={setShowColliders}
          onPaintTiles={(entityId, tiles) => {
            if (!isFocused) return;
            updateScene((draft) => {
              const entity = draft.entities.find((e) => e.id === entityId);
              if (!entity) return;
              const tm = entity.components.find((c): c is TilemapComponent => c.type === "Tilemap");
              if (!tm) return;
              tm.tiles = tiles;
            });
          }}
          onSampleTile={(tileId) => {
            setPaintTileId(tileId);
            if (tileId === 0) {
              setActiveTool("erase");
              setTilePaintMode("erase");
            } else {
              setActiveTool("paint");
              if (tilePaintMode === "erase") setTilePaintMode("brush");
            }
          }}
          onSelect={(id, shift) => {
            if (!isFocused) return;
            setSelectedGuiNodeId(null);
            setSelectedComponentInstanceId(null);
            if (!id) {
              setSelectedEntityIds(new Set());
              return;
            }
            setSelectedEntityIds((prev) => {
              const next = new Set(shift ? prev : undefined);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectGuiNode={(id) => {
            if (!isFocused) return;
            setSelectedEntityIds(new Set());
            setSelectedComponentInstanceId(null);
            setSelectedGuiNodeId(id);
          }}
          onSelectComponentInstance={(id) => {
            if (!isFocused) return;
            setSelectedEntityIds(new Set());
            setSelectedGuiNodeId(null);
            setSelectedComponentInstanceId(id);
          }}
          onTransform={(id, updates) => {
            if (!isFocused) return;
            push((draft) => {
              if (!draft) return;
              const entity = draft.entities.find((candidate) => candidate.id === id);
              const transform = entity?.components.find(
                (component): component is TransformComponent => component.type === "Transform"
              );
              if (transform) {
                if (updates.position) transform.position = updates.position;
                if (updates.rotation !== undefined) transform.rotation = updates.rotation;
                if (updates.scale) transform.scale = updates.scale;
              }
            });
            setIsDirty(true);
            triggerAutoSave();
          }}
          onPolygonPointsChange={(id, points) => {
            if (!isFocused) return;
            push((draft) => {
              if (!draft) return;
              const entity = draft.entities.find((candidate) => candidate.id === id);
              const polygon = entity?.components.find(
                (c): c is import("@gamekit/schema").PolygonColliderComponent => c.type === "PolygonCollider"
              );
              if (polygon) {
                polygon.points = points;
              }
            });
            setIsDirty(true);
            triggerAutoSave();
          }}
          onAddEntity={addEntity}
          onPasteEntity={() => {
            const entity = clipboardRef.current;
            if (entity) pasteEntity(entity);
          }}
          onSelectAll={() => {
            if (!scene) return;
            setSelectedEntityIds(new Set(scene.entities.map((e) => e.id)));
          }}
          onCopyEntity={(id) => {
            const entity = scene?.entities.find((e) => e.id === id);
            if (entity) clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
          }}
          onCutEntity={(id) => {
            const entity = scene?.entities.find((e) => e.id === id);
            if (entity) {
              clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
              deleteEntity(id);
            }
          }}
          onDuplicateEntity={(id) => duplicateEntity(id)}
          onDeleteEntity={(id) => deleteEntity(id)}
          onSaveAsPrefab={(id) => void saveEntityAsPrefab(id)}
        />

        {USE_PHASER_PLAY_HOST && isPlaying && playHostScene && isFocused && (
          <PlayRuntimeHost
            remountKey={playHostKey}
            scene={playHostScene}
            assetUrls={playAssetUrls}
            guiComponents={snapshot.guiComponents}
            level={playHostLevel}
            paused={isPaused || playOutcome !== null}
            sceneManager={
              paneId === "a"
                ? {
                    switchScene: (sceneId) => playHotSwapRef.current(sceneId),
                    nextScene: () => {
                      const manager = playSceneManagerRef.current;
                      const ok = manager?.nextScene() ?? false;
                      if (ok && manager) {
                        const id = manager.getState().currentSceneId;
                        if (id) playHotSwapRef.current(id);
                      }
                      return ok;
                    },
                    nextLevel: () => {
                      const manager = playSceneManagerRef.current;
                      const ok = manager?.nextLevel() ?? false;
                      if (ok) {
                        syncPlayLevelUnlocksFromManager();
                        const id = manager?.getState().currentSceneId;
                        if (id) playHotSwapRef.current(id);
                      }
                      return ok;
                    },
                    unlockLevel: (levelId) => {
                      const ok = playSceneManagerRef.current?.unlockLevel(levelId) ?? false;
                      if (ok) syncPlayLevelUnlocksFromManager();
                      return ok;
                    },
                    completeLevel: (levelId) => {
                      const unlocked = playSceneManagerRef.current?.completeLevel(levelId) ?? null;
                      if (unlocked) {
                        addConsoleLog("system", `completeLevel("${levelId}") → unlocked "${unlocked}"`);
                        syncPlayLevelUnlocksFromManager();
                      }
                      return unlocked;
                    },
                    getState: () => ({
                      currentLevelId: playSceneManagerRef.current?.getState().currentLevelId ?? null,
                    }),
                    setPersistentVar: (key, value) => {
                      playSceneManagerRef.current?.setPersistentVar(key, value);
                      playVarsRef.current[key] = value;
                    },
                    getPersistentVar: (key, defaultValue) =>
                      playSceneManagerRef.current?.getPersistentVar(key, defaultValue) ??
                      playVarsRef.current[key] ??
                      defaultValue,
                  }
                : undefined
            }
            onOutcome={
              paneId === "a"
                ? onPhaserOutcome
                : undefined
            }
            onLivesChange={
              paneId === "a"
                ? (lives) => {
                    if (lives === null) {
                      setPlayLives(null);
                    } else {
                      playLivesRef.current = lives;
                      setPlayLives(lives);
                    }
                  }
                : undefined
            }
            onCollectProgress={
              paneId === "a"
                ? (tag, collected, target) => {
                    addConsoleLog("system", `Collect ${tag}: ${collected}/${target}`);
                  }
                : undefined
            }
            onGuiAction={
              paneId === "a"
                ? (action) => {
                    addConsoleLog("system", `GUI action: ${action}`);
                  }
                : undefined
            }
            onMetrics={onMetrics}
          />
        )}

        {paneId === "a" && isPlaying && playLives !== null && !playOutcome && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-white/10 bg-black/55 px-2.5 py-1 font-mono text-[11px] text-accent backdrop-blur-sm">
            Lives {playLives}
          </div>
        )}

        {paneId === "a" && isPlaying && playOutcome && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
            <div className="w-[min(360px,calc(100%-32px))] rounded-2xl border border-white/10 bg-[rgba(10,14,20,0.95)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <p
                className={`m-0 text-lg font-bold tracking-[0.06em] ${
                  playOutcome.kind === "win" ? "text-accent" : "text-[#ff6b8a]"
                }`}
              >
                {playOutcome.message}
              </p>
              <p className="mt-2 text-[12px] text-text-muted">
                {playOutcome.kind === "gameOver"
                  ? "Adjust World → Game rules for hazards, lives, and lose actions."
                  : "Objectives complete. Next level unlocks via completeLevel / level onComplete."}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-[12px] font-semibold text-accent hover:bg-accent/25"
                  onClick={handlePlayRestart}
                >
                  Restart
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-text-primary hover:bg-white/10"
                  onClick={handleStop}
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(workspaceStyles["canvas-stage"], "relative")}>
      <QuickStartBanner
        onPlayTest={handlePlayToggle}
        onOpenAssetStudio={() => openContent("studio")}
        onOpenLevels={() => openLevels()}
        onOpenTour={openTour}
        onNewProject={() => setNewProjectWizardOpen(true)}
      />
      <SceneTabBar
        workspace={workspace.openTabs.length ? workspace : createSceneWorkspace(currentSceneFile)}
        dirtyFiles={dirtyFiles}
        scenes={snapshot.scenes}
        onSelectTab={(file) => activateScene(file)}
        onCloseTab={handleCloseSceneTab}
        onSplitChange={handleSplitChange}
      />
      <div
        className={cn(
          workspaceStyles["scene-panes"],
          workspace.split === "horizontal" && workspaceStyles["split-h"],
          workspace.split === "vertical" && workspaceStyles["split-v"],
        )}
      >
        {renderScenePane("a", workspace.paneA)}
        {workspace.split !== "none" && workspace.paneB && renderScenePane("b", workspace.paneB)}
      </div>

      {isTilePaintTool(activeTool) && (
        <TilePalette
          scene={scene}
          assets={snapshot.assets}
          images={paletteImages}
          selectedEntityIds={selectedEntityIds}
          paintTileId={paintTileId}
          paintMode={activeTool === "erase" ? "erase" : tilePaintMode}
          brushSize={brushSize}
          onPaintTileIdChange={setPaintTileId}
          onPaintModeChange={(mode) => {
            setTilePaintMode(mode);
            setActiveTool(mode === "erase" ? "erase" : "paint");
          }}
          onBrushSizeChange={setBrushSize}
        />
      )}
      {isPlaying && profilerOpen && <ProfilerOverlay sample={profilerSample} open={profilerOpen} />}
    </div>
  );
}
