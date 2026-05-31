import type { SaveState } from "../types.js";
import {
  Check,
  ChevronRight,
  Plus,
  RefreshCw,
  Save,
  Upload
} from "lucide-react";
import { useRef } from "react";

type TopbarProps = {
  sceneName: string;
  isDirty: boolean;
  saveState: SaveState;
  status: string;
  lastSaved: Date | null;
  onRefresh: () => void;
  onImport: (file: File) => void;
  onSave: () => void;
  onAddEntity: () => void;
  formatLastSaved: () => string;
};

export function Topbar({
  sceneName,
  isDirty,
  saveState,
  status,
  lastSaved,
  onRefresh,
  onImport,
  onSave,
  onAddEntity,
  formatLastSaved
}: TopbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusClass = status === "Loading" ? "loading" : status.startsWith("Load") || status.includes("failed") || saveState === "error" ? "error" : "";

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">G</div>
        <h1>GameKit</h1>
        <ChevronRight size={14} style={{ opacity: 0.3 }} />
        <span>{sceneName}</span>
        {isDirty && <span className="dirty-indicator" title="Unsaved changes" />}
      </div>

      <div className="toolbar">
        <button type="button" title="Refresh" onClick={onRefresh}>
          <RefreshCw size={15} />
        </button>
        <div className="toolbar-divider" />
        <button type="button" title="Import asset" onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} />
        </button>
        <button type="button" title="Add entity" onClick={onAddEntity}>
          <Plus size={15} />
        </button>
        <div className="toolbar-divider" />
        <button
          type="button"
          title="Save (Ctrl+S)"
          className={saveState === "saved" ? "save-success" : saveState === "error" ? "save-error" : ""}
          onClick={onSave}
        >
          {saveState === "saved" ? <Check size={15} /> : <Save size={15} />}
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
        />
      </div>

      <div className="topbar-status">
        <span className={`status-dot ${statusClass}`} />
        {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : status}
        {lastSaved && saveState === "idle" && (
          <span className="last-saved">Saved {formatLastSaved()}</span>
        )}
      </div>
    </header>
  );
}
