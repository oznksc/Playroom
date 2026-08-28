import { useState } from "react";
import { runCli, type CliOutput } from "../lib/api.js";
import { Button, ErrorState, EmptyState } from "@gamekit/ui";
import { CheckCircle2, Stethoscope, Sparkles, Hammer, Download } from "lucide-react";

const ACTIONS: { label: string; args: string[]; icon: React.ReactNode }[] = [
  { label: "Init", args: ["init"], icon: <Sparkles size={12} /> },
  { label: "Validate", args: ["validate"], icon: <CheckCircle2 size={12} /> },
  { label: "Doctor", args: ["doctor"], icon: <Stethoscope size={12} /> },
  { label: "Generate", args: ["generate"], icon: <Sparkles size={12} /> },
  { label: "Build", args: ["build"], icon: <Hammer size={12} /> },
  { label: "Export", args: ["export"], icon: <Download size={12} /> },
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
          <Button
            key={a.label}
            size="sm"
            variant="secondary"
            loading={busy === a.label}
            disabled={busy !== null}
            onClick={() => run(a.label, a.args)}
            leftIcon={a.icon}
          >
            {a.label}
          </Button>
        ))}
      </div>

      {error && <ErrorState compact message={error} />}

      <div className="glass-panel flex-1 overflow-auto p-3">
        <div className="type-label mb-2">Output</div>
        {output ? (
          <pre className="type-mono whitespace-pre-wrap text-text-secondary">
            {output.lines.length ? output.lines.join("\n") : "(no output)"}
            {!output.ok && `\n\nexit code: ${output.code}`}
          </pre>
        ) : (
          <EmptyState title="No Output" description="Run a command above to see live CLI output." />
        )}
      </div>
    </div>
  );
}
