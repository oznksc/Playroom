import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Square, Settings, X, Info } from "lucide-react";
import { AgentMessage } from "./AgentMessage.js";
import { AgentToolTrace } from "./AgentToolTrace.js";
import { useAgent } from "../hooks/useAgent.js";
import { useAgentKeys } from "../hooks/useAgentKeys.js";
import type { ApprovalMode } from "../lib/approval-mode.js";

type AgentPanelProps = {
  sceneId: string;
  isPlaying: boolean;
  onSettings?: () => void;
};

export function AgentPanel({ sceneId, isPlaying, onSettings }: AgentPanelProps) {
  const [input, setInput] = useState("");
  const { keys } = useAgentKeys();
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem("gamekit:agent:activeProvider") || "");
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem("gamekit:agent:activeModel") || "");
  const [approvalMode] = useState<ApprovalMode>("destructive-only");

  const resolvedProvider = activeProvider || (keys.length > 0 ? keys[0].provider : "anthropic");
  const activeKeyEntry = keys.find((k) => k.provider === resolvedProvider) || keys[0] || null;
  const resolvedModel = activeModel || activeKeyEntry?.model || (resolvedProvider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "claude-sonnet-4-5");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    toolCalls,
    isStreaming,
    pendingApproval,
    sendMessage,
    abort,
    approveTool,
    clear,
  } = useAgent(sceneId, resolvedModel, resolvedProvider, approvalMode);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="agent-panel">
      {/* Header */}
      <div className="agent-header">
        <div className="agent-header-left">
          <Sparkles size={14} className="agent-header-icon" />
          <span className="agent-header-title">Agent</span>
          <span className="agent-header-model">{resolvedModel}</span>
          <span className="agent-header-mode">{approvalMode}</span>
        </div>
        <div className="agent-header-right">
          <button type="button" className="agent-header-btn" title="Info">
            <Info size={13} />
          </button>
          <button type="button" className="agent-header-btn" title="Settings" onClick={onSettings}>
            <Settings size={13} />
          </button>
          <button type="button" className="agent-header-btn" title="Clear" onClick={clear}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body: Chat + Tool Trace */}
      <div className="agent-body">
        {/* Chat column */}
        <div className="agent-chat">
          <div className="agent-chat-messages">
            {messages.length === 0 ? (
              <div className="agent-chat-empty">
                <Sparkles size={32} style={{ opacity: 0.15 }} />
                <p>Ask the agent to build your scene.</p>
                <p className="agent-chat-hint">&quot;Create a platformer level with 3 platforms&quot;</p>
              </div>
            ) : (
              messages.map((msg) => <AgentMessage key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Approval modal inline */}
          {pendingApproval && (
            <div className="agent-approval">
              <div className="agent-approval-info">
                <span className="agent-approval-tool">{pendingApproval.tool}</span>
                <pre className="agent-approval-args">{JSON.stringify(pendingApproval.args, null, 2)}</pre>
              </div>
              <div className="agent-approval-actions">
                <button type="button" className="btn-deny" onClick={() => approveTool(pendingApproval.requestId, "deny")}>
                  Deny
                </button>
                <button type="button" className="btn-allow" onClick={() => approveTool(pendingApproval.requestId, "allow")}>
                  Allow
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <form className="agent-input-bar" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="agent-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what to build..."
              rows={1}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button type="button" className="agent-send-btn agent-stop-btn" onClick={abort} title="Stop">
                <Square size={14} />
              </button>
            ) : (
              <button type="submit" className="agent-send-btn" disabled={!input.trim()} title="Send">
                <Send size={14} />
              </button>
            )}
          </form>
        </div>

        {/* Tool Trace column */}
        <AgentToolTrace toolCalls={toolCalls} />
      </div>
    </div>
  );
}
