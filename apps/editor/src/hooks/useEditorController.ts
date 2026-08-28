import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useEditorTour } from "../components/EditorTour.js";
import type { SidebarTabId } from "../components/SidebarRail.js";
import type { CanvasTool, TilePaintMode } from "../lib/editor-tools.js";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts.js";
import { getApiUrl } from "../lib/api.js";
import {
  INITIAL_EDITOR_LAYOUT,
  editorLayoutReducer,
  getBottomDestination,
  getLeftDestination,
} from "../lib/editor-layout.js";
import { useProjectState } from "./useProjectState.js";
import { useSceneEntities } from "./useSceneEntities.js";
import { useSceneGui } from "./useSceneGui.js";
import { useLevels } from "./useLevels.js";
import { usePlaySimulation } from "./usePlaySimulation.js";
import { useEditorCommands } from "./useEditorCommands.js";
import type { BottomTab } from "../components/layout/BottomContentDrawer.js";

export const MVP_SHOW_GUI_TOOLS = true;
export const MVP_SHOW_LEVELS = true;
export const MVP_SHOW_TIMELINE = true;
export const MVP_SHOW_CONSOLE = true;

export function useEditorController() {
  const { isTourOpen, openTour, closeTour } = useEditorTour();

  // Layout and Drawer UI State
  const [layout, dispatchLayout] = useReducer(editorLayoutReducer, INITIAL_EDITOR_LAYOUT);
  const leftDestination = getLeftDestination(layout.destination);
  const bottomDestination = getBottomDestination(layout.destination);
  const sidebarOpen = leftDestination !== null;
  const activeTab: SidebarTabId = leftDestination ?? "entities";
  const inspectorOpen = layout.inspectorOpen;
  const bottomDrawerCollapsed = bottomDestination === null;
  const activeBottomTab: BottomTab = bottomDestination ?? "assets";
  const setInspectorOpen = useCallback((open: boolean) => {
    dispatchLayout({ type: "set-inspector-open", open });
  }, []);

  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const [agentExpanded, setAgentExpanded] = useState(
    () => localStorage.getItem("gamekit:agent:expanded") === "1"
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [welcomeHubOpen, setWelcomeHubOpen] = useState(false);
  const [newProjectWizardOpen, setNewProjectWizardOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const commandPaletteOpenRef = useRef(false);
  commandPaletteOpenRef.current = commandPaletteOpen;

  // Viewport and Tool Settings
  const [activeTool, setActiveTool] = useState<CanvasTool>("translate");
  const [paintTileId, setPaintTileId] = useState(1);
  const [tilePaintMode, setTilePaintMode] = useState<TilePaintMode>("brush");
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(false);
  const [snapSize, setSnapSize] = useState(32);
  const [showGrid, setShowGrid] = useState(true);
  const [showColliders, setShowColliders] = useState(true);
  const [viewResetKey, setViewResetKey] = useState(0);

  // Project & Document State
  const project = useProjectState();

  // Native Desktop Runner State
  const [nativeRunning, setNativeRunning] = useState(false);
  const [nativeLaunching, setNativeLaunching] = useState(false);

  useEffect(() => {
    let mounted = true;
    const pollStatus = async () => {
      try {
        const res = await fetch(getApiUrl("/api/native/status"));
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.state) {
            setNativeRunning(Boolean(data.state.running));
            if (!data.state.running && data.state.status !== "launching") {
              setNativeLaunching(false);
            }
          }
        }
      } catch (_) {}
    };
    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleNativePlayToggle = useCallback(async () => {
    if (nativeRunning) {
      try {
        await fetch(getApiUrl("/api/native/stop"), { method: "POST" });
        setNativeRunning(false);
      } catch (err) {
        console.error("Failed to stop native game:", err);
      }
    } else {
      setNativeLaunching(true);
      try {
        const res = await fetch(getApiUrl("/api/native/play"), { method: "POST" });
        const data = await res.json();
        if (data.ok) {
          setNativeRunning(true);
        }
      } catch (err) {
        console.error("Failed to start native game:", err);
      } finally {
        setNativeLaunching(false);
      }
    }
  }, [nativeRunning]);

  // Navigation callbacks
  const openLeftPanel = useCallback((tab: SidebarTabId) => {
    dispatchLayout({ type: "navigate", destination: { region: "left", tab } });
  }, []);

  const openHierarchy = useCallback(() => openLeftPanel("entities"), [openLeftPanel]);
  const openScenes = useCallback(() => openLeftPanel("scenes"), [openLeftPanel]);
  const openPrefabs = useCallback(() => openLeftPanel("prefabs"), [openLeftPanel]);
  const openLevels = useCallback(() => openLeftPanel("levels"), [openLeftPanel]);
  const openAgent = useCallback(() => openLeftPanel("agent"), [openLeftPanel]);
  const openWorld = useCallback(() => openLeftPanel("world"), [openLeftPanel]);
  const openGuis = useCallback(() => openLeftPanel("guis"), [openLeftPanel]);
  const openGuiComponents = useCallback(() => openLeftPanel("components"), [openLeftPanel]);
  const openRecipes = useCallback(() => openLeftPanel("recipes"), [openLeftPanel]);
  const openServices = useCallback(() => openLeftPanel("services"), [openLeftPanel]);

  const openContent = useCallback((tab: BottomTab = "assets") => {
    dispatchLayout({ type: "navigate", destination: { region: "bottom", tab } });
  }, []);

  const centerView = useCallback(() => {
    setZoom(1);
    setViewResetKey((k) => k + 1);
  }, []);

  const setError = useCallback(
    (error: unknown) => {
      project.setStatus(error instanceof Error ? error.message : "Operation failed");
      project.addConsoleLog(
        "error",
        error instanceof Error ? error.message : "Operation execution failed."
      );
    },
    [project]
  );

  // Scene GUI State
  const gui = useSceneGui({
    snapshot: project.snapshot,
    setSnapshot: project.setSnapshot,
    updateScene: project.updateScene,
    persistProject: project.persistProject,
    addConsoleLog: project.addConsoleLog,
    setSelectedEntityIds: () => {},
  });

  // Scene Entities State
  const entities = useSceneEntities({
    scene: project.scene,
    updateScene: project.updateScene,
    selectedAssetId: project.selectedAssetId,
    snapshot: project.snapshot,
    currentSceneFile: project.currentSceneFile,
    addConsoleLog: project.addConsoleLog,
    setStatus: project.setStatus,
    openPrefabs,
    clearGuiSelection: gui.clearGuiSelection,
  });

  // Levels State
  const playSceneManagerRef = useRef<import("@gamekit/runtime/manager").SceneManager | null>(null);
  const playUnlockedLevelIdsRef = useRef<string[]>([]);
  const levels = useLevels({
    snapshot: project.snapshot,
    setSnapshot: project.setSnapshot,
    persistProject: project.persistProject,
    setStatus: project.setStatus,
    addConsoleLog: project.addConsoleLog,
    normalizeSceneFile: project.normalizeSceneFile,
    sceneFileMatches: project.sceneFileMatches,
    playSceneManagerRef,
    playUnlockedLevelIdsRef,
  });

  // Simulation State
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const play = usePlaySimulation({
    scene: project.scene,
    snapshot: project.snapshot,
    currentSceneFile: project.currentSceneFile,
    pressedKeysRef,
    resetScene: project.reset,
    setScene: project.setScene,
    undoBypassRef: project.undoBypassRef,
    addConsoleLog: project.addConsoleLog,
    syncPlayLevelUnlocksFromManager: levels.syncPlayLevelUnlocksFromManager,
    normalizeSceneFile: project.normalizeSceneFile,
    sceneFileMatches: project.sceneFileMatches,
  });

  // Keep ref sync between play and levels
  playSceneManagerRef.current = play.playSceneManagerRef.current;

  // Global Commands
  const commandItems = useEditorCommands({
    scene: project.scene,
    snapshot: project.snapshot,
    currentSceneFile: project.currentSceneFile,
    selectedEntity: entities.selectedEntity,
    isTauri: project.isTauri,
    projectPath: project.projectPath,
    isPlaying: play.isPlaying,
    isPaused: play.isPaused,
    canUndo: project.canUndo,
    canRedo: project.canRedo,
    snap,
    showGrid,
    showColliders,
    profilerOpen: play.profilerOpen,
    splitMode: project.workspace.split,
    openHierarchy,
    openScenes,
    openPrefabs,
    openLevels,
    openAgent,
    openWorld,
    openGuis,
    openGuiComponents,
    openRecipes,
    openContent,
    centerView,
    saveEntityAsPrefab: entities.saveEntityAsPrefab,
    setActiveTool,
    setTilePaintMode,
    handleSplitChange: project.handleSplitChange,
    setProfilerOpen: play.setProfilerOpen,
    setSnap,
    setShowGrid,
    setShowColliders,
    setZoom,
    addEntity: entities.addEntity,
    setWizardOpen,
    setNewProjectWizardOpen,
    setWelcomeHubOpen,
    setAgentSettingsOpen,
    setCommandPaletteOpen,
    undo: project.undo,
    redo: project.redo,
    saveScene: project.saveScene,
    refresh: project.refresh,
    handlePlayToggle: play.handlePlayToggle,
    handleStop: play.handleStop,
    handleCloseProject: project.handleCloseProject,
    activateScene: project.activateScene,
    selectEntity: (id) => {
      entities.selectEntity(id);
      setInspectorOpen(true);
      openLeftPanel("entities");
    },
    setStatus: project.setStatus,
    showLevels: MVP_SHOW_LEVELS,
    showGuiTools: MVP_SHOW_GUI_TOOLS,
  });

  // Global Keyboard Shortcuts
  const selectedGuiNodeIdRef = useRef(gui.selectedGuiNodeId);
  selectedGuiNodeIdRef.current = gui.selectedGuiNodeId;
  const selectedComponentInstanceIdRef = useRef(gui.selectedComponentInstanceId);
  selectedComponentInstanceIdRef.current = gui.selectedComponentInstanceId;

  useKeyboardShortcuts({
    commandPaletteOpenRef,
    isPlaying: play.isPlaying,
    isPaused: play.isPaused,
    pressedKeysRef,
    undo: project.undo,
    redo: project.redo,
    push: project.push,
    saveScene: project.saveScene,
    sceneRef: project.sceneRef,
    setActiveTool,
    setTilePaintMode,
    setBrushSize,
    onToggleProfiler: () => play.setProfilerOpen((open) => !open),
    selectedEntityIdsRef: entities.selectedEntityIdsRef,
    setIsDirty: project.setIsDirty,
    triggerAutoSave: project.triggerAutoSave,
    deleteEntity: entities.deleteEntity,
    duplicateEntity: entities.duplicateEntity,
    pasteEntity: entities.pasteEntity,
    clipboardRef: entities.clipboardRef,
    selectedGuiNodeIdRef,
    selectedComponentInstanceIdRef,
    setSelectedEntityIds: entities.setSelectedEntityIds,
    setSelectedGuiNodeId: gui.setSelectedGuiNodeId,
    setSelectedComponentInstanceId: gui.setSelectedComponentInstanceId,
    snap,
    snapSize,
    setCommandPaletteOpen,
  });

  // Inspector is selection-driven only
  useEffect(() => {
    const hasSelection =
      entities.selectedEntityIds.size > 0 ||
      !!gui.selectedGuiNodeId ||
      !!gui.selectedComponentInstanceId;
    setInspectorOpen(hasSelection);
  }, [
    entities.selectedEntityIds,
    gui.selectedGuiNodeId,
    gui.selectedComponentInstanceId,
    setInspectorOpen,
  ]);

  // Disk hot-reload polling
  useEffect(() => {
    return project.startHotReload(play.isPlaying);
  }, [project.startHotReload, play.isPlaying]);

  return {
    isTourOpen,
    openTour,
    closeTour,
    layout,
    dispatchLayout,
    leftDestination,
    bottomDestination,
    sidebarOpen,
    activeTab,
    inspectorOpen,
    bottomDrawerCollapsed,
    activeBottomTab,
    setInspectorOpen,
    agentSettingsOpen,
    setAgentSettingsOpen,
    agentExpanded,
    setAgentExpanded,
    wizardOpen,
    setWizardOpen,
    welcomeHubOpen,
    setWelcomeHubOpen,
    newProjectWizardOpen,
    setNewProjectWizardOpen,
    commandPaletteOpen,
    setCommandPaletteOpen,
    activeTool,
    setActiveTool,
    paintTileId,
    setPaintTileId,
    tilePaintMode,
    setTilePaintMode,
    brushSize,
    setBrushSize,
    zoom,
    setZoom,
    snap,
    setSnap,
    snapSize,
    setSnapSize,
    showGrid,
    setShowGrid,
    showColliders,
    setShowColliders,
    viewResetKey,
    centerView,
    project,
    nativeRunning,
    nativeLaunching,
    handleNativePlayToggle,
    openLeftPanel,
    openHierarchy,
    openScenes,
    openPrefabs,
    openLevels,
    openAgent,
    openWorld,
    openGuis,
    openGuiComponents,
    openRecipes,
    openServices,
    openContent,
    setError,
    gui,
    entities,
    levels,
    play,
    commandItems,
  };
}

export type EditorController = ReturnType<typeof useEditorController>;
