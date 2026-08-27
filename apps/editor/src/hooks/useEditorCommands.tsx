import { useMemo, type ReactNode } from "react";
import type { GameKitEntity, GameKitScene } from "@gamekit/schema";
import type { CommandItem } from "../components/CommandPalette.js";
import type { CanvasTool, TilePaintMode } from "../lib/editor-tools.js";
import type { SplitMode } from "../lib/scene-workspace.js";
import type { ProjectSnapshot } from "../types.js";
import {
  Folder,
  Layers,
  Sparkles,
  Save,
  RefreshCw,
  Plus,
  LayoutTemplate,
  Settings,
  LogOut,
  MousePointer,
  Move,
  RefreshCcw,
  Maximize,
  Paintbrush,
  Eraser,
  Magnet,
  Grid3x3,
  Eye,
  EyeOff,
  Focus,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Play,
  Square,
  Box,
  FileText,
  Command,
  Route,
  Columns2,
  Activity,
  Wand2,
} from "lucide-react";

export interface UseEditorCommandsOptions {
  scene: GameKitScene | undefined;
  snapshot: ProjectSnapshot;
  currentSceneFile: string;
  selectedEntity: GameKitEntity | undefined;
  isTauri: boolean;
  projectPath: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  canUndo: boolean;
  canRedo: boolean;
  snap: boolean;
  showGrid: boolean;
  showColliders: boolean;
  profilerOpen: boolean;
  splitMode: SplitMode;
  // Nav callbacks
  openHierarchy: () => void;
  openScenes: () => void;
  openPrefabs: () => void;
  openLevels: () => void;
  openAgent: () => void;
  openWorld: () => void;
  openGuis: () => void;
  openGuiComponents: () => void;
  openRecipes: () => void;
  openContent: (tab?: "assets" | "studio" | "timeline" | "console") => void;
  centerView: () => void;
  // Actions
  saveEntityAsPrefab: (entityId: string) => Promise<void>;
  setActiveTool: (tool: CanvasTool) => void;
  setTilePaintMode: (mode: TilePaintMode) => void;
  handleSplitChange: (split: SplitMode) => void;
  setProfilerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSnap: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  setShowColliders: React.Dispatch<React.SetStateAction<boolean>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  addEntity: () => void;
  setWizardOpen: (open: boolean) => void;
  setNewProjectWizardOpen: (open: boolean) => void;
  setWelcomeHubOpen: (open: boolean) => void;
  setAgentSettingsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  undo: () => void;
  redo: () => void;
  saveScene: () => Promise<void>;
  refresh: () => Promise<void>;
  handlePlayToggle: () => Promise<void>;
  handleStop: () => void;
  handleCloseProject: () => Promise<void>;
  activateScene: (file: string) => void;
  selectEntity: (entityId: string) => void;
  setStatus: (status: string) => void;
  showLevels?: boolean;
  showGuiTools?: boolean;
}

export function useEditorCommands({
  scene,
  snapshot,
  currentSceneFile,
  selectedEntity,
  isTauri,
  projectPath,
  isPlaying,
  isPaused,
  canUndo,
  canRedo,
  snap,
  showGrid,
  showColliders,
  profilerOpen,
  splitMode,
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
  saveEntityAsPrefab,
  setActiveTool,
  setTilePaintMode,
  handleSplitChange,
  setProfilerOpen,
  setSnap,
  setShowGrid,
  setShowColliders,
  setZoom,
  addEntity,
  setWizardOpen,
  setNewProjectWizardOpen,
  setWelcomeHubOpen,
  setAgentSettingsOpen,
  setCommandPaletteOpen,
  undo,
  redo,
  saveScene,
  refresh,
  handlePlayToggle,
  handleStop,
  handleCloseProject,
  activateScene,
  selectEntity,
  setStatus,
  showLevels = true,
  showGuiTools = true,
}: UseEditorCommandsOptions): CommandItem[] {
  return useMemo((): CommandItem[] => {
    const ic = (node: ReactNode) => node;
    const items: CommandItem[] = [
      {
        id: "nav-hierarchy",
        label: "Open Hierarchy",
        section: "Navigate",
        keywords: ["entities", "panel", "sidebar"],
        icon: ic(<Layers size={14} strokeWidth={1.75} />),
        run: openHierarchy,
      },
      {
        id: "nav-content",
        label: "Open Content",
        section: "Navigate",
        keywords: ["assets", "drawer", "files"],
        icon: ic(<Folder size={14} strokeWidth={1.75} />),
        run: () => openContent("assets"),
      },
      {
        id: "open-asset-studio",
        label: "Open Asset Studio",
        section: "Assets",
        keywords: ["asset", "generate", "sprite", "sfx", "music", "character", "sound", "animation"],
        icon: ic(<Wand2 size={14} strokeWidth={1.75} className="text-cyan-400" />),
        shortcut: "Mod+Shift+G",
        run: () => openContent("studio"),
      },
      {
        id: "gen-sprite",
        label: "Generate Sprite / Prop",
        section: "Assets",
        keywords: ["sprite", "pixel", "prop", "item", "tile", "generate"],
        icon: ic(<Wand2 size={14} strokeWidth={1.75} />),
        run: () => openContent("studio"),
      },
      {
        id: "gen-animated-char",
        label: "Generate Animated Character",
        section: "Assets",
        keywords: ["character", "animation", "spritesheet", "walk", "jump", "hero", "knight"],
        icon: ic(<Wand2 size={14} strokeWidth={1.75} />),
        run: () => openContent("studio"),
      },
      {
        id: "gen-sfx",
        label: "Generate Sound Effect (SFX)",
        section: "Assets",
        keywords: ["sfx", "sound", "jump", "coin", "laser", "explosion", "hit", "audio"],
        icon: ic(<Wand2 size={14} strokeWidth={1.75} />),
        run: () => openContent("studio"),
      },
      {
        id: "gen-music",
        label: "Generate Music Track (BGM)",
        section: "Assets",
        keywords: ["music", "bgm", "chiptune", "song", "theme", "audio", "soundtrack"],
        icon: ic(<Wand2 size={14} strokeWidth={1.75} />),
        run: () => openContent("studio"),
      },
      {
        id: "nav-agent",
        label: "Open Agent",
        section: "Navigate",
        keywords: ["ai", "assistant"],
        icon: ic(<Sparkles size={14} strokeWidth={1.75} />),
        run: openAgent,
      },
      {
        id: "nav-scenes",
        label: "Open Scenes",
        section: "Navigate",
        keywords: ["files", "management"],
        icon: ic(<FileText size={14} strokeWidth={1.75} />),
        run: openScenes,
      },
      {
        id: "nav-prefabs",
        label: "Open Prefabs",
        section: "Navigate",
        keywords: ["templates", "instances", "reuse"],
        icon: ic(<Box size={14} strokeWidth={1.75} />),
        run: openPrefabs,
      },
      {
        id: "create-prefab",
        label: selectedEntity
          ? `Save “${selectedEntity.name || selectedEntity.id}” as Prefab`
          : "Save selection as Prefab",
        section: "Create",
        keywords: ["prefab", "template", "save"],
        icon: ic(<Box size={14} strokeWidth={1.75} />),
        disabled: !selectedEntity,
        run: () => {
          if (!selectedEntity) return;
          void saveEntityAsPrefab(selectedEntity.id);
        },
      },
      ...(showLevels
        ? [
            {
              id: "nav-levels",
              label: "Open Levels",
              section: "Navigate",
              keywords: ["levels", "order", "unlock"],
              icon: ic(<Layers size={14} strokeWidth={1.75} />),
              run: openLevels,
            } satisfies CommandItem,
          ]
        : []),
      {
        id: "nav-world",
        label: "Open World Settings",
        section: "Navigate",
        keywords: ["viewport", "gravity", "responsive", "scene", "input", "controls"],
        icon: ic(<Settings size={14} strokeWidth={1.75} />),
        run: openWorld,
      },
      ...(showGuiTools
        ? ([
            {
              id: "nav-guis",
              label: "Open GUI nodes",
              section: "Navigate",
              keywords: ["gui", "hud", "text", "button", "overlay"],
              icon: ic(<LayoutTemplate size={14} strokeWidth={1.75} />),
              run: openGuis,
            },
            {
              id: "nav-gui-components",
              label: "Open GUI components",
              section: "Navigate",
              keywords: ["gui", "component", "prefab", "widget"],
              icon: ic(<Box size={14} strokeWidth={1.75} />),
              run: openGuiComponents,
            },
          ] satisfies CommandItem[])
        : []),
      {
        id: "nav-recipes",
        label: "Open Recipes",
        section: "Navigate",
        keywords: ["recipe", "effect", "mechanic", "script", "animation", "gesture"],
        icon: ic(<Sparkles size={14} strokeWidth={1.75} />),
        run: openRecipes,
      },
      {
        id: "tool-select",
        label: "Select tool",
        section: "Tools",
        shortcut: "Q",
        icon: ic(<MousePointer size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("select"),
      },
      {
        id: "tool-move",
        label: "Move tool",
        section: "Tools",
        shortcut: "W",
        icon: ic(<Move size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("translate"),
      },
      {
        id: "tool-rotate",
        label: "Rotate tool",
        section: "Tools",
        shortcut: "E",
        icon: ic(<RefreshCcw size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("rotate"),
      },
      {
        id: "tool-scale",
        label: "Scale tool",
        section: "Tools",
        shortcut: "R",
        icon: ic(<Maximize size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("scale"),
      },
      {
        id: "tool-paint",
        label: "Paint tool",
        section: "Tools",
        shortcut: "B",
        keywords: ["tile", "brush"],
        icon: ic(<Paintbrush size={14} strokeWidth={1.75} />),
        run: () => {
          setActiveTool("paint");
          setTilePaintMode("brush");
        },
      },
      {
        id: "tool-erase",
        label: "Erase tool",
        section: "Tools",
        shortcut: "X",
        icon: ic(<Eraser size={14} strokeWidth={1.75} />),
        run: () => {
          setActiveTool("erase");
          setTilePaintMode("erase");
        },
      },
      {
        id: "tool-fill",
        label: "Fill tiles",
        section: "Tools",
        shortcut: "G",
        keywords: ["bucket", "flood"],
        icon: ic(<Paintbrush size={14} strokeWidth={1.75} />),
        run: () => {
          setActiveTool("paint");
          setTilePaintMode("fill");
        },
      },
      {
        id: "tool-rect",
        label: "Rect paint",
        section: "Tools",
        shortcut: "T",
        icon: ic(<Maximize size={14} strokeWidth={1.75} />),
        run: () => {
          setActiveTool("paint");
          setTilePaintMode("rect");
        },
      },
      {
        id: "view-split-h",
        label: splitMode === "horizontal" ? "Close split view" : "Split scenes left/right",
        section: "View",
        keywords: ["pane", "tabs"],
        icon: ic(<Columns2 size={14} strokeWidth={1.75} />),
        run: () => handleSplitChange(splitMode === "horizontal" ? "none" : "horizontal"),
      },
      {
        id: "view-profiler",
        label: profilerOpen ? "Hide profiler" : "Show profiler",
        section: "View",
        shortcut: "`",
        keywords: ["fps", "draw", "calls"],
        icon: ic(<Activity size={14} strokeWidth={1.75} />),
        run: () => setProfilerOpen((open) => !open),
      },
      {
        id: "tool-polygon-edit",
        label: "Polygon edit tool",
        section: "Tools",
        keywords: ["polygon", "collider", "points"],
        shortcut: "P",
        icon: ic(<Route size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("polygon-edit"),
      },
      {
        id: "tool-snap",
        label: snap ? "Disable snap" : "Enable snap",
        section: "Tools",
        keywords: ["grid", "magnet"],
        icon: ic(<Magnet size={14} strokeWidth={1.75} />),
        run: () => setSnap((v) => !v),
      },
      {
        id: "view-grid",
        label: showGrid ? "Hide grid" : "Show grid",
        section: "View",
        icon: ic(<Grid3x3 size={14} strokeWidth={1.75} />),
        run: () => setShowGrid((v) => !v),
      },
      {
        id: "view-colliders",
        label: showColliders ? "Hide colliders" : "Show colliders",
        section: "View",
        icon: ic(
          showColliders ? (
            <EyeOff size={14} strokeWidth={1.75} />
          ) : (
            <Eye size={14} strokeWidth={1.75} />
          )
        ),
        run: () => setShowColliders((v) => !v),
      },
      {
        id: "view-center",
        label: "Center view",
        section: "View",
        keywords: ["reset", "camera", "fit"],
        icon: ic(<Focus size={14} strokeWidth={1.75} />),
        run: centerView,
      },
      {
        id: "view-zoom-in",
        label: "Zoom in",
        section: "View",
        icon: ic(<ZoomIn size={14} strokeWidth={1.75} />),
        run: () => setZoom((z) => Math.min(4, z + 0.1)),
      },
      {
        id: "view-zoom-out",
        label: "Zoom out",
        section: "View",
        icon: ic(<ZoomOut size={14} strokeWidth={1.75} />),
        run: () => setZoom((z) => Math.max(0.25, z - 0.1)),
      },
      {
        id: "view-zoom-100",
        label: "Zoom to 100%",
        section: "View",
        icon: ic(<Focus size={14} strokeWidth={1.75} />),
        run: () => setZoom(1),
      },
      {
        id: "create-entity",
        label: "Add entity",
        section: "Create",
        keywords: ["new", "object"],
        icon: ic(<Plus size={14} strokeWidth={1.75} />),
        run: addEntity,
      },
      {
        id: "create-template",
        label: "New from template…",
        section: "Create",
        keywords: ["wizard", "skill", "genre"],
        icon: ic(<LayoutTemplate size={14} strokeWidth={1.75} />),
        run: () => setWizardOpen(true),
      },
      {
        id: "edit-undo",
        label: "Undo",
        section: "Edit",
        shortcut: "⌘Z",
        icon: ic(<Undo2 size={14} strokeWidth={1.75} />),
        disabled: !canUndo,
        run: () => undo(),
      },
      {
        id: "edit-redo",
        label: "Redo",
        section: "Edit",
        shortcut: "⇧⌘Z",
        icon: ic(<Redo2 size={14} strokeWidth={1.75} />),
        disabled: !canRedo,
        run: () => redo(),
      },
      {
        id: "project-save",
        label: "Save scene",
        section: "Project",
        shortcut: "⌘S",
        icon: ic(<Save size={14} strokeWidth={1.75} />),
        run: () => saveScene(),
      },
      {
        id: "project-refresh",
        label: "Refresh project",
        section: "Project",
        icon: ic(<RefreshCw size={14} strokeWidth={1.75} />),
        run: () => {
          refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
        },
      },
      {
        id: "project-settings",
        label: "Agent settings",
        section: "Project",
        keywords: ["preferences", "config"],
        icon: ic(<Settings size={14} strokeWidth={1.75} />),
        run: () => setAgentSettingsOpen(true),
      },
      {
        id: "sim-play",
        label: isPlaying
          ? isPaused
            ? "Resume simulation"
            : "Pause simulation"
          : "Play simulation",
        section: "Simulation",
        keywords: ["run", "preview"],
        icon: ic(<Play size={14} strokeWidth={1.75} />),
        run: handlePlayToggle,
      },
      {
        id: "sim-stop",
        label: "Stop simulation",
        section: "Simulation",
        icon: ic(<Square size={14} strokeWidth={1.75} />),
        disabled: !isPlaying,
        run: handleStop,
      },
      {
        id: "cmd-palette-hint",
        label: "Command menu",
        section: "Help",
        shortcut: "⌘K",
        keywords: ["spotlight", "search", "palette"],
        icon: ic(<Command size={14} strokeWidth={1.75} />),
        run: () => setCommandPaletteOpen(true),
      },
    ];

    items.push({
      id: "project-new",
      label: "New Game Project...",
      section: "Project",
      shortcut: "⌘N",
      keywords: ["create", "new", "project", "scaffold", "expo", "web", "tauri"],
      icon: ic(<Plus size={14} strokeWidth={1.75} />),
      run: () => setNewProjectWizardOpen(true),
    });

    items.push({
      id: "project-hub",
      label: "Open Project Launch Hub",
      section: "Project",
      keywords: ["hub", "welcome", "home", "dashboard", "onboarding"],
      icon: ic(<Sparkles size={14} strokeWidth={1.75} />),
      run: () => setWelcomeHubOpen(true),
    });

    if (isTauri && projectPath) {
      items.push({
        id: "project-close",
        label: "Close project",
        section: "Project",
        icon: ic(<LogOut size={14} strokeWidth={1.75} />),
        run: handleCloseProject,
      });
    }

    for (const sceneFile of snapshot.scenes) {
      items.push({
        id: `scene-${sceneFile}`,
        label: `Open scene “${sceneFile.replace(/\.scene\.json$/, "")}”`,
        section: "Scenes",
        keywords: ["goto", "switch", sceneFile],
        icon: ic(<FileText size={14} strokeWidth={1.75} />),
        run: () => activateScene(sceneFile),
      });
    }

    for (const entity of scene?.entities ?? []) {
      items.push({
        id: `entity-${entity.id}`,
        label: entity.name || entity.id,
        section: "Entities",
        keywords: ["select", "goto", entity.id],
        icon: ic(<Box size={14} strokeWidth={1.75} />),
        run: () => selectEntity(entity.id),
      });
    }

    return items;
  }, [
    scene,
    snapshot.scenes,
    currentSceneFile,
    selectedEntity,
    isTauri,
    projectPath,
    isPlaying,
    isPaused,
    canUndo,
    canRedo,
    snap,
    showGrid,
    showColliders,
    profilerOpen,
    splitMode,
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
    saveEntityAsPrefab,
    setActiveTool,
    setTilePaintMode,
    handleSplitChange,
    setProfilerOpen,
    setSnap,
    setShowGrid,
    setShowColliders,
    setZoom,
    addEntity,
    setWizardOpen,
    setNewProjectWizardOpen,
    setWelcomeHubOpen,
    setAgentSettingsOpen,
    setCommandPaletteOpen,
    undo,
    redo,
    saveScene,
    refresh,
    handlePlayToggle,
    handleStop,
    handleCloseProject,
    activateScene,
    selectEntity,
    setStatus,
    showLevels,
    showGuiTools,
  ]);
}
