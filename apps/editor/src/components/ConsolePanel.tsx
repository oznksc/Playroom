import { Terminal, Shield, Play, Flame, CornerDownLeft, CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

export function ConsolePanel({
  logs,
  onExecuteCommand,
  onClearLogs
}: ConsolePanelProps) {
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
        return <Terminal size={12} className="log-icon-sys" />;
      case "physics":
        return <Shield size={12} className="log-icon-phys" />;
      case "script":
        return <Play size={12} className="log-icon-script" />;
      case "warn":
        return <CircleAlert size={12} className="log-icon-warn" />;
      case "error":
        return <Flame size={12} className="log-icon-err" />;
    }
  }

  return (
    <div className="console-panel">
      <div className="console-header-bar">
        <div className="console-stats">
          <Terminal size={13} style={{ opacity: 0.6 }} />
          <span>Debugger Terminal</span>
          <span className="badge-count">{logs.length} logs</span>
        </div>
        <div className="console-actions">
          <button type="button" className="btn-secondary btn-xs" onClick={onClearLogs}>
            Clear
          </button>
        </div>
      </div>

      <div className="console-body">
        <div className="console-logs-list">
          {logs.length === 0 ? (
            <div className="console-empty">
              <Terminal size={24} style={{ opacity: 0.15 }} />
              <p>Terminal initialized. Ready for simulation ticks.</p>
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`console-log-row log-${log.type}`}>
                <span className="log-time">
                  {log.timestamp.toTimeString().split(" ")[0]}
                </span>
                <span className="log-badge-wrapper">
                  {getLogIcon(log.type)}
                  <span className="log-type-tag">{log.type.toUpperCase()}</span>
                </span>
                <span className="log-msg">{log.message}</span>
              </div>
            ))
          )}
          <div ref={consoleBottomRef} />
        </div>

        <div className="console-shortcuts-sidebar">
          <span className="sidebar-title">Slash Commands</span>
          <ul>
            <li><code>/spawn</code> <span>Spawn obstacle</span></li>
            <li><code>/gravity [y]</code> <span>Set gravity</span></li>
            <li><code>/speed [px]</code> <span>Set player speed</span></li>
            <li><code>/clear</code> <span>Clear terminal</span></li>
            <li><code>/help</code> <span>View instructions</span></li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="console-input-bar">
        <span className="prompt-symbol">&gt;</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type an engine command or '/help'..."
        />
        <button type="submit" className="console-submit-btn" title="Run command">
          <CornerDownLeft size={12} />
        </button>
      </form>
    </div>
  );
}
