import { useState } from "react";
import { Clock, Check, X, ChevronDown, ChevronRight, Loader } from "lucide-react";
import type { AgentToolCall } from "../lib/agent-schemas.js";
import { Badge, cn } from "@/ui";

type AgentToolTraceProps = {
  toolCalls: AgentToolCall[];
};

export function AgentToolTrace({ toolCalls }: AgentToolTraceProps) {
  return (
    <div className="flex max-h-[40%] min-h-[80px] flex-col bg-bg-base">
      <div className="flex h-7 shrink-0 items-center justify-between px-2.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-muted">
          Tool Calls
        </span>
        <Badge variant="muted">{toolCalls.length}</Badge>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-auto p-1.5">
        {toolCalls.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-text-muted">No tool calls yet</p>
        ) : (
          toolCalls.map((tc) => <ToolCallRow key={tc.id} toolCall={tc} />)
        )}
      </div>
    </div>
  );
}

function ToolCallRow({ toolCall }: { toolCall: AgentToolCall }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    toolCall.status === "ok"
      ? "text-accent-green"
      : toolCall.status === "error"
        ? "text-error"
        : toolCall.status === "running"
          ? "text-accent"
          : "text-warning";

  return (
    <div className="overflow-hidden rounded-md border border-border-default bg-bg-surface">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-bg-hover"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={cn("shrink-0", statusColor)}>
          {toolCall.status === "running" && (
            <Loader size={12} className="animate-spin" />
          )}
          {toolCall.status === "ok" && <Check size={12} />}
          {toolCall.status === "error" && <X size={12} />}
          {toolCall.status === "needs-approval" && <Clock size={12} />}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-primary">
          {toolCall.tool}
        </span>
        {toolCall.ms !== undefined && (
          <span className="shrink-0 font-mono text-[10px] text-text-muted">{toolCall.ms}ms</span>
        )}
        <span className="shrink-0 text-text-muted">
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 bg-bg-base p-2">
          <div>
            <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
              Args
            </div>
            <pre className="max-h-28 overflow-auto rounded border border-border-default bg-bg-elevated p-1.5 font-mono text-[10px] text-text-secondary">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Result
              </div>
              <pre className="max-h-28 overflow-auto rounded border border-border-default bg-bg-elevated p-1.5 font-mono text-[10px] text-text-secondary">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
