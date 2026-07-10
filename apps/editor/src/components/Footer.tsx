import type { GameKitScene } from "@gamekit/schema";
import type { SaveState } from "../types.js";
import { StatusDot, Separator } from "@/ui";

type FooterProps = {
  scene?: GameKitScene;
  assetCount: number;
  status: string;
  saveState: SaveState;
  isDirty: boolean;
  statusClass: string;
};

export function Footer({
  scene,
  assetCount,
  status,
  saveState,
  isDirty,
  statusClass,
}: FooterProps) {
  const statusKind =
    statusClass === "loading"
      ? "loading"
      : statusClass === "error"
        ? "error"
        : saveState === "saved"
          ? "success"
          : "idle";

  return (
    <footer className="flex h-6 shrink-0 items-center gap-2 bg-bg-base px-3 text-xs text-text-muted">
      <span className="inline-flex items-center gap-1.5 text-text-secondary">
        <StatusDot status={statusKind} />
        {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : status}
      </span>
      {scene && (
        <>
          <Separator orientation="vertical" className="h-3" />
          <span>{scene.entities.length} entities</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{assetCount} assets</span>
        </>
      )}
      {isDirty && (
        <>
          <Separator orientation="vertical" className="h-3" />
          <span className="text-warning">Unsaved changes</span>
        </>
      )}
    </footer>
  );
}
