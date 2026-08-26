import { useState } from "react";
import { startEditorServer, stopEditorServer } from "../lib/api";

export function EditorPanel({ projectPath }: { projectPath: string }) {
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!projectPath) {
      setError("Select a project first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await startEditorServer(projectPath);
      setRunning(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await stopEditorServer();
      setRunning(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="type-label">Editor — embedded in hub</div>
        {!running ? (
          <button
            disabled={busy}
            onClick={start}
            className="rounded-md border border-accent bg-accent-muted px-3 py-1.5 text-md text-accent hover:bg-accent hover:text-bg-base disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start editor"}
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={stop}
            className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-md text-text-primary hover:border-accent-red hover:text-accent-red disabled:opacity-50"
          >
            {busy ? "Stopping…" : "Stop editor"}
          </button>
        )}
        {running && (
          <span className="type-mono text-accent-green">● http://127.0.0.1:4177</span>
        )}
      </div>

      {error && (
        <div className="type-body rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-accent-red">
          {error}
        </div>
      )}

      <div className="glass-panel flex-1 overflow-hidden">
        {running ? (
          <iframe
            title="GameKit Editor"
            src="http://127.0.0.1:4177"
            className="h-full w-full border-0 bg-bg-base"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="type-body text-text-muted">
              Start the editor to embed the built editor dist inside the studio.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
