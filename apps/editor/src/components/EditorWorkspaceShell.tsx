import { BrandCorner } from "./BrandCorner.js";
import { AppTabBar } from "./AppTabBar.js";
import { PlayControls } from "./PlayControls.js";
import { CommandPalette } from "./CommandPalette.js";
import { EditorTour } from "./EditorTour.js";
import { ProjectWizard } from "./ProjectWizard.js";
import { NewProjectWizard } from "./NewProjectWizard.js";
import { AgentSettings } from "./AgentSettings.js";
import { getTabBarDestination } from "../lib/editor-layout.js";
import shellStyles from "./AppShell.module.css";
import { CanvasWorkspace } from "./layout/CanvasWorkspace.js";
import { LeftSidebarSheet } from "./layout/LeftSidebarSheet.js";
import { RightInspectorSheet } from "./layout/RightInspectorSheet.js";
import { BottomContentDrawer } from "./layout/BottomContentDrawer.js";
import {
  type EditorController,
  MVP_SHOW_GUI_TOOLS,
  MVP_SHOW_LEVELS,
  MVP_SHOW_TIMELINE,
  MVP_SHOW_CONSOLE,
} from "../hooks/useEditorController.js";

type EditorWorkspaceShellProps = {
  controller: EditorController;
};

export function EditorWorkspaceShell({ controller }: EditorWorkspaceShellProps) {
  const {
    isTourOpen,
    openTour,
    closeTour,
    layout,
    dispatchLayout,
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
    openLevels,
    openContent,
    setError,
    gui,
    entities,
    levels,
    play,
    commandItems,
  } = controller;

  return (
    <main
      className={shellStyles.shell}
      data-drawer-collapsed={bottomDrawerCollapsed ? "true" : "false"}
      data-bottom-sheet-open={!bottomDrawerCollapsed ? "true" : "false"}
    >
      <CanvasWorkspace
        document={{
          scene: project.scene,
          snapshot: project.snapshot,
          currentSceneFile: project.currentSceneFile,
          workspace: project.workspace,
          dirtyFiles: project.dirtyFiles,
          paneScenes: project.paneScenes,
          activateScene: project.activateScene,
          handleCloseSceneTab: project.handleCloseSceneTab,
          handleSplitChange: project.handleSplitChange,
          updateScene: project.updateScene,
          push: project.push,
          setIsDirty: project.setIsDirty,
          triggerAutoSave: project.triggerAutoSave,
        }}
        viewport={{
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
          showGuiTools: MVP_SHOW_GUI_TOOLS,
        }}
        selection={{
          selectedEntityIds: entities.selectedEntityIds,
          setSelectedEntityIds: entities.setSelectedEntityIds,
          selectedGuiNodeId: gui.selectedGuiNodeId,
          setSelectedGuiNodeId: gui.setSelectedGuiNodeId,
          selectedComponentInstanceId: gui.selectedComponentInstanceId,
          setSelectedComponentInstanceId: gui.setSelectedComponentInstanceId,
          clipboardRef: entities.clipboardRef,
          addEntity: entities.addEntity,
          deleteEntity: entities.deleteEntity,
          duplicateEntity: entities.duplicateEntity,
          pasteEntity: entities.pasteEntity,
          saveEntityAsPrefab: entities.saveEntityAsPrefab,
        }}
        playback={{
          isPlaying: play.isPlaying,
          isPaused: play.isPaused,
          setIsPaused: play.setIsPaused,
          playViewPan: play.playViewPan,
          playOutcome: play.playOutcome,
          setPlayOutcome: play.setPlayOutcome,
          playLives: play.playLives,
          setPlayLives: play.setPlayLives,
          playHostScene: play.playHostScene,
          playHostKey: play.playHostKey,
          playAssetUrls: play.playAssetUrls,
          playHostLevel: play.playHostLevel,
          profilerOpen: play.profilerOpen,
          profilerSample: play.profilerSample,
          virtualTouchControls: play.virtualTouchControls,
          handlePlayToggle: play.handlePlayToggle,
          handleStop: play.handleStop,
          handlePlayRestart: play.handlePlayRestart,
          onVirtualInput: play.onVirtualInput,
          onGuiAction: play.onGuiAction,
          onPhaserOutcome: play.onPhaserOutcome,
          onMetrics: play.onMetrics,
          playHotSwapRef: play.playHotSwapRef,
          playSceneManagerRef: play.playSceneManagerRef,
          playLivesRef: play.playLivesRef,
          playOutcomeRef: play.playOutcomeRef,
          playVarsRef: play.playVarsRef,
          syncPlayLevelUnlocksFromManager: levels.syncPlayLevelUnlocksFromManager,
          addConsoleLog: project.addConsoleLog,
        }}
        navigation={{
          openContent,
          openLevels,
          openTour,
          setNewProjectWizardOpen,
        }}
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
        active={getTabBarDestination(layout.destination)}
        saveState={project.saveState}
        projectPath={project.isTauri ? project.projectPath : null}
        showLevels={MVP_SHOW_LEVELS}
        showGuiTools={MVP_SHOW_GUI_TOOLS}
        onHierarchy={() => {
          dispatchLayout({ type: "toggle", destination: { region: "left", tab: "entities" } });
        }}
        onScenes={() => {
          dispatchLayout({ type: "toggle", destination: { region: "left", tab: "scenes" } });
        }}
        onPrefabs={() => {
          dispatchLayout({ type: "toggle", destination: { region: "left", tab: "prefabs" } });
        }}
        onLevels={
          MVP_SHOW_LEVELS
            ? () => {
                dispatchLayout({ type: "toggle", destination: { region: "left", tab: "levels" } });
              }
            : undefined
        }
        onGuis={
          MVP_SHOW_GUI_TOOLS
            ? () => {
                dispatchLayout({ type: "toggle", destination: { region: "left", tab: "guis" } });
              }
            : undefined
        }
        onGuiComponents={
          MVP_SHOW_GUI_TOOLS
            ? () => {
                dispatchLayout({
                  type: "toggle",
                  destination: { region: "left", tab: "components" },
                });
              }
            : undefined
        }
        onRecipes={() => {
          dispatchLayout({ type: "toggle", destination: { region: "left", tab: "recipes" } });
        }}
        onServices={() => {
          dispatchLayout({ type: "toggle", destination: { region: "left", tab: "services" } });
        }}
        onContent={() => {
          dispatchLayout({ type: "toggle", destination: { region: "bottom", tab: "assets" } });
        }}
        onAgent={() => {
          dispatchLayout({ type: "toggle", destination: { region: "left", tab: "agent" } });
        }}
        onWorld={() => {
          dispatchLayout({ type: "toggle", destination: { region: "left", tab: "world" } });
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
        layout={{
          sidebarOpen,
          activeTab,
          agentExpanded,
          setAgentExpanded,
          setInspectorOpen,
          setAgentSettingsOpen,
        }}
        document={{
          snapshot: project.snapshot,
          currentSceneFile: project.currentSceneFile,
          setCurrentSceneFile: project.setCurrentSceneFile,
          scene: project.scene,
          updateScene: project.updateScene,
          refresh: project.refresh,
          setStatus: project.setStatus,
          addConsoleLog: project.addConsoleLog,
          activateScene: project.activateScene,
          handleCreateScene: project.handleCreateScene,
          handleDeleteScene: project.handleDeleteScene,
          normalizeSceneFile: project.normalizeSceneFile,
          sceneFileMatches: project.sceneFileMatches,
        }}
        selection={{
          selectedEntityIds: entities.selectedEntityIds,
          setSelectedEntityIds: entities.setSelectedEntityIds,
          selectedEntityId: entities.selectedEntityId,
          selectedEntity: entities.selectedEntity,
          clipboardRef: entities.clipboardRef,
          deleteEntity: entities.deleteEntity,
          duplicateEntity: entities.duplicateEntity,
          pasteEntity: entities.pasteEntity,
          saveEntityAsPrefab: entities.saveEntityAsPrefab,
          addEntity: entities.addEntity,
          addTemplateEntity: entities.addTemplateEntity,
        }}
        playback={{ isPlaying: play.isPlaying }}
        levels={{
          showLevels: MVP_SHOW_LEVELS,
          handleCreateLevel: levels.handleCreateLevel,
          handleDeleteLevel: levels.handleDeleteLevel,
          handleToggleUnlockLevel: levels.handleToggleUnlockLevel,
          handleReorderLevels: levels.handleReorderLevels,
          handleAssignSceneToLevel: levels.handleAssignSceneToLevel,
          handleRemoveSceneFromLevel: levels.handleRemoveSceneFromLevel,
          handleUpdateLevel: levels.handleUpdateLevel,
        }}
        gui={{
          showGuiTools: MVP_SHOW_GUI_TOOLS,
          selectedGuiNodeId: gui.selectedGuiNodeId,
          setSelectedGuiNodeId: gui.setSelectedGuiNodeId,
          setSelectedComponentInstanceId: gui.setSelectedComponentInstanceId,
          addGuiNode: gui.addGuiNode,
          deleteGuiNode: gui.deleteGuiNode,
          editingComponentId: gui.editingComponentId,
          setEditingComponentId: gui.setEditingComponentId,
          addGuiComponent: gui.addGuiComponent,
          deleteGuiComponent: gui.deleteGuiComponent,
          addNodeToEditingComponent: gui.addNodeToEditingComponent,
          deleteNodeFromEditingComponent: gui.deleteNodeFromEditingComponent,
          addGuiComponentInstance: gui.addGuiComponentInstance,
        }}
        services={{
          gameServices: project.snapshot.project?.gameServices,
          onUpdateGameServices: project.handleUpdateGameServices,
        }}
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
        setBottomDrawerCollapsed={(collapsed) => {
          if (collapsed) dispatchLayout({ type: "close-navigation" });
          else openContent(activeBottomTab);
        }}
        activeBottomTab={activeBottomTab}
        setActiveBottomTab={openContent}
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
          project.executeConsoleCommand(
            cmd,
            entities.selectedEntityId ?? null,
            entities.setSelectedEntityIds
          )
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
          project
            .refresh()
            .catch((e) => project.setStatus(e instanceof Error ? e.message : "Refresh failed"));
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
