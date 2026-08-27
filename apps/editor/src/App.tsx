import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandCorner } from "./components/BrandCorner.js";
import { AppTabBar } from "./components/AppTabBar.js";
import { PlayControls } from "./components/PlayControls.js";
import { CommandPalette } from "./components/CommandPalette.js";
import type { SidebarTabId } from "./components/SidebarRail.js";
import { EditorTour, useEditorTour } from "./components/EditorTour.js";
import type { CanvasTool, TilePaintMode } from "./lib/editor-tools.js";
import { ProjectWizard } from "./components/ProjectWizard.js";
import { WelcomeHub } from "./components/WelcomeHub.js";
import { NewProjectWizard } from "./components/NewProjectWizard.js";
import { AgentSettings } from "./components/AgentSettings.js";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.js";
import { getApiUrl } from "./lib/api.js";
import shellStyles from "./components/AppShell.module.css";

// Modular Domain Hooks
import { useProjectState } from "./hooks/useProjectState.js";
import { useSceneEntities } from "./hooks/useSceneEntities.js";
import { useSceneGui } from "./hooks/useSceneGui.js";
import { useLevels } from "./hooks/useLevels.js";
import { usePlaySimulation } from "./hooks/usePlaySimulation.js";
import { useEditorCommands } from "./hooks/useEditorCommands.js";

// Modular Layout Components
import { CanvasWorkspace } from "./components/layout/CanvasWorkspace.js";
import { LeftSidebarSheet } from "./components/layout/LeftSidebarSheet.js";
import { RightInspectorSheet } from "./components/layout/RightInspectorSheet.js";
import { BottomContentDrawer, type BottomTab } from "./components/layout/BottomContentDrawer.js";

const MVP_SHOW_GUI_TOOLS = true;
const MVP_SHOW_LEVELS = true;
const MVP_SHOW_TIMELINE = true;
const MVP_SHOW_CONSOLE = true;

export function App() {
  const { isTourOpen, openTour, closeTour } = useEditorTour();

  // Layout and Drawer UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTabId>("entities");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [bottomDrawerCollapsed, setBottomDrawerCollapsed] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>("assets");
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const [agentExpanded, setAgentExpanded] = useState(
    () => localStorage.getItem("gamekit:agent:expanded") === "1",
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
    setActiveTab(tab);
    setSidebarOpen(true);
    setBottomDrawerCollapsed(true);
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
    setActiveBottomTab(tab);
    setBottomDrawerCollapsed(false);
    setSidebarOpen(false);
  }, []);

  const centerView = useCallback(() => {
    setZoom(1);
    setViewResetKey((k) => k + 1);
  }, []);

  const setError = useCallback((error: unknown) => {
    project.setStatus(error instanceof Error ? error.message : "Operation failed");
    project.addConsoleLog("error", error instanceof Error ? error.message : "Operation execution failed.");
  }, [project]);

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
      setSidebarOpen(true);
      setActiveTab("entities");
      setBottomDrawerCollapsed(true);
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
  }, [entities.selectedEntityIds, gui.selectedGuiNodeId, gui.selectedComponentInstanceId]);

  // Disk hot-reload polling
  useEffect(() => {
    return project.startHotReload(play.isPlaying);
  }, [project.startHotReload, play.isPlaying]);

  if ((project.isTauri && !project.projectPath) || welcomeHubOpen) {
    return (
      <WelcomeHub
        recentProjects={project.recentProjects}
        exampleProjects={project.exampleProjects.map((e) => e.path)}
        isLoadingProject={project.isLoadingProject}
        projectLoadError={project.projectLoadError}
        onOpenFolder={project.handleOpenProject}
        onSelectProject={async (path) => {
          setWelcomeHubOpen(false);
          await project.loadProjectFolder(path);
        }}
        onRemoveRecent={(path) => {
          project.setRecentProjects((prev) => {
            const next = prev.filter((p) => p !== path);
            localStorage.setItem("gamekit_recent_projects", JSON.stringify(next));
            return next;
          });
        }}
      />
    );
  }

  return (
    <main
      className={shellStyles.shell}
      data-drawer-collapsed={bottomDrawerCollapsed ? "true" : "false"}
      data-bottom-sheet-open={!bottomDrawerCollapsed ? "true" : "false"}
    >
      <CanvasWorkspace
        scene={project.scene}
        snapshot={project.snapshot}
        currentSceneFile={project.currentSceneFile}
        workspace={project.workspace}
        dirtyFiles={project.dirtyFiles}
        paneScenes={project.paneScenes}
        activateScene={project.activateScene}
        handleCloseSceneTab={project.handleCloseSceneTab}
        handleSplitChange={project.handleSplitChange}
        updateScene={project.updateScene}
        push={project.push}
        setIsDirty={project.setIsDirty}
        triggerAutoSave={project.triggerAutoSave}
        zoom={zoom}
        setZoom={setZoom}
        snap={snap}
        setSnap={setSnap}
        snapSize={snapSize}
        setSnapSize={setSnapSize}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        tilePaintMode={tilePaintMode}
        setTilePaintMode={setTilePaintMode}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        paintTileId={paintTileId}
        setPaintTileId={setPaintTileId}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showColliders={showColliders}
        setShowColliders={setShowColliders}
        viewResetKey={viewResetKey}
        showGuiTools={MVP_SHOW_GUI_TOOLS}
        selectedEntityIds={entities.selectedEntityIds}
        setSelectedEntityIds={entities.setSelectedEntityIds}
        selectedGuiNodeId={gui.selectedGuiNodeId}
        setSelectedGuiNodeId={gui.setSelectedGuiNodeId}
        selectedComponentInstanceId={gui.selectedComponentInstanceId}
        setSelectedComponentInstanceId={gui.setSelectedComponentInstanceId}
        clipboardRef={entities.clipboardRef}
        addEntity={entities.addEntity}
        deleteEntity={entities.deleteEntity}
        duplicateEntity={entities.duplicateEntity}
        pasteEntity={entities.pasteEntity}
        saveEntityAsPrefab={entities.saveEntityAsPrefab}
        isPlaying={play.isPlaying}
        isPaused={play.isPaused}
        setIsPaused={play.setIsPaused}
        playViewPan={play.playViewPan}
        playOutcome={play.playOutcome}
        setPlayOutcome={play.setPlayOutcome}
        playLives={play.playLives}
        setPlayLives={play.setPlayLives}
        playHostScene={play.playHostScene}
        playHostKey={play.playHostKey}
        playAssetUrls={play.playAssetUrls}
        playHostLevel={play.playHostLevel}
        profilerOpen={play.profilerOpen}
        profilerSample={play.profilerSample}
        virtualTouchControls={play.virtualTouchControls}
        handlePlayToggle={play.handlePlayToggle}
        handleStop={play.handleStop}
        handlePlayRestart={play.handlePlayRestart}
        onVirtualInput={play.onVirtualInput}
        onGuiAction={play.onGuiAction}
        onPhaserOutcome={play.onPhaserOutcome}
        onMetrics={play.onMetrics}
        playHotSwapRef={play.playHotSwapRef}
        playSceneManagerRef={play.playSceneManagerRef}
        playLivesRef={play.playLivesRef}
        playOutcomeRef={play.playOutcomeRef}
        playVarsRef={play.playVarsRef}
        syncPlayLevelUnlocksFromManager={levels.syncPlayLevelUnlocksFromManager}
        addConsoleLog={project.addConsoleLog}
        openContent={openContent}
        openLevels={openLevels}
        openTour={openTour}
        setNewProjectWizardOpen={setNewProjectWizardOpen}
      />

      {/* Bottom-left logo and state indicator */}
      <BrandCorner isDirty={project.isDirty} onClick={() => setWelcomeHubOpen(true)} />

      <PlayControls
        isPlaying={play.isPlaying}
        isPaused={play.isPaused}
        playFps={play.playFps}
        playFrameMs={play.playFrameMs}
        entityCount={project.scene?.entities.length ?? 0}
        drawCalls={play.playDrawCalls}
        profilerOpen={play.profilerOpen}
        isNativeRunning={nativeRunning}
        isNativeLaunching={nativeLaunching}
        onPlayToggle={play.handlePlayToggle}
        onStop={play.handleStop}
        onToggleProfiler={() => play.setProfilerOpen((open) => !open)}
        onNativePlayToggle={handleNativePlayToggle}
      />

      {/* Bottom tab bar — navigation, tools, project */}
      <AppTabBar
        active={
          !bottomDrawerCollapsed
            ? "content"
            : sidebarOpen && activeTab === "agent"
              ? "agent"
              : sidebarOpen && activeTab === "world"
                ? "world"
                : sidebarOpen && activeTab === "scenes"
                  ? "scenes"
                  : sidebarOpen && activeTab === "prefabs"
                    ? "prefabs"
                    : sidebarOpen && activeTab === "levels"
                      ? "levels"
                      : sidebarOpen && activeTab === "guis"
                        ? "guis"
                        : sidebarOpen && activeTab === "components"
                          ? "gui-components"
                          : sidebarOpen && activeTab === "recipes"
                            ? "recipes"
                            : sidebarOpen && activeTab === "services"
                              ? "services"
                              : sidebarOpen
                                ? "hierarchy"
                                : null
        }
        saveState={project.saveState}
        projectPath={project.isTauri ? project.projectPath : null}
        showLevels={MVP_SHOW_LEVELS}
        showGuiTools={MVP_SHOW_GUI_TOOLS}
        onHierarchy={() => {
          if (sidebarOpen && activeTab === "entities") setSidebarOpen(false);
          else openHierarchy();
        }}
        onScenes={() => {
          if (sidebarOpen && activeTab === "scenes") setSidebarOpen(false);
          else openScenes();
        }}
        onPrefabs={() => {
          if (sidebarOpen && activeTab === "prefabs") setSidebarOpen(false);
          else openPrefabs();
        }}
        onLevels={
          MVP_SHOW_LEVELS
            ? () => {
                if (sidebarOpen && activeTab === "levels") setSidebarOpen(false);
                else openLevels();
              }
            : undefined
        }
        onGuis={
          MVP_SHOW_GUI_TOOLS
            ? () => {
                if (sidebarOpen && activeTab === "guis") setSidebarOpen(false);
                else openGuis();
              }
            : undefined
        }
        onGuiComponents={
          MVP_SHOW_GUI_TOOLS
            ? () => {
                if (sidebarOpen && activeTab === "components") setSidebarOpen(false);
                else openGuiComponents();
              }
            : undefined
        }
        onRecipes={() => {
          if (sidebarOpen && activeTab === "recipes") setSidebarOpen(false);
          else openRecipes();
        }}
        onServices={() => {
          if (sidebarOpen && activeTab === "services") setSidebarOpen(false);
          else openServices();
        }}
        onContent={() => {
          if (!bottomDrawerCollapsed && activeBottomTab === "assets") {
            setBottomDrawerCollapsed(true);
          } else {
            openContent("assets");
          }
        }}
        onAgent={() => {
          if (sidebarOpen && activeTab === "agent") setSidebarOpen(false);
          else openAgent();
        }}
        onWorld={() => {
          if (sidebarOpen && activeTab === "world") setSidebarOpen(false);
          else openWorld();
        }}
        onSave={project.saveScene}
        onRefresh={project.refresh}
        onImport={project.importAsset}
        onAddEntity={entities.addEntity}
        onOpenWizard={() => setWizardOpen(true)}
        onOpenAssetStudio={() => openContent("studio")}
        onSettings={() => setAgentSettingsOpen(true)}
        onCloseProject={project.isTauri ? project.handleCloseProject : undefined}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        activeTool={activeTool}
        snap={snap}
        snapSize={snapSize}
        showGrid={showGrid}
        showColliders={showColliders}
        zoom={zoom}
        onActiveToolChange={setActiveTool}
        onSnapToggle={setSnap}
        onSnapSizeChange={setSnapSize}
        onToggleGrid={setShowGrid}
        onToggleColliders={setShowColliders}
        onZoomChange={setZoom}
        onCenterView={centerView}
        onOpenTour={openTour}
      />

      {/* Left floating sheet */}
      <LeftSidebarSheet
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
        agentExpanded={agentExpanded}
        setAgentExpanded={setAgentExpanded}
        setInspectorOpen={setInspectorOpen}
        setAgentSettingsOpen={setAgentSettingsOpen}
        gameServices={project.snapshot.project?.gameServices}
        onUpdateGameServices={project.handleUpdateGameServices}
        snapshot={project.snapshot}
        currentSceneFile={project.currentSceneFile}
        setCurrentSceneFile={project.setCurrentSceneFile}
        scene={project.scene}
        updateScene={project.updateScene}
        refresh={project.refresh}
        setStatus={project.setStatus}
        addConsoleLog={project.addConsoleLog}
        activateScene={project.activateScene}
        handleCreateScene={project.handleCreateScene}
        handleDeleteScene={project.handleDeleteScene}
        normalizeSceneFile={project.normalizeSceneFile}
        sceneFileMatches={project.sceneFileMatches}
        selectedEntityIds={entities.selectedEntityIds}
        setSelectedEntityIds={entities.setSelectedEntityIds}
        selectedEntityId={entities.selectedEntityId}
        selectedEntity={entities.selectedEntity}
        clipboardRef={entities.clipboardRef}
        deleteEntity={entities.deleteEntity}
        duplicateEntity={entities.duplicateEntity}
        pasteEntity={entities.pasteEntity}
        saveEntityAsPrefab={entities.saveEntityAsPrefab}
        addEntity={entities.addEntity}
        addTemplateEntity={entities.addTemplateEntity}
        isPlaying={play.isPlaying}
        showLevels={MVP_SHOW_LEVELS}
        handleCreateLevel={levels.handleCreateLevel}
        handleDeleteLevel={levels.handleDeleteLevel}
        handleToggleUnlockLevel={levels.handleToggleUnlockLevel}
        handleReorderLevels={levels.handleReorderLevels}
        handleAssignSceneToLevel={levels.handleAssignSceneToLevel}
        handleRemoveSceneFromLevel={levels.handleRemoveSceneFromLevel}
        handleUpdateLevel={levels.handleUpdateLevel}
        showGuiTools={MVP_SHOW_GUI_TOOLS}
        selectedGuiNodeId={gui.selectedGuiNodeId}
        setSelectedGuiNodeId={gui.setSelectedGuiNodeId}
        setSelectedComponentInstanceId={gui.setSelectedComponentInstanceId}
        addGuiNode={gui.addGuiNode}
        deleteGuiNode={gui.deleteGuiNode}
        editingComponentId={gui.editingComponentId}
        setEditingComponentId={gui.setEditingComponentId}
        addGuiComponent={gui.addGuiComponent}
        deleteGuiComponent={gui.deleteGuiComponent}
        addNodeToEditingComponent={gui.addNodeToEditingComponent}
        deleteNodeFromEditingComponent={gui.deleteNodeFromEditingComponent}
        addGuiComponentInstance={gui.addGuiComponentInstance}
      />

      {/* Right floating inspector sheet */}
      <RightInspectorSheet
        inspectorOpen={inspectorOpen}
        selectedComponentInstanceId={gui.selectedComponentInstanceId}
        selectedGuiNodeId={gui.selectedGuiNodeId}
        selectedEntityId={entities.selectedEntityId}
        selectedEntity={entities.selectedEntity}
        selectedEntityIds={entities.selectedEntityIds}
        scene={project.scene}
        assets={project.snapshot.assets}
        guiComponents={project.snapshot.guiComponents}
        updateGuiComponentInstance={gui.updateGuiComponentInstance}
        deleteGuiComponentInstance={gui.deleteGuiComponentInstance}
        updateGuiNode={gui.updateGuiNode}
        deleteGuiNode={gui.deleteGuiNode}
        updateScene={project.updateScene}
        deleteEntity={entities.deleteEntity}
      />

      {/* Content drawer */}
      <BottomContentDrawer
        scene={project.scene}
        bottomDrawerCollapsed={bottomDrawerCollapsed}
        setBottomDrawerCollapsed={setBottomDrawerCollapsed}
        activeBottomTab={activeBottomTab}
        setActiveBottomTab={setActiveBottomTab}
        snapshot={project.snapshot}
        selectedAssetId={project.selectedAssetId}
        setSelectedAssetId={project.setSelectedAssetId}
        selectedEntityId={entities.selectedEntityId}
        currentSceneFile={project.currentSceneFile}
        logs={project.logs}
        setLogs={project.setLogs}
        deleteAsset={project.deleteAsset}
        importAsset={project.importAsset}
        openContent={openContent}
        refresh={project.refresh}
        setError={setError}
        executeConsoleCommand={(cmd) =>
          project.executeConsoleCommand(cmd, entities.selectedEntityId ?? null, entities.setSelectedEntityIds)
        }
        updateScene={project.updateScene}
        handleSpawnEntityWithSprite={entities.handleSpawnEntityWithSprite}
        handleSpawnEntityWithAnimation={entities.handleSpawnEntityWithAnimation}
        handleAttachAudioToEntity={entities.handleAttachAudioToEntity}
        showTimeline={MVP_SHOW_TIMELINE}
        showConsole={MVP_SHOW_CONSOLE}
      />

      {/* Dialogs and Modals */}
      <NewProjectWizard
        open={newProjectWizardOpen}
        onClose={() => setNewProjectWizardOpen(false)}
        onProjectCreated={async (path) => {
          setNewProjectWizardOpen(false);
          await project.loadProjectFolder(path);
        }}
      />
      <AgentSettings open={agentSettingsOpen} onClose={() => setAgentSettingsOpen(false)} />
      <ProjectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onApplied={(sceneFile) => {
          project.setCurrentSceneFile(sceneFile);
          project.refresh().catch((e) => project.setStatus(e instanceof Error ? e.message : "Refresh failed"));
        }}
        onStatus={(message) => {
          project.setStatus(message);
          project.addConsoleLog("system", message);
        }}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        commands={commandItems}
      />
      <EditorTour isOpen={isTourOpen} onClose={closeTour} />
    </main>
  );
}
