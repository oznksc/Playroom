import { useState } from "react";
import { startEditorServer, stopEditorServer } from "../lib/api.js";
import { Button, ErrorState, EmptyState } from "@gamekit/ui";
import { Play, Square } from "lucide-react";

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
          <Button
            size="sm"
            variant="solid"
            loading={busy}
            disabled={busy}
            onClick={start}
            leftIcon={<Play size={12} />}
          >
            Start editor
          </Button>
        ) : (
          <Button
            size="sm"
            variant="danger"
            loading={busy}
            disabled={busy}
            onClick={stop}
            leftIcon={<Square size={12} />}
          >
            Stop editor
          </Button>
        )}
        {running && (
          <span className="type-mono text-accent-green flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-accent-green animate-pulse" />
            http://127.0.0.1:4177
          </span>
        )}
      </div>

      {error && <ErrorState compact message={error} />}

      <div className="glass-panel flex-1 overflow-hidden">
        {running ? (
          <iframe
            title="GameKit Editor"
            src="http://127.0.0.1:4177"
            className="h-full w-full border-0 bg-bg-base"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="Editor Server Idle"
              description="Start the editor server to embed the built editor distribution inside GameKit Studio."
            />
          </div>
        )}
      </div>
    </div>
  );
}
