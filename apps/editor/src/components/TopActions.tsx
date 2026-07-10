import { useRef } from "react";
import {
  Plus,
  RefreshCw,
  Upload,
  LayoutTemplate,
  LogOut,
} from "lucide-react";
import { IconButton, StatusDot, cn } from "@/ui";
import type { SaveState } from "../types.js";

type TopActionsProps = {
  status: string;
  saveState: SaveState;
  lastSaved: Date | null;
  formatLastSaved: () => string;
  projectPath?: string | null;
  onRefresh: () => void;
  onImport: (file: File) => void;
  onAddEntity: () => void;
  onOpenWizard?: () => void;
  onCloseProject?: () => void;
  className?: string;
};

/**
 * Secondary editor actions — top-right floating cluster.
 * Primary nav stays in the bottom tab bar (Hierarchy / Play / Content…).
 */
export function TopActions({
  status,
  saveState,
  lastSaved,
  formatLastSaved,
  projectPath,
  onRefresh,
  onImport,
  onAddEntity,
  onOpenWizard,
  onCloseProject,
  className,
}: TopActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusKind =
    status === "Loading"
      ? "loading"
      : status.startsWith("Load") || status.includes("failed") || saveState === "error"
        ? "error"
        : saveState === "saved"
          ? "success"
          : saveState === "saving"
            ? "loading"
            : "idle";

  return (
    <div className={cn("top-actions", className)}>
      <div className="top-actions-group" role="toolbar" aria-label="Editor actions">
        <IconButton size="md" title="Refresh project" onClick={onRefresh}>
          <RefreshCw size={15} strokeWidth={1.75} />
        </IconButton>
        <IconButton
          size="md"
          title="Import asset"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} strokeWidth={1.75} />
        </IconButton>
        <IconButton size="md" title="Add entity" onClick={onAddEntity}>
          <Plus size={15} strokeWidth={1.75} />
        </IconButton>
        {onOpenWizard && (
          <IconButton size="md" title="New scene from template" onClick={onOpenWizard}>
            <LayoutTemplate size={15} strokeWidth={1.75} />
          </IconButton>
        )}
        {projectPath && onCloseProject && (
          <IconButton size="md" title="Close project" onClick={onCloseProject}>
            <LogOut size={15} strokeWidth={1.75} />
          </IconButton>
        )}
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

      <div className="top-actions-status" title={status}>
        <StatusDot status={statusKind} />
        <span className="top-actions-status-text">
          {saveState === "saving"
            ? "Syncing…"
            : saveState === "saved"
              ? "Saved"
              : status}
        </span>
        {lastSaved && saveState === "idle" && (
          <span className="top-actions-status-meta">({formatLastSaved()})</span>
        )}
      </div>
    </div>
  );
}
