import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "../lib/nanoid.js";
import { getApiUrl } from "../lib/api.js";
import { parseSseStream } from "../lib/agent-stream.js";
import type { AgentMessage, AgentToolCall, ApprovalRequest } from "../lib/agent-schemas.js";
import type { ApprovalMode } from "../lib/approval-mode.js";

const READ_ONLY_TOOLS = new Set([
  "list_skills",
  "list_recipes",
  "describe_recipe",
  "list_assets",
  "list_scenes",
  "list_entities",
  "list_components",
  "list_prefabs",
  "validate_scene",
  "validate_project",
  "explain_scene",
  "find_unused_assets",
  "suggest_components",
  "raycast",
  "query_overlaps",
  "diff_scene_versions",
  "snapshot_undo_point",
  "search_project",
  "get_project",
  "get_scene",
  "get_active_scene",
  "simulate_runtime_step",
]);

export type UseAgentReturn = {
  messages: AgentMessage[];
  toolCalls: AgentToolCall[];
  isStreaming: boolean;
  pendingApproval: ApprovalRequest | null;
  sessionSnapshotId: string | null;
  sendMessage: (text: string) => Promise<void>;
  abort: () => void;
  approveTool: (requestId: string, decision: "allow" | "deny") => Promise<void>;
  clear: () => void;
  restoreSessionSnapshot: () => Promise<void>;
};

export function useAgent(
  sceneId: string,
  model: string,
  provider: string,
  approvalMode: ApprovalMode,
  onSceneMutated?: () => void,
  planMode = false,
): UseAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<AgentToolCall[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [sessionSnapshotId, setSessionSnapshotId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onSceneMutatedRef = useRef(onSceneMutated);
  onSceneMutatedRef.current = onSceneMutated;
  const messagesRef = useRef(messages);
  const toolCallsRef = useRef(toolCalls);
  messagesRef.current = messages;
  toolCallsRef.current = toolCalls;
  const historyLoadedRef = useRef<string | null>(null);

  // Load conversation history for the active scene once
  useEffect(() => {
    if (!sceneId || historyLoadedRef.current === sceneId) return;
    historyLoadedRef.current = sceneId;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(getApiUrl(`/api/agent/history/${encodeURIComponent(sceneId)}`));
        if (!res.ok || cancelled) return;
        const data = await res.json() as { messages?: AgentMessage[]; toolCalls?: AgentToolCall[] };
        if (cancelled) return;
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
        if (Array.isArray(data.toolCalls) && data.toolCalls.length > 0) {
          setToolCalls(data.toolCalls);
        }
      } catch {
        // no history yet
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sceneId]);

  const persistHistory = useCallback(async (nextMessages: AgentMessage[], nextTools: AgentToolCall[]) => {
    try {
      await fetch(getApiUrl(`/api/agent/history/${encodeURIComponent(sceneId)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, toolCalls: nextTools }),
      });
    } catch {
      // best-effort
    }
  }, [sceneId]);

  const sendChatMessage = useCallback(async (prompt: string, screenshot?: string) => {
    abortRef.current = new AbortController();
    setIsStreaming(true);

    const userMsg: AgentMessage = { id: nanoid(), role: "user", content: prompt, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(getApiUrl("/api/agent/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId,
          message: prompt,
          screenshot,
          model,
          provider,
          approvalMode,
          planMode: planMode || approvalMode === "plan",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "system", content: `Error: ${err.error ?? res.statusText}`, ts: Date.now() },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      let agentContent = "";
      let currentToolId = "";
      let sceneDirty = false;

      for await (const { event, data } of parseSseStream(reader)) {
        switch (event) {
          case "token": {
            const d = data as { text: string };
            agentContent += d.text;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "agent" && last.id === currentToolId) {
                return [...prev.slice(0, -1), { ...last, content: agentContent }];
              }
              const msgId = nanoid();
              currentToolId = msgId;
              return [...prev, { id: msgId, role: "agent", content: agentContent, ts: Date.now() }];
            });
            break;
          }

          case "tool_start": {
            const d = data as { tool: string; args: unknown };
            const toolCall: AgentToolCall = {
              id: nanoid(),
              tool: d.tool,
              args: d.args,
              status: "running",
              ts: Date.now(),
            };
            setToolCalls((prev) => [...prev, toolCall]);
            break;
          }

          case "tool_result": {
            const d = data as { tool: string; result: unknown; ok: boolean; ms?: number };
            setToolCalls((prev) => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].tool === d.tool && updated[i].status === "running") {
                  updated[i] = {
                    ...updated[i],
                    result: d.result,
                    status: d.ok ? "ok" : "error",
                    ms: d.ms,
                  };
                  break;
                }
              }
              return updated;
            });
            if (d.ok && !READ_ONLY_TOOLS.has(d.tool)) {
              sceneDirty = true;
            }
            break;
          }

          case "approval_request": {
            const d = data as { requestId: string; tool: string; args: unknown };
            setPendingApproval({ requestId: d.requestId, tool: d.tool, args: d.args });
            setToolCalls((prev) => [
              ...prev,
              {
                id: nanoid(),
                tool: d.tool,
                args: d.args,
                status: "needs-approval",
                ts: Date.now(),
              },
            ]);
            break;
          }

          case "session_snapshot": {
            const d = data as { snapshotId: string };
            setSessionSnapshotId(d.snapshotId);
            setMessages((prev) => [
              ...prev,
              {
                id: nanoid(),
                role: "system",
                content: `Session undo point: ${d.snapshotId}`,
                ts: Date.now(),
              },
            ]);
            break;
          }

          case "done": {
            if (agentContent) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "agent") return prev;
                return [...prev, { id: nanoid(), role: "agent", content: agentContent, ts: Date.now() }];
              });
            }
            break;
          }

          case "error": {
            const d = data as { message: string };
            setMessages((prev) => [
              ...prev,
              { id: nanoid(), role: "system", content: `Error: ${d.message}`, ts: Date.now() },
            ]);
            break;
          }
        }
      }

      if (sceneDirty) {
        onSceneMutatedRef.current?.();
      }
      await persistHistory(messagesRef.current, toolCallsRef.current);
    } catch (e) {
      if (abortRef.current?.signal.aborted) {
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "system", content: "Request aborted", ts: Date.now() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "system",
            content: `Network error: ${e instanceof Error ? e.message : e}`,
            ts: Date.now(),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      void persistHistory(messagesRef.current, toolCallsRef.current);
    }
  }, [sceneId, model, provider, approvalMode, planMode, persistHistory]);

  const sendMessage = useCallback(async (text: string) => {
    if (isStreaming) return;

    if (text.startsWith("/screenshot")) {
      const prompt =
        text.slice(11).trim() ||
        "Analyze this scene visual layout. List entities you can infer, spacing issues, and concrete edit suggestions.";
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (canvas) {
        // Prefer higher-res capture when the canvas is HiDPI-backed
        const dataUrl = canvas.toDataURL("image/png");
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "system",
            content: `Captured canvas screenshot (${canvas.width}×${canvas.height}px buffer).`,
            ts: Date.now(),
          },
        ]);
        await sendChatMessage(prompt, dataUrl);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "system", content: "Error: No active canvas found to take screenshot.", ts: Date.now() },
        ]);
      }
      return;
    }

    if (text === "/plan" || text.startsWith("/plan ")) {
      const rest = text === "/plan" ? "Propose a numbered plan for improving this scene, then wait." : text.slice(6).trim();
      await sendChatMessage(
        `[PLAN MODE] Propose a numbered plan only. Do not call tools yet.\n\nUser request: ${rest || "Improve the current scene."}`,
      );
      return;
    }

    if (text === "/execute" || text === "/execute plan") {
      await sendChatMessage("Execute the plan you just proposed. Use tools now.");
      return;
    }

    if (text.startsWith("/")) {
      handleSlashCommand(text, setMessages);
      return;
    }

    await sendChatMessage(text);
  }, [isStreaming, sendChatMessage]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    fetch(getApiUrl("/api/agent/abort"), { method: "POST" }).catch(() => {});
  }, []);

  const approveTool = useCallback(async (requestId: string, decision: "allow" | "deny") => {
    setPendingApproval(null);
    setToolCalls((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].status === "needs-approval") {
          updated[i] = {
            ...updated[i],
            status: decision === "allow" ? "running" : "error",
            result: decision === "deny" ? { denied: true } : updated[i].result,
          };
          break;
        }
      }
      return updated;
    });
    try {
      await fetch(getApiUrl("/api/agent/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision }),
      });
    } catch {
      // ignore
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setToolCalls([]);
    setSessionSnapshotId(null);
    void persistHistory([], []);
    fetch(getApiUrl(`/api/agent/history/${encodeURIComponent(sceneId)}`), { method: "DELETE" }).catch(() => {});
  }, [persistHistory, sceneId]);

  const restoreSessionSnapshot = useCallback(async () => {
    if (!sessionSnapshotId) return;
    setMessages((prev) => [
      ...prev,
      {
        id: nanoid(),
        role: "user",
        content: `Restore session snapshot ${sessionSnapshotId}`,
        ts: Date.now(),
      },
    ]);
    await sendChatMessage(
      `Call restore_snapshot with snapshotId "${sessionSnapshotId}" to roll back the scene to the start of this agent session. Then confirm what was restored.`,
    );
  }, [sessionSnapshotId, sendChatMessage]);

  return {
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
  };
}

function handleSlashCommand(
  text: string,
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>,
): void {
  const parts = text.split(" ");
  const cmd = parts[0];

  switch (cmd) {
    case "/clear":
      setMessages([]);
      break;
    case "/help":
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "system", content: SLASH_HELP_TEXT, ts: Date.now() },
      ]);
      break;
    default:
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "system",
          content: `Unknown command: ${cmd}. Type /help for available commands.`,
          ts: Date.now(),
        },
      ]);
  }
}

const SLASH_HELP_TEXT = `Available commands:
/screenshot [prompt]  — Capture canvas & send to vision model
/plan [request]        — Ask for a plan only (no tools)
/execute               — Execute the last proposed plan
/clear                 — Clear conversation
/help                  — Show this help`;
