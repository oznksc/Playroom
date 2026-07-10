import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Square, Settings, X } from "lucide-react";
import { AgentMessage } from "./AgentMessage.js";
import { AgentToolTrace } from "./AgentToolTrace.js";
import { useAgent } from "../hooks/useAgent.js";
import { useAgentKeys } from "../hooks/useAgentKeys.js";
import type { ApprovalMode } from "../lib/approval-mode.js";
import { getApiUrl } from "../lib/api.js";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic Claude",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  google: "Google AI",
  ollama: "Ollama (local)",
  lmstudio: "LM Studio (local)",
};

type AgentPanelProps = {
  sceneId: string;
  isPlaying: boolean;
  onSettings?: () => void;
  onSceneMutated?: () => void;
};

export function AgentPanel({ sceneId, isPlaying, onSettings, onSceneMutated }: AgentPanelProps) {
  const [input, setInput] = useState("");
  const { keys } = useAgentKeys();
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem("gamekit:agent:activeProvider") || "");
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem("gamekit:agent:activeModel") || "");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(() => (localStorage.getItem("gamekit:agent:approvalMode") as ApprovalMode) || "destructive-only");
  const [planMode, setPlanMode] = useState(() => localStorage.getItem("gamekit:agent:planMode") === "1");

  const resolvedProvider = activeProvider || (keys.length > 0 ? keys[0].provider : "anthropic");
  const activeKeyEntry = keys.find((k) => k.provider === resolvedProvider) || keys[0] || null;
  const resolvedModel = activeModel || activeKeyEntry?.model || (resolvedProvider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "claude-sonnet-4-5");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [modelsList, setModelsList] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    async function fetchModels() {
      try {
        const res = await fetch(getApiUrl(`/api/agent/models/${resolvedProvider}`));
        if (!res.ok) return;
        const data = await res.json() as { models?: string[] };
        if (active && data.models) {
          setModelsList(data.models);
          if (data.models.length > 0 && !data.models.includes(resolvedModel)) {
            setActiveModel(data.models[0]);
            localStorage.setItem("gamekit:agent:activeModel", data.models[0]);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchModels();
    return () => {
      active = false;
    };
  }, [resolvedProvider, resolvedModel]);

  const {
    messages,
    toolCalls,
    isStreaming,
    pendingApproval,
    sessionSnapshotId,
    sendMessage,
    abort,
    approveTool,
    clear,
    restoreSessionSnapshot,
  } = useAgent(sceneId, resolvedModel, resolvedProvider, approvalMode, onSceneMutated, planMode);

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
          <select
            className="agent-provider-select"
            value={resolvedProvider}
            onChange={(e) => {
              const newProvider = e.target.value;
              setActiveProvider(newProvider);
              localStorage.setItem("gamekit:agent:activeProvider", newProvider);
              const entry = keys.find(k => k.provider === newProvider);
              const defaultModel = newProvider === "openrouter"
                ? "meta-llama/llama-3.3-70b-instruct"
                : newProvider === "lmstudio"
                ? "local-model"
                : "claude-sonnet-4-5";
              const newModel = entry?.model || defaultModel;
              setActiveModel(newModel);
              localStorage.setItem("gamekit:agent:activeModel", newModel);
            }}
          >
            {keys.map((k) => (
              <option key={k.provider} value={k.provider}>
                {PROVIDER_LABELS[k.provider] || k.provider}
              </option>
            ))}
            {keys.length === 0 && (
              <option value="anthropic">Anthropic Claude</option>
            )}
          </select>
          {modelsList.length > 0 ? (
            <select
              className="agent-model-select"
              value={resolvedModel}
              onChange={(e) => {
                const newModel = e.target.value;
                setActiveModel(newModel);
                localStorage.setItem("gamekit:agent:activeModel", newModel);
              }}
            >
              {modelsList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <span className="agent-header-model">{resolvedModel}</span>
          )}
          <select
            className="agent-mode-select"
            value={approvalMode}
            onChange={(e) => {
              const newMode = e.target.value as ApprovalMode;
              setApprovalMode(newMode);
              localStorage.setItem("gamekit:agent:approvalMode", newMode);
            }}
            title="Tool approval mode"
          >
            <option value="destructive-only">Destructive Only</option>
            <option value="always">Always Approve</option>
            <option value="plan">Plan + Approve</option>
            <option value="off">Off (Auto Approve)</option>
          </select>
          <label className="agent-plan-toggle" title="Ask for a plan before tools">
            <input
              type="checkbox"
              checked={planMode}
              onChange={(e) => {
                setPlanMode(e.target.checked);
                localStorage.setItem("gamekit:agent:planMode", e.target.checked ? "1" : "0");
              }}
            />
            Plan first
          </label>
        </div>
        <div className="agent-header-right">
          {sessionSnapshotId && (
            <button
              type="button"
              className="agent-header-btn agent-restore-btn"
              title={`Restore session snapshot ${sessionSnapshotId}`}
              onClick={() => restoreSessionSnapshot()}
              disabled={isStreaming}
            >
              Undo session
            </button>
          )}
          <button type="button" className="agent-header-btn" title="Settings" onClick={onSettings}>
            <Settings size={13} />
          </button>
          <button type="button" className="agent-header-btn" title="Clear" onClick={clear}>
            <X size={13} />
          </button>
        </div>
      </div>
      {isPlaying && (
        <div className="agent-play-banner">Simulation running — agent edits apply after stop/refresh.</div>
      )}

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
                <span className="agent-approval-label">Approval required</span>
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

          {!isStreaming && messages.some((m) => m.role === "agent") && (
            <div className="agent-quick-actions">
              <button type="button" className="agent-quick-btn" onClick={() => sendMessage("/execute")}>
                Execute plan
              </button>
              <button type="button" className="agent-quick-btn" onClick={() => sendMessage("/screenshot Review this scene")}>
                Screenshot
              </button>
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
              placeholder={planMode ? "Describe goal (plan first)..." : "Describe what to build..."}
              rows={1}
              disabled={isStreaming || !!pendingApproval}
            />
            {isStreaming ? (
              <button type="button" className="agent-send-btn agent-stop-btn" onClick={abort} title="Stop">
                <Square size={14} />
              </button>
            ) : (
              <button type="submit" className="agent-send-btn" disabled={!input.trim() || !!pendingApproval} title="Send">
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
