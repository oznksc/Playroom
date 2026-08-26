import { useEffect, useRef, useState } from "react";
import { startMcp, stopMcp } from "../lib/api";

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
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(argsText || "{}");
    } catch (e) {
      setError("Invalid JSON arguments: " + String(e));
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
    }
  }

  return (
    <div className="flex h-full gap-3 p-4">
      <div className="flex w-72 flex-col gap-2">
        <div className="type-label">MCP tools {port ? `(:${port})` : ""}</div>
        <div className="glass-panel flex-1 overflow-auto p-2">
          {tools.length === 0 && (
            <div className="type-body p-2 text-text-muted">
              {projectPath ? "Loading tools…" : "Select a project to start the MCP server."}
            </div>
          )}
          {tools.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setSelected(t);
                setResult("");
                setArgsText("{}");
              }}
              className={`mb-1 block w-full rounded-md border px-2 py-1.5 text-left text-md transition-colors ${
                selected?.name === t.name
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-border-default bg-bg-elevated text-text-primary hover:border-accent"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {error && (
          <div className="type-body rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-accent-red">
            {error}
          </div>
        )}
        {selected ? (
          <>
            <div className="glass-panel p-3">
              <div className="type-label mb-1">Tool</div>
              <div className="type-ui text-accent">{selected.name}</div>
              {selected.description && (
                <div className="type-body mt-1">{selected.description}</div>
              )}
            </div>
            <div className="glass-panel flex flex-1 flex-col p-3">
              <div className="type-label mb-1">Arguments (JSON)</div>
              <textarea
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                spellCheck={false}
                className="type-mono h-28 flex-1 resize-none rounded-md border border-border-default bg-bg-base p-2 text-text-primary focus-ring"
              />
              <button
                onClick={callTool}
                className="mt-2 self-start rounded-md border border-accent bg-accent-muted px-3 py-1.5 text-md text-accent hover:bg-accent hover:text-bg-base"
              >
                Call tool
              </button>
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
            <div className="type-body text-text-muted">
              Select a tool on the left to inspect its schema and invoke it live.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
