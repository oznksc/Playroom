import { useRef } from "react";
import {
  Layers,
  SlidersHorizontal,
  Play,
  Pause,
  Square,
  Folder,
  Sparkles,
  Save,
  Check,
  RefreshCw,
  Upload,
  Plus,
  LayoutTemplate,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/ui";
import type { SaveState } from "../types.js";

export type TabBarDestination = "hierarchy" | "inspector" | "content" | "agent";

type AppTabBarProps = {
  active: TabBarDestination | null;
  isPlaying: boolean;
  isPaused: boolean;
  saveState: SaveState;
  playFps?: number;
  projectPath?: string | null;
  onHierarchy: () => void;
  onInspector: () => void;
  onContent: () => void;
  onAgent: () => void;
  onPlayToggle: () => void;
  onStop: () => void;
  onSave: () => void;
  onRefresh: () => void;
  onImport: (file: File) => void;
  onAddEntity: () => void;
  onOpenWizard?: () => void;
  onSettings: () => void;
  onCloseProject?: () => void;
};

/**
 * Single chrome surface: every editor action lives here (Apple-style dock).
 */
export function AppTabBar({
  active,
  isPlaying,
  isPaused,
  saveState,
  playFps = 0,
  projectPath,
  onHierarchy,
  onInspector,
  onContent,
  onAgent,
  onPlayToggle,
  onStop,
  onSave,
  onRefresh,
  onImport,
  onAddEntity,
  onOpenWizard,
  onSettings,
  onCloseProject,
}: AppTabBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playingLive = isPlaying && !isPaused;

  return (
    <nav className="app-tabbar" aria-label="Editor">
      <div className="app-tabbar-scroll">
        <TabItem
          label="Hierarchy"
          active={active === "hierarchy"}
          onClick={onHierarchy}
          icon={<Layers size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Inspector"
          active={active === "inspector"}
          onClick={onInspector}
          icon={<SlidersHorizontal size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Content"
          active={active === "content"}
          onClick={onContent}
          icon={<Folder size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Agent"
          active={active === "agent"}
          onClick={onAgent}
          icon={<Sparkles size={18} strokeWidth={1.75} />}
        />

        <span className="app-tabbar-sep" aria-hidden />

        <TabItem
          label="Refresh"
          active={false}
          onClick={onRefresh}
          icon={<RefreshCw size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Import"
          active={false}
          onClick={() => fileInputRef.current?.click()}
          icon={<Upload size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Add"
          active={false}
          onClick={onAddEntity}
          icon={<Plus size={18} strokeWidth={1.75} />}
        />
        {onOpenWizard && (
          <TabItem
            label="Template"
            active={false}
            onClick={onOpenWizard}
            icon={<LayoutTemplate size={18} strokeWidth={1.75} />}
          />
        )}

        <span className="app-tabbar-sep" aria-hidden />

        <div className="app-tabbar-center">
          <button
            type="button"
            className={cn("app-tabbar-play", playingLive && "live", isPaused && "paused")}
            title={playingLive ? "Pause" : isPlaying ? "Resume" : "Play"}
            aria-label={playingLive ? "Pause" : "Play"}
            onClick={onPlayToggle}
          >
            {playingLive ? (
              <Pause size={22} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={22} fill="currentColor" strokeWidth={0} className="translate-x-px" />
            )}
          </button>
          {isPlaying && (
            <button
              type="button"
              className="app-tabbar-stop"
              title="Stop"
              aria-label="Stop simulation"
              onClick={onStop}
            >
              <Square size={11} fill="currentColor" strokeWidth={0} />
            </button>
          )}
          {playingLive && playFps > 0 && (
            <span className="app-tabbar-fps" aria-hidden>
              {playFps}
            </span>
          )}
        </div>

        <span className="app-tabbar-sep" aria-hidden />

        <TabItem
          label="Save"
          active={saveState === "saved"}
          onClick={onSave}
          icon={
            saveState === "saved" ? (
              <Check size={18} strokeWidth={2} />
            ) : (
              <Save size={18} strokeWidth={1.75} />
            )
          }
          tone={saveState === "error" ? "error" : saveState === "saved" ? "success" : undefined}
        />
        <TabItem
          label="Settings"
          active={false}
          onClick={onSettings}
          icon={<Settings size={18} strokeWidth={1.75} />}
        />
        {projectPath && onCloseProject && (
          <TabItem
            label="Close"
            active={false}
            onClick={onCloseProject}
            icon={<LogOut size={18} strokeWidth={1.75} />}
          />
        )}
      </div>

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
    </nav>
  );
}

function TabItem({
  label,
  icon,
  active,
  onClick,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "error";
}) {
  return (
    <button
      type="button"
      className={cn(
        "app-tabbar-item",
        active && "active",
        tone === "success" && "tone-success",
        tone === "error" && "tone-error"
      )}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <span className="app-tabbar-icon">{icon}</span>
      <span className="app-tabbar-label">{label}</span>
    </button>
  );
}
