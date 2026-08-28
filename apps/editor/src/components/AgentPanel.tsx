import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Square, Settings, X, Maximize2, Minimize2 } from "lucide-react";
import { AgentMessage } from "./AgentMessage.js";
import { AgentToolTrace } from "./AgentToolTrace.js";
import { useAgent } from "../hooks/useAgent.js";
import { useAgentKeys } from "../hooks/useAgentKeys.js";
import type { ApprovalMode } from "../lib/approval-mode.js";
import { getApiUrl } from "../lib/api.js";
import {
  IconButton,
  Button,
  Textarea,
  EmptyState,
  Badge,
  Panel,
  PanelHeader,
  PanelTitle,
} from "@/ui";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic Claude",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  xai: "xAI Grok",
  google: "Google AI",
  ollama: "Ollama (local)",
  lmstudio: "LM Studio (local)",
};

type AgentPanelProps = {
  sceneId: string;
  isPlaying: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onSettings?: () => void;
  onSceneMutated?: () => void;
};

export function AgentPanel({
  sceneId,
  isPlaying,
  expanded,
  onToggleExpand,
  onSettings,
  onSceneMutated,
}: AgentPanelProps) {
  const [input, setInput] = useState("");
  const { keys, sessionKey } = useAgentKeys();

  // Read settings from localStorage (set by AgentSettings modal)
  const [activeProvider, setActiveProvider] = useState(
    () => localStorage.getItem("gamekit:agent:activeProvider") || ""
  );
  const [activeModel, setActiveModel] = useState(
    () => localStorage.getItem("gamekit:agent:activeModel") || ""
  );
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    () => (localStorage.getItem("gamekit:agent:approvalMode") as ApprovalMode) || "destructive-only"
  );
  const [planMode, setPlanMode] = useState(
    () => localStorage.getItem("gamekit:agent:planMode") === "1"
  );

  // Sync when settings change in the modal
  useEffect(() => {
    const handleSync = () => {
      setActiveProvider(localStorage.getItem("gamekit:agent:activeProvider") || "");
      setActiveModel(localStorage.getItem("gamekit:agent:activeModel") || "");
      setApprovalMode(
        (localStorage.getItem("gamekit:agent:approvalMode") as ApprovalMode) || "destructive-only"
      );
      setPlanMode(localStorage.getItem("gamekit:agent:planMode") === "1");
    };
    window.addEventListener("gamekit:agent:keys-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("gamekit:agent:keys-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const resolvedProvider = activeProvider || (keys.length > 0 ? keys[0].provider : "anthropic");
  const activeKeyEntry = keys.find((k) => k.provider === resolvedProvider) || keys[0] || null;
  const resolvedModel =
    activeModel ||
    activeKeyEntry?.model ||
    (resolvedProvider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "claude-sonnet-4-5");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  } = useAgent(
    sceneId,
    resolvedModel,
    resolvedProvider,
    approvalMode,
    onSceneMutated,
    planMode,
    sessionKey(resolvedProvider),
    activeKeyEntry?.baseUrl
  );

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

  // Compact provider + model label for the header
  const providerShort = PROVIDER_LABELS[resolvedProvider]?.split(" ")[0] ?? resolvedProvider;
  const modelShort = resolvedModel.split("/").pop() || resolvedModel;

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <PanelHeader className="h-auto min-h-[38px] flex-wrap gap-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <PanelTitle className="mr-1">
            <Sparkles size={12} className="text-accent-purple" /> Agent
          </PanelTitle>
          <Badge variant="default" className="max-w-[200px] truncate font-mono text-[10px]">
            {providerShort} · {modelShort}
          </Badge>
          {planMode && (
            <Badge variant="default" className="text-[9px] text-purple-400">
              Plan
            </Badge>
          )}
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
          {onToggleExpand && (
            <IconButton
              size="sm"
              title={expanded ? "Exit full screen" : "Full screen"}
              onClick={onToggleExpand}
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </IconButton>
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
            {keys.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={16} />}
                title="Connect an AI provider"
                description="Open Settings, add Anthropic, OpenAI, xAI, or a local server, then describe the level you want."
              />
            ) : messages.length === 0 ? (
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
                disabled={!input.trim() || !!pendingApproval || keys.length === 0}
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
