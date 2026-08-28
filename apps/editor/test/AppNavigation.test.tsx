import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";

const testState = vi.hoisted(() => ({
  selectedEntityIds: new Set<string>(),
}));

vi.mock("../src/components/AppTabBar.js", () => ({
  AppTabBar: ({ active, onHierarchy, onScenes, onContent }: any) => (
    <nav aria-label="Test navigation" data-active={active ?? "canvas"}>
      <button onClick={onHierarchy}>Hierarchy</button>
      <button onClick={onScenes}>Scenes</button>
      <button onClick={onContent}>Content</button>
    </nav>
  ),
}));

vi.mock("../src/components/layout/CanvasWorkspace.js", () => ({
  CanvasWorkspace: () => <div data-testid="canvas-workspace" />,
}));

vi.mock("../src/components/layout/LeftSidebarSheet.js", () => ({
  LeftSidebarSheet: ({ layout }: any) => (
    <aside data-testid="left-sheet" data-open={layout.sidebarOpen} data-tab={layout.activeTab} />
  ),
}));

vi.mock("../src/components/layout/RightInspectorSheet.js", () => ({
  RightInspectorSheet: ({ inspectorOpen }: any) => (
    <aside data-testid="right-sheet" data-open={inspectorOpen} />
  ),
}));

vi.mock("../src/components/layout/BottomContentDrawer.js", () => ({
  BottomContentDrawer: ({ bottomDrawerCollapsed, activeBottomTab }: any) => (
    <section
      data-testid="bottom-drawer"
      data-open={!bottomDrawerCollapsed}
      data-tab={activeBottomTab}
    />
  ),
}));

vi.mock("../src/components/BrandCorner.js", () => ({ BrandCorner: () => null }));
vi.mock("../src/components/PlayControls.js", () => ({ PlayControls: () => null }));
vi.mock("../src/components/CommandPalette.js", () => ({ CommandPalette: () => null }));
vi.mock("../src/components/ProjectWizard.js", () => ({ ProjectWizard: () => null }));
vi.mock("../src/components/WelcomeHub.js", () => ({ WelcomeHub: () => null }));
vi.mock("../src/components/NewProjectWizard.js", () => ({ NewProjectWizard: () => null }));
vi.mock("../src/components/AgentSettings.js", () => ({ AgentSettings: () => null }));
vi.mock("../src/components/EditorTour.js", () => ({
  EditorTour: () => null,
  useEditorTour: () => ({ isTourOpen: false, openTour: vi.fn(), closeTour: vi.fn() }),
}));

vi.mock("../src/hooks/useProjectState.js", () => ({
  useProjectState: () => ({
    snapshot: { assets: [], scenes: [], prefabs: [], guiComponents: [], levels: [] },
    scene: { id: "scene", name: "Scene", entities: [], layers: [], gui: { nodes: [] } },
    currentSceneFile: "main.scene.json",
    workspace: { split: "single" },
    dirtyFiles: new Set(),
    paneScenes: [],
    selectedAssetId: undefined,
    logs: [],
    isDirty: false,
    isTauri: false,
    projectPath: null,
    recentProjects: [],
    exampleProjects: [],
    isLoadingProject: false,
    projectLoadError: null,
    saveState: "saved",
    canUndo: false,
    canRedo: false,
    sceneRef: { current: null },
    undoBypassRef: { current: false },
    setSnapshot: vi.fn(),
    setScene: vi.fn(),
    setCurrentSceneFile: vi.fn(),
    setSelectedAssetId: vi.fn(),
    setLogs: vi.fn(),
    setIsDirty: vi.fn(),
    setRecentProjects: vi.fn(),
    setStatus: vi.fn(),
    updateScene: vi.fn(),
    persistProject: vi.fn(),
    addConsoleLog: vi.fn(),
    activateScene: vi.fn(),
    handleCloseSceneTab: vi.fn(),
    handleSplitChange: vi.fn(),
    push: vi.fn(),
    triggerAutoSave: vi.fn(),
    reset: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    saveScene: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    importAsset: vi.fn(),
    deleteAsset: vi.fn(),
    handleOpenProject: vi.fn(),
    loadProjectFolder: vi.fn(),
    handleCloseProject: vi.fn(),
    handleUpdateGameServices: vi.fn(),
    handleCreateScene: vi.fn(),
    handleDeleteScene: vi.fn(),
    normalizeSceneFile: (value: string) => value,
    sceneFileMatches: (a: string, b: string) => a === b,
    executeConsoleCommand: vi.fn(),
    startHotReload: () => vi.fn(),
  }),
}));

vi.mock("../src/hooks/useSceneEntities.js", () => ({
  useSceneEntities: () => ({
    selectedEntityIds: testState.selectedEntityIds,
    selectedEntityIdsRef: { current: testState.selectedEntityIds },
    selectedEntityId: undefined,
    selectedEntity: undefined,
    clipboardRef: { current: null },
    setSelectedEntityIds: vi.fn(),
    selectEntity: vi.fn(),
    addEntity: vi.fn(),
    deleteEntity: vi.fn(),
    duplicateEntity: vi.fn(),
    pasteEntity: vi.fn(),
    saveEntityAsPrefab: vi.fn(),
    addTemplateEntity: vi.fn(),
    handleSpawnEntityWithSprite: vi.fn(),
    handleSpawnEntityWithAnimation: vi.fn(),
    handleAttachAudioToEntity: vi.fn(),
  }),
}));

vi.mock("../src/hooks/useSceneGui.js", () => ({
  useSceneGui: () => ({
    selectedGuiNodeId: null,
    selectedComponentInstanceId: null,
    editingComponentId: null,
    clearGuiSelection: vi.fn(),
    setSelectedGuiNodeId: vi.fn(),
    setSelectedComponentInstanceId: vi.fn(),
    setEditingComponentId: vi.fn(),
    addGuiNode: vi.fn(),
    deleteGuiNode: vi.fn(),
    addGuiComponent: vi.fn(),
    deleteGuiComponent: vi.fn(),
    addNodeToEditingComponent: vi.fn(),
    deleteNodeFromEditingComponent: vi.fn(),
    addGuiComponentInstance: vi.fn(),
    updateGuiComponentInstance: vi.fn(),
    deleteGuiComponentInstance: vi.fn(),
    updateGuiNode: vi.fn(),
  }),
}));

vi.mock("../src/hooks/useLevels.js", () => ({
  useLevels: () => ({
    syncPlayLevelUnlocksFromManager: vi.fn(),
    handleCreateLevel: vi.fn(),
    handleDeleteLevel: vi.fn(),
    handleToggleUnlockLevel: vi.fn(),
    handleReorderLevels: vi.fn(),
    handleAssignSceneToLevel: vi.fn(),
    handleRemoveSceneFromLevel: vi.fn(),
    handleUpdateLevel: vi.fn(),
  }),
}));

vi.mock("../src/hooks/usePlaySimulation.js", () => ({
  usePlaySimulation: () => ({
    isPlaying: false,
    isPaused: false,
    profilerOpen: false,
    playViewPan: { x: 0, y: 0 },
    playOutcome: null,
    playLives: 0,
    playHostScene: null,
    playHostKey: 0,
    playAssetUrls: {},
    playHostLevel: null,
    profilerSample: null,
    virtualTouchControls: [],
    playFps: 0,
    playFrameMs: 0,
    playDrawCalls: 0,
    playHotSwapRef: { current: null },
    playSceneManagerRef: { current: null },
    playLivesRef: { current: 0 },
    playOutcomeRef: { current: null },
    playVarsRef: { current: {} },
    setIsPaused: vi.fn(),
    setPlayOutcome: vi.fn(),
    setPlayLives: vi.fn(),
    setProfilerOpen: vi.fn(),
    handlePlayToggle: vi.fn(),
    handleStop: vi.fn(),
    handlePlayRestart: vi.fn(),
    onVirtualInput: vi.fn(),
    onGuiAction: vi.fn(),
    onPhaserOutcome: vi.fn(),
    onMetrics: vi.fn(),
  }),
}));

vi.mock("../src/hooks/useEditorCommands.js", () => ({ useEditorCommands: () => [] }));
vi.mock("../src/hooks/useKeyboardShortcuts.js", () => ({ useKeyboardShortcuts: () => undefined }));

describe("App navigation", () => {
  beforeEach(() => {
    testState.selectedEntityIds = new Set();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps left navigation and the bottom drawer mutually exclusive", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Scenes" }));
    expect(screen.getByLabelText("Test navigation")).toHaveAttribute("data-active", "scenes");
    expect(screen.getByTestId("left-sheet")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("left-sheet")).toHaveAttribute("data-tab", "scenes");
    expect(screen.getByTestId("bottom-drawer")).toHaveAttribute("data-open", "false");

    fireEvent.click(screen.getByRole("button", { name: "Content" }));
    expect(screen.getByLabelText("Test navigation")).toHaveAttribute("data-active", "content");
    expect(screen.getByTestId("left-sheet")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("bottom-drawer")).toHaveAttribute("data-open", "true");

    fireEvent.click(screen.getByRole("button", { name: "Content" }));
    expect(screen.getByLabelText("Test navigation")).toHaveAttribute("data-active", "canvas");
    expect(screen.getByTestId("bottom-drawer")).toHaveAttribute("data-open", "false");
  });

  it("keeps the selection-driven inspector open across canvas destinations", async () => {
    testState.selectedEntityIds = new Set(["entity-1"]);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("right-sheet")).toHaveAttribute("data-open", "true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Content" }));
    expect(screen.getByTestId("left-sheet")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("bottom-drawer")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("right-sheet")).toHaveAttribute("data-open", "true");
  });
});
