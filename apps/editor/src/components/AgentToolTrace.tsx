import { useState } from "react";
import { Clock, Check, X, ChevronDown, ChevronRight, Loader } from "lucide-react";
import type { AgentToolCall } from "../lib/agent-schemas.js";

type AgentToolTraceProps = {
  toolCalls: AgentToolCall[];
};

export function AgentToolTrace({ toolCalls }: AgentToolTraceProps) {
  return (
    <div className="agent-trace">
      <div className="agent-trace-header">
        <span className="agent-trace-title">Tool Calls</span>
        <span className="agent-trace-count">{toolCalls.length}</span>
      </div>
      <div className="agent-trace-list">
        {toolCalls.length === 0 ? (
          <div className="agent-trace-empty">No tool calls yet</div>
        ) : (
          toolCalls.map((tc) => <ToolCallRow key={tc.id} toolCall={tc} />)
        )}
      </div>
    </div>
  );
}

function ToolCallRow({ toolCall }: { toolCall: AgentToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`agent-trace-row agent-trace-${toolCall.status}`}>
      <button
        type="button"
        className="agent-trace-row-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="agent-trace-icon">
          {toolCall.status === "running" && <Loader size={12} className="spin" />}
          {toolCall.status === "ok" && <Check size={12} />}
          {toolCall.status === "error" && <X size={12} />}
          {toolCall.status === "needs-approval" && <Clock size={12} />}
        </span>
        <span className="agent-trace-tool">{toolCall.tool}</span>
        {toolCall.ms !== undefined && (
          <span className="agent-trace-ms">{toolCall.ms}ms</span>
        )}
        <span className="agent-trace-expand">
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
      </button>
      {expanded && (
        <div className="agent-trace-detail">
          <div className="agent-trace-section">
            <span className="agent-trace-label">Args</span>
            <pre className="agent-trace-json">{JSON.stringify(toolCall.args, null, 2)}</pre>
          </div>
          {toolCall.result !== undefined && (
            <div className="agent-trace-section">
              <span className="agent-trace-label">Result</span>
              <pre className="agent-trace-json">{JSON.stringify(toolCall.result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
