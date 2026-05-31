import type { GameKitScene } from "@gamekit/schema";
import type { SaveState } from "../types.js";

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
  statusClass
}: FooterProps) {
  return (
    <footer>
      <span className="status-indicator">
        <span className={`status-dot ${statusClass}`} />
        {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : status}
      </span>
      {scene && (
        <>
          <span style={{ color: "var(--border-default)" }}>|</span>
          <span>{scene.entities.length} entities</span>
          <span style={{ color: "var(--border-default)" }}>|</span>
          <span>{assetCount} assets</span>
        </>
      )}
      {isDirty && (
        <>
          <span style={{ color: "var(--border-default)" }}>|</span>
          <span style={{ color: "var(--warning)" }}>Unsaved changes</span>
        </>
      )}
    </footer>
  );
}
