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
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import logoUrl from "../../../../logo.png";

const MVP_SHOW_PLAY_CONTROLS = true;

type TopbarProps = {
  sceneName: string;
  isDirty: boolean;
  saveState: SaveState;
  status: string;
  lastSaved: Date | null;
  isPlaying: boolean;
  isPaused: boolean;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  onPlayToggle: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onImport: (file: File) => void;
  onSave: () => void;
  onAddEntity: () => void;
  onToggleSidebar: () => void;
  onToggleInspector: () => void;
  onOpenAgent?: () => void;
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
  sidebarOpen,
  inspectorOpen,
  onPlayToggle,
  onPauseToggle,
  onStop,
  onRefresh,
  onImport,
  onSave,
  onAddEntity,
  onToggleSidebar,
  onToggleInspector,
  onOpenAgent,
  formatLastSaved,
  projectPath,
  onCloseProject,
}: TopbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusClass = status === "Loading" ? "loading" : status.startsWith("Load") || status.includes("failed") || saveState === "error" ? "error" : "";

  // Simulated live telemetry stats
  const [fps, setFps] = useState(60);
  const [tickMs, setTickMs] = useState(16.6);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      // Small randomized variations to feel alive
      setFps(Math.round(59.2 + Math.random() * 1.5));
      setTickMs(Math.round((16.2 + Math.random() * 0.8) * 10) / 10);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <header className="topbar">
      {/* Brand logo & active scene */}
      <div className="topbar-brand">
        <img className="topbar-logo" src={logoUrl} alt="Playroom" />
        <div className="brand-titles">
          <h1>Playroom</h1>
          <span className="brand-tag">MVP EDITOR</span>
        </div>
        <ChevronRight size={12} className="brand-arrow" />
        <span className="scene-name-label">{sceneName}</span>
        {isDirty && <span className="dirty-indicator" title="Unsaved changes pending auto-save" />}
        {projectPath && onCloseProject && (
          <button
            type="button"
            className="btn-close-project"
            onClick={onCloseProject}
            title="Close project folder and return to dashboard"
          >
            Close Project
          </button>
        )}
      </div>

      {/* Center Panel: Simulation Ticker State Controls */}
      {MVP_SHOW_PLAY_CONTROLS && (
        <div className="engine-simulation-controls">
          <button
            type="button"
            className={`sim-btn sim-play ${isPlaying && !isPaused ? "active pulsing" : ""}`}
            onClick={onPlayToggle}
            title="Run Simulation (Play Game)"
          >
            <Play size={13} fill={isPlaying && !isPaused ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className={`sim-btn sim-pause ${isPaused ? "active" : ""}`}
            onClick={onPauseToggle}
            disabled={!isPlaying}
            title="Pause Active Simulation"
          >
            <Pause size={13} fill={isPaused ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="sim-btn sim-stop"
            onClick={onStop}
            disabled={!isPlaying}
            title="Stop Simulation & Reset Entities"
          >
            <Square size={13} fill="none" />
          </button>

          {isPlaying && (
            <div className="engine-telemetry">
              <Cpu size={12} className="telemetry-icon" />
              <span className="telemetry-stat">FPS: <strong className="glow-green-txt">{fps}</strong></span>
              <span className="telemetry-divider" />
              <span className="telemetry-stat">Latency: <strong>{tickMs}ms</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Editor Tool Actions */}
      <div className="toolbar">
        <button type="button" className={`panel-toggle-btn${sidebarOpen ? " active" : ""}`} onClick={onToggleSidebar} title="Toggle sidebar panel">
          <PanelLeft size={14} />
        </button>
        <div className="toolbar-divider" />
        <button type="button" className="toolbar-action-btn" title="Refresh local state" onClick={onRefresh}>
          <RefreshCw size={14} />
        </button>
        <div className="toolbar-divider" />
        <button type="button" className="toolbar-action-btn" title="Import Asset (PNG/JPG)" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} />
        </button>
        <button type="button" className="toolbar-action-btn" title="Create standard entity" onClick={onAddEntity}>
          <Plus size={14} />
        </button>
        <div className="toolbar-divider" />
        <button
          type="button"
          title="Save Layout (Ctrl+S)"
          className={`toolbar-action-btn btn-save ${saveState === "saved" ? "save-success" : saveState === "error" ? "save-error" : ""}`}
          onClick={onSave}
        >
          {saveState === "saved" ? <Check size={14} /> : <Save size={14} />}
        </button>
        <div className="toolbar-divider" />
        <div className="toolbar-divider" />
        {onOpenAgent && (
          <>
            <div className="toolbar-divider" />
            <button type="button" className="toolbar-action-btn" title="Open AI Agent panel" onClick={onOpenAgent}>
              <Sparkles size={14} />
            </button>
          </>
        )}
        <button type="button" className={`panel-toggle-btn${inspectorOpen ? " active" : ""}`} onClick={onToggleInspector} title="Toggle inspector panel">
          <PanelRight size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              onImport(file);
            }
            event.currentTarget.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>

      {/* Rightmost: System connection status */}
      <div className="topbar-status">
        <span className={`status-dot ${statusClass}`} />
        <span className="status-message">
          {saveState === "saving" ? "Syncing..." : saveState === "saved" ? "Saved" : status}
        </span>
        {lastSaved && saveState === "idle" && (
          <span className="last-saved-time">({formatLastSaved()})</span>
        )}
      </div>
    </header>
  );
}
