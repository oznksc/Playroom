import { useEffect, useRef, useState } from "react";
import { startMcp, stopMcp } from "../lib/api.js";
import { Button, Textarea, ErrorState, EmptyState } from "@gamekit/ui";
import { Play, Wrench } from "lucide-react";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export function McpPanel({ projectPath }: { projectPath: string }) {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [port, setPort] = useState<number | null>(null);
  const [selected, setSelected] = useState<McpTool | null>(null);
  const [argsText, setArgsText] = useState("{}");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function boot() {
      if (!projectPath) return;
      setError(null);
      setTools([]);
      setSelected(null);
      setResult("");
      try {
        const p = await startMcp(projectPath);
        if (!active) return;
        startedRef.current = true;
        setPort(p);
        const res = await fetch(`http://127.0.0.1:${p}/tools`);
        const data = await res.json();
        if (!active) return;
        setTools((data.tools as McpTool[]) ?? []);
      } catch (e) {
        if (active) setError(String(e));
      }
    }
    void boot();
    return () => {
      active = false;
      if (startedRef.current) {
        startedRef.current = false;
        void stopMcp();
      }
    };
  }, [projectPath]);

  async function callTool() {
    if (!selected || !port) return;
    setError(null);
    setBusy(true);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(argsText || "{}");
    } catch (e) {
      setError("Invalid JSON arguments: " + String(e));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/tools/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected.name, arguments: parsed }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full gap-3 p-4">
      <div className="flex w-72 flex-col gap-2">
        <div className="type-label">MCP tools {port ? `(:${port})` : ""}</div>
        <div className="glass-panel flex-1 overflow-auto p-2">
          {tools.length === 0 && (
            <EmptyState
              description={
                projectPath ? "Loading tools…" : "Select a project to start the MCP server."
              }
            />
          )}
          {tools.map((t) => (
            <Button
              key={t.name}
              variant={selected?.name === t.name ? "solid" : "secondary"}
              size="sm"
              fullWidth
              onClick={() => {
                setSelected(t);
                setResult("");
                setArgsText("{}");
              }}
              leftIcon={<Wrench size={12} />}
              className="mb-1 justify-start font-mono text-xs"
            >
              {t.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {error && <ErrorState compact message={error} />}
        {selected ? (
          <>
            <div className="glass-panel p-3">
              <div className="type-label mb-1">Tool</div>
              <div className="type-ui text-accent">{selected.name}</div>
              {selected.description && <div className="type-body mt-1">{selected.description}</div>}
            </div>
            <div className="glass-panel flex flex-1 flex-col p-3">
              <div className="type-label mb-1">Arguments (JSON)</div>
              <Textarea
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                spellCheck={false}
                className="font-mono text-xs h-28 flex-1 resize-none"
              />
              <Button
                variant="solid"
                size="sm"
                loading={busy}
                onClick={callTool}
                leftIcon={<Play size={12} />}
                className="mt-2 self-start"
              >
                Call tool
              </Button>
            </div>
            <div className="glass-panel flex-1 overflow-auto p-3">
              <div className="type-label mb-1">Result</div>
              <pre className="type-mono whitespace-pre-wrap text-text-secondary">
                {result || "(no result)"}
              </pre>
            </div>
          </>
        ) : (
          <div className="glass-panel flex-1 p-3">
            <EmptyState
              title="Select a Tool"
              description="Select a tool on the left to inspect its schema and invoke it live."
            />
          </div>
        )}
      </div>
    </div>
  );
}
