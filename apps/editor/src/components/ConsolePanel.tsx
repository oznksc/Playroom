import { Terminal, Shield, Play, Flame, CornerDownLeft, CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Input, Badge, EmptyState, cn } from "@/ui";

export type ConsoleLog = {
  type: "system" | "physics" | "script" | "warn" | "error";
  message: string;
  timestamp: Date;
};

type ConsolePanelProps = {
  logs: ConsoleLog[];
  onExecuteCommand: (command: string) => void;
  onClearLogs: () => void;
};

const logColor: Record<ConsoleLog["type"], string> = {
  system: "text-text-secondary",
  physics: "text-accent",
  script: "text-accent-purple",
  warn: "text-warning",
  error: "text-error",
};

export function ConsolePanel({ logs, onExecuteCommand, onClearLogs }: ConsolePanelProps) {
  const [inputValue, setInputValue] = useState("");
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onExecuteCommand(inputValue.trim());
    setInputValue("");
  }

  function getLogIcon(type: ConsoleLog["type"]) {
    switch (type) {
      case "system":
        return <Terminal size={12} />;
      case "physics":
        return <Shield size={12} />;
      case "script":
        return <Play size={12} />;
      case "warn":
        return <CircleAlert size={12} />;
      case "error":
        return <Flame size={12} />;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-surface">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border-default bg-bg-base px-2.5">
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <Terminal size={13} className="opacity-60" />
          <span className="font-semibold">Debugger Terminal</span>
          <Badge variant="muted">{logs.length} logs</Badge>
        </div>
        <Button size="sm" variant="secondary" onClick={onClearLogs}>
          Clear
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto p-2 font-mono text-[11px]">
          {logs.length === 0 ? (
            <EmptyState
              icon={<Terminal size={16} />}
              title="Terminal ready"
              description="Simulation ticks and slash commands appear here."
            />
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={cn("mb-1 flex gap-2 leading-relaxed", logColor[log.type])}>
                <span className="shrink-0 text-text-muted">
                  {log.timestamp.toTimeString().split(" ")[0]}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 uppercase tracking-wide">
                  {getLogIcon(log.type)}
                  <span className="text-[9px]">{log.type}</span>
                </span>
                <span className="min-w-0 break-words text-text-primary">{log.message}</span>
              </div>
            ))
          )}
          <div ref={consoleBottomRef} />
        </div>

        <aside className="hidden w-40 shrink-0 border-l border-border-default bg-bg-base p-2 text-[10px] md:block">
          <div className="mb-2 font-semibold uppercase tracking-wide text-text-muted">
            Slash commands
          </div>
          <ul className="m-0 list-none space-y-1.5 p-0 text-text-secondary">
            <li><code className="text-accent">/spawn</code> obstacle</li>
            <li><code className="text-accent">/gravity</code> [y]</li>
            <li><code className="text-accent">/speed</code> [px]</li>
            <li><code className="text-accent">/clear</code></li>
            <li><code className="text-accent">/help</code></li>
          </ul>
        </aside>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-border-default bg-bg-base px-2 py-1.5"
      >
        <span className="font-mono text-accent">&gt;</span>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type an engine command or /help…"
          className="font-mono"
        />
        <Button type="submit" size="md" variant="solid" title="Run command">
          <CornerDownLeft size={12} />
        </Button>
      </form>
    </div>
  );
}
