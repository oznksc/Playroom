import { useState } from "react";
import { runCli } from "../lib/api";

export function AgentPanel({ projectPath }: { projectPath: string }) {
  const [log, setLog] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!projectPath) {
      setError("Select a project first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const out = await runCli(["audit", "--json", "--tail", "50"], projectPath);
      setLog(out.lines.join("\n"));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="type-label">Agent — tool audit log</div>
        <button
          disabled={busy}
          onClick={refresh}
          className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-md text-text-primary hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="type-body text-text-muted">
        Surfaces the <span className="type-mono text-accent">@gamekit/agent</span> audit trail
        (<span className="type-mono">gamekit audit</span>). The live agent run loop
        (<span className="type-mono">runAgent</span>) can be wired here to drive the project
        programmatically.
      </div>

      {error && (
        <div className="type-body rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-accent-red">
          {error}
        </div>
      )}

      <div className="glass-panel flex-1 overflow-auto p-3">
        {log ? (
          <pre className="type-mono whitespace-pre-wrap text-text-secondary">{log}</pre>
        ) : (
          <div className="type-body text-text-muted">No audit entries loaded yet.</div>
        )}
      </div>
    </div>
  );
}
