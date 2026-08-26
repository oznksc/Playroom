import { useState } from "react";
import { runCli, type CliOutput } from "../lib/api";

const ACTIONS: { label: string; args: string[] }[] = [
  { label: "Init", args: ["init"] },
  { label: "Validate", args: ["validate"] },
  { label: "Doctor", args: ["doctor"] },
  { label: "Generate", args: ["generate"] },
  { label: "Build", args: ["build"] },
  { label: "Export", args: ["export"] },
];

export function ProjectPanel({ projectPath }: { projectPath: string }) {
  const [output, setOutput] = useState<CliOutput | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, args: string[]) {
    if (!projectPath) {
      setError("Select a project first.");
      return;
    }
    setError(null);
    setBusy(label);
    try {
      const result = await runCli(args, projectPath);
      setOutput(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="type-label">CLI — project commands</div>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            disabled={busy !== null}
            onClick={() => run(a.label, a.args)}
            className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-md text-text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {busy === a.label ? `${a.label}…` : a.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="type-body rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-accent-red">
          {error}
        </div>
      )}

      <div className="glass-panel flex-1 overflow-auto p-3">
        <div className="type-label mb-2">Output</div>
        {output ? (
          <pre className="type-mono whitespace-pre-wrap text-text-secondary">
            {output.lines.length ? output.lines.join("\n") : "(no output)"}
            {!output.ok && `\n\nexit code: ${output.code}`}
          </pre>
        ) : (
          <div className="type-body text-text-muted">Run a command to see output.</div>
        )}
      </div>
    </div>
  );
}
