import type { SaveState } from "../types.js";
import {
  Check,
  ChevronRight,
  Plus,
  RefreshCw,
  Save,
  Upload,
  Play,
  Pause,
  Square,
  Cpu,
  PanelLeft,
  PanelRight,
  Sparkles,
  Wand2,
  LayoutTemplate,
  HelpCircle,
  Gamepad2,
} from "lucide-react";
import { useRef } from "react";
import logoUrl from "../../../../logo.png";
import { Button, IconButton, StatusDot, cn } from "@/ui";

const MVP_SHOW_PLAY_CONTROLS = true;

type TopbarProps = {
  sceneName: string;
  isDirty: boolean;
  saveState: SaveState;
  status: string;
  lastSaved: Date | null;
  isPlaying: boolean;
  isPaused: boolean;
  playFps?: number;
  playFrameMs?: number;
  entityCount?: number;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  onPlayToggle: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
  onNativeToggle?: () => void;
  isNativeRunning?: boolean;
  onRefresh: () => void;
  onImport: (file: File) => void;
  onSave: () => void;
  onAddEntity: () => void;
  onToggleSidebar: () => void;
  onToggleInspector: () => void;
  onOpenAgent?: () => void;
  onOpenAssetStudio?: () => void;
  onOpenWizard?: () => void;
  onOpenTour?: () => void;
  onNewProject?: () => void;
  onOpenProjectHub?: () => void;
  formatLastSaved: () => string;
  projectPath?: string | null;
  onCloseProject?: () => void;
};

export function Topbar({
  sceneName,
  isDirty,
  saveState,
  status,
  lastSaved,
  isPlaying,
  isPaused,
  playFps = 0,
  playFrameMs = 0,
  entityCount = 0,
  sidebarOpen,
  inspectorOpen,
  onPlayToggle,
  onPauseToggle,
  onStop,
  onNativeToggle,
  isNativeRunning = false,
  onRefresh,
  onImport,
  onSave,
  onAddEntity,
  onToggleSidebar,
  onToggleInspector,
  onOpenAgent,
  onOpenAssetStudio,
  onOpenWizard,
  onOpenTour,
  onNewProject,
  onOpenProjectHub,
  formatLastSaved,
  projectPath,
  onCloseProject,
}: TopbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusKind =
    status === "Loading"
      ? "loading"
      : status.startsWith("Load") || status.includes("failed") || saveState === "error"
        ? "error"
        : saveState === "saved"
          ? "success"
          : "idle";

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 bg-bg-surface px-3">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenProjectHub}
          className="flex items-center gap-2 rounded-lg p-1 hover:bg-white/[0.06] transition-colors"
          title="Open Project Hub"
        >
          <img src={logoUrl} alt="Playroom" className="size-7 object-contain" />
          <div className="hidden min-w-0 sm:block text-left">
            <div className="text-[13px] font-semibold leading-none text-text-primary">Playroom</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-text-muted">
              Editor
            </div>
          </div>
        </button>
        <ChevronRight size={12} className="shrink-0 text-text-muted" />
        <span className="truncate font-mono text-[12px] font-medium text-text-secondary">
          {sceneName}
        </span>
        {isDirty && <StatusDot status="dirty" title="Unsaved changes" />}
        {onNewProject && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onNewProject}
            className="ml-1 hidden md:inline-flex text-xs gap-1"
          >
            <Plus size={12} className="text-accent" />
            New Game
          </Button>
        )}
        {projectPath && onCloseProject && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onCloseProject}
            className="ml-1 hidden lg:inline-flex text-xs"
          >
            Close
          </Button>
        )}
      </div>

      {MVP_SHOW_PLAY_CONTROLS && (
        <div
          id="tour-topbar-play"
          className="mx-auto flex items-center gap-1 rounded-md border border-border-default bg-bg-base p-0.5"
        >
          <IconButton
            size="md"
            variant={isPlaying && !isPaused ? "active" : "ghost"}
            className={cn(isPlaying && !isPaused && "text-accent-green shadow-glow-green")}
            onClick={onPlayToggle}
            title="Run Simulation"
          >
            <Play size={13} fill={isPlaying && !isPaused ? "currentColor" : "none"} />
          </IconButton>
          <IconButton
            size="md"
            variant={isPaused ? "active" : "ghost"}
            onClick={onPauseToggle}
            disabled={!isPlaying}
            title="Pause Simulation"
          >
            <Pause size={13} fill={isPaused ? "currentColor" : "none"} />
          </IconButton>
          <IconButton
            size="md"
            variant="danger"
            onClick={onStop}
            disabled={!isPlaying}
            title="Stop & Reset"
          >
            <Square size={12} />
          </IconButton>
          {onNativeToggle && (
            <IconButton
              size="md"
              variant={isNativeRunning ? "active" : "ghost"}
              className={cn(isNativeRunning && "text-accent shadow-glow-cyan")}
              onClick={onNativeToggle}
              title={isNativeRunning ? "Stop libGDX Desktop Game" : "Run libGDX Desktop Game"}
            >
              <Gamepad2 size={13} />
            </IconButton>
          )}
          {isPlaying && (
            <div className="ml-1 flex items-center gap-2 pl-2 pr-1 font-mono text-xs tracking-normal text-text-muted">
              <Cpu size={11} className="text-accent" />
              <span>
                FPS <strong className="text-accent-green">{playFps || "—"}</strong>
              </span>
              <span>
                {playFrameMs || "—"}
                ms
              </span>
              <span>
                Ent <strong className="text-text-secondary">{entityCount}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <IconButton
          size="md"
          variant={sidebarOpen ? "active" : "ghost"}
          onClick={onToggleSidebar}
          title="Toggle sidebar"
        >
          <PanelLeft size={14} />
        </IconButton>
        <IconButton size="md" onClick={onRefresh} title="Refresh">
          <RefreshCw size={14} />
        </IconButton>
        <IconButton size="md" onClick={() => fileInputRef.current?.click()} title="Import asset">
          <Upload size={14} />
        </IconButton>
        <IconButton size="md" onClick={onAddEntity} title="Add entity">
          <Plus size={14} />
        </IconButton>
        <IconButton
          size="md"
          variant={saveState === "saved" ? "accent" : saveState === "error" ? "danger" : "ghost"}
          onClick={onSave}
          title="Save (Ctrl+S)"
        >
          {saveState === "saved" ? <Check size={14} /> : <Save size={14} />}
        </IconButton>
        {onOpenAssetStudio && (
          <IconButton
            size="md"
            onClick={onOpenAssetStudio}
            title="Open Asset Studio (Sprites, Animations, SFX, Music)"
          >
            <Wand2 size={14} className="text-cyan-400" />
          </IconButton>
        )}
        {onOpenWizard && (
          <IconButton size="md" onClick={onOpenWizard} title="New scene from template">
            <LayoutTemplate size={14} />
          </IconButton>
        )}
        {onOpenAgent && (
          <IconButton size="md" onClick={onOpenAgent} title="Open AI Agent">
            <Sparkles size={14} />
          </IconButton>
        )}
        {onOpenTour && (
          <IconButton size="md" onClick={onOpenTour} title="Take a tour">
            <HelpCircle size={14} />
          </IconButton>
        )}
        <IconButton
          size="md"
          variant={inspectorOpen ? "active" : "ghost"}
          onClick={onToggleInspector}
          title="Toggle inspector"
        >
          <PanelRight size={14} />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onImport(file);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <div className="hidden items-center gap-1.5 pl-3 lg:flex">
        <StatusDot status={statusKind} />
        <span className="max-w-[140px] truncate text-sm tracking-[-0.01em] text-text-secondary">
          {saveState === "saving" ? "Syncing..." : saveState === "saved" ? "Saved" : status}
        </span>
        {lastSaved && saveState === "idle" && (
          <span className="text-xs text-text-muted">({formatLastSaved()})</span>
        )}
      </div>
    </header>
  );
}
