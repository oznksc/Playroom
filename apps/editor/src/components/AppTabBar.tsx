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
  onHierarchy: () => void;
  onInspector: () => void;
  onContent: () => void;
  onAgent: () => void;
  onPlayToggle: () => void;
  onStop: () => void;
  onSave: () => void;
};

/**
 * Apple-style floating tab bar: destinations + center play control.
 * Primary chrome for canvas-first editor (no top header).
 */
export function AppTabBar({
  active,
  isPlaying,
  isPaused,
  saveState,
  playFps = 0,
  onHierarchy,
  onInspector,
  onContent,
  onAgent,
  onPlayToggle,
  onStop,
  onSave,
}: AppTabBarProps) {
  const playingLive = isPlaying && !isPaused;

  return (
    <nav className="app-tabbar" aria-label="Editor">
      <TabItem
        label="Hierarchy"
        active={active === "hierarchy"}
        onClick={onHierarchy}
        icon={<Layers size={20} strokeWidth={1.75} />}
      />
      <TabItem
        label="Inspector"
        active={active === "inspector"}
        onClick={onInspector}
        icon={<SlidersHorizontal size={20} strokeWidth={1.75} />}
      />

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

      <TabItem
        label="Content"
        active={active === "content"}
        onClick={onContent}
        icon={<Folder size={20} strokeWidth={1.75} />}
      />
      <TabItem
        label="Agent"
        active={active === "agent"}
        onClick={onAgent}
        icon={<Sparkles size={20} strokeWidth={1.75} />}
      />

      <button
        type="button"
        className={cn(
          "app-tabbar-save",
          saveState === "saved" && "saved",
          saveState === "error" && "error"
        )}
        title="Save"
        aria-label="Save"
        onClick={onSave}
      >
        {saveState === "saved" ? <Check size={16} strokeWidth={2} /> : <Save size={16} strokeWidth={1.75} />}
      </button>
    </nav>
  );
}

function TabItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("app-tabbar-item", active && "active")}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <span className="app-tabbar-icon">{icon}</span>
      <span className="app-tabbar-label">{label}</span>
    </button>
  );
}
