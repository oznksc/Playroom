import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Square, Settings, X } from "lucide-react";
import { AgentMessage } from "./AgentMessage.js";
import { AgentToolTrace } from "./AgentToolTrace.js";
import { useAgent } from "../hooks/useAgent.js";
import { useAgentKeys } from "../hooks/useAgentKeys.js";
import type { ApprovalMode } from "../lib/approval-mode.js";
import { getApiUrl } from "../lib/api.js";
import {
  IconButton,
  Button,
  Select,
  Textarea,
  EmptyState,
  CheckboxField,
  Panel,
  PanelHeader,
  PanelTitle,
} from "@/ui";

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
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <PanelHeader className="h-auto min-h-[38px] flex-wrap gap-2 py-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <PanelTitle className="mr-1">
            <Sparkles size={12} className="text-accent-purple" /> Agent
          </PanelTitle>
          <Select
            className="h-[24px] w-auto min-w-[110px] max-w-[140px] text-[10px]"
            value={resolvedProvider}
            onChange={(e) => {
              const newProvider = e.target.value;
              setActiveProvider(newProvider);
              localStorage.setItem("gamekit:agent:activeProvider", newProvider);
              const entry = keys.find((k) => k.provider === newProvider);
              const defaultModel =
                newProvider === "openrouter"
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
            {keys.length === 0 && <option value="anthropic">Anthropic Claude</option>}
          </Select>
          {modelsList.length > 0 ? (
            <Select
              className="h-[24px] w-auto min-w-[100px] max-w-[160px] text-[10px]"
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
            </Select>
          ) : (
            <span className="max-w-[120px] truncate font-mono text-[10px] text-text-muted">
              {resolvedModel}
            </span>
          )}
          <Select
            className="h-[24px] w-auto max-w-[130px] text-[10px]"
            value={approvalMode}
            title="Tool approval mode"
            onChange={(e) => {
              const newMode = e.target.value as ApprovalMode;
              setApprovalMode(newMode);
              localStorage.setItem("gamekit:agent:approvalMode", newMode);
            }}
          >
            <option value="destructive-only">Destructive Only</option>
            <option value="always">Always Approve</option>
            <option value="plan">Plan + Approve</option>
            <option value="off">Off (Auto Approve)</option>
          </Select>
          <CheckboxField
            label="Plan first"
            checked={planMode}
            className="text-[10px]"
            onChange={(checked) => {
              setPlanMode(checked);
              localStorage.setItem("gamekit:agent:planMode", checked ? "1" : "0");
            }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {sessionSnapshotId && (
            <Button
              size="sm"
              variant="secondary"
              disabled={isStreaming}
              title={`Restore session snapshot ${sessionSnapshotId}`}
              onClick={() => restoreSessionSnapshot()}
            >
              Undo session
            </Button>
          )}
          <IconButton size="sm" title="Settings" onClick={onSettings}>
            <Settings size={13} />
          </IconButton>
          <IconButton size="sm" title="Clear" onClick={clear}>
            <X size={13} />
          </IconButton>
        </div>
      </PanelHeader>

      {isPlaying && (
        <div className="bg-warning/10 px-2.5 py-1 text-[10px] text-warning">
          Simulation running — agent edits apply after stop/refresh.
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {messages.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={16} />}
                title="Ask the agent to build your scene"
                description={'"Create a platformer level with 3 platforms"'}
              />
            ) : (
              messages.map((msg) => <AgentMessage key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {pendingApproval && (
            <div className="bg-bg-elevated p-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
                Approval required
              </div>
              <div className="mb-1 font-mono text-[11px] text-accent">{pendingApproval.tool}</div>
              <pre className="mb-2 max-h-24 overflow-auto rounded-[10px] border border-white/[0.06] bg-black/30 p-1.5 font-mono text-[10px] text-text-secondary">
                {JSON.stringify(pendingApproval.args, null, 2)}
              </pre>
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => approveTool(pendingApproval.requestId, "deny")}
                >
                  Deny
                </Button>
                <Button
                  size="sm"
                  variant="play"
                  onClick={() => approveTool(pendingApproval.requestId, "allow")}
                >
                  Allow
                </Button>
              </div>
            </div>
          )}

          {!isStreaming && messages.some((m) => m.role === "agent") && (
            <div className="flex gap-1 px-2 py-1.5">
              <Button size="sm" variant="secondary" onClick={() => sendMessage("/execute")}>
                Execute plan
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => sendMessage("/screenshot Review this scene")}
              >
                Screenshot
              </Button>
            </div>
          )}

          <form
            className="flex items-end gap-1.5 border-t border-white/[0.06] p-2"
            onSubmit={handleSubmit}
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={planMode ? "Describe goal (plan first)…" : "Describe what to build…"}
              rows={1}
              disabled={isStreaming || !!pendingApproval}
              className="min-h-[32px] max-h-24 resize-none py-1.5"
            />
            {isStreaming ? (
              <IconButton size="lg" variant="danger" onClick={abort} title="Stop">
                <Square size={14} />
              </IconButton>
            ) : (
              <IconButton
                size="lg"
                variant="accent"
                type="submit"
                disabled={!input.trim() || !!pendingApproval}
                title="Send"
              >
                <Send size={14} />
              </IconButton>
            )}
          </form>
        </div>

        <AgentToolTrace toolCalls={toolCalls} />
      </div>
    </Panel>
  );
}
