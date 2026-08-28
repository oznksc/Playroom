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
  "get_entity",
  "query_entities",
  "inspect_layout",
  "list_component_types",
  "list_script_catalog",
  "list_levels",
  "get_input_map",
  "list_gui_nodes",
  "list_editor_capabilities",
  "get_scene_settings",
  "get_timeline",
  "get_game_rules",
  "list_gui_components",
  "run_doctor",
  "get_audit_log",
  "query_audit_log",
  "get_prefab",
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
  apiKey?: string,
  baseUrl?: string
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
        const data = (await res.json()) as {
          messages?: AgentMessage[];
          toolCalls?: AgentToolCall[];
        };
        if (cancelled) return;
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          messagesRef.current = data.messages;
        }
        if (Array.isArray(data.toolCalls) && data.toolCalls.length > 0) {
          const restored = data.toolCalls.map((tc) =>
            tc.status === "running" || tc.status === "needs-approval"
              ? { ...tc, status: "cancelled" as const }
              : tc
          );
          setToolCalls(restored);
          toolCallsRef.current = restored;
        }
      } catch {
        // no history yet
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sceneId]);

  const persistHistory = useCallback(
    async (nextMessages: AgentMessage[], nextTools: AgentToolCall[]) => {
      try {
        await fetch(getApiUrl(`/api/agent/history/${encodeURIComponent(sceneId)}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages, toolCalls: nextTools }),
        });
      } catch {
        // best-effort
      }
    },
    [sceneId]
  );

  const patchMessages = useCallback((updater: (prev: AgentMessage[]) => AgentMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const patchToolCalls = useCallback((updater: (prev: AgentToolCall[]) => AgentToolCall[]) => {
    setToolCalls((prev) => {
      const next = updater(prev);
      toolCallsRef.current = next;
      return next;
    });
  }, []);

  const finalizeOpenTools = useCallback(
    (status: "cancelled" | "error" = "cancelled") => {
      patchToolCalls((prev) =>
        prev.map((tc) =>
          tc.status === "running" || tc.status === "needs-approval" ? { ...tc, status } : tc
        )
      );
    },
    [patchToolCalls]
  );

  const upsertToolCall = useCallback(
    (
      id: string,
      tool: string,
      args: unknown,
      status: AgentToolCall["status"],
      extra?: Partial<AgentToolCall>
    ) => {
      patchToolCalls((prev) => {
        const index = prev.findIndex((tc) => tc.id === id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], tool, args, status, ...extra };
          return next;
        }
        return [...prev, { id, tool, args, status, ts: Date.now(), ...extra }];
      });
    },
    [patchToolCalls]
  );

  const sendChatMessage = useCallback(
    async (prompt: string, screenshot?: string) => {
      abortRef.current = new AbortController();
      setIsStreaming(true);

      const userMsg: AgentMessage = { id: nanoid(), role: "user", content: prompt, ts: Date.now() };
      patchMessages((prev) => [...prev, userMsg]);

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
            history: messagesRef.current
              .slice(0, -1)
              .map((m) => ({ role: m.role, content: m.content })),
            toolCalls: toolCallsRef.current.map((t) => ({ tool: t.tool, status: t.status })),
            ...(apiKey ? { apiKey } : {}),
            ...(baseUrl ? { baseUrl } : {}),
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          patchMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: "system",
              content: `Error: ${err.error ?? res.statusText}`,
              ts: Date.now(),
            },
          ]);
          finalizeOpenTools();
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
              patchMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "agent" && last.id === currentToolId) {
                  return [...prev.slice(0, -1), { ...last, content: agentContent }];
                }
                const msgId = nanoid();
                currentToolId = msgId;
                return [
                  ...prev,
                  { id: msgId, role: "agent", content: agentContent, ts: Date.now() },
                ];
              });
              break;
            }

            case "tool_start": {
              const d = data as { callId?: string; tool: string; args: unknown };
              const id = d.callId || nanoid();
              upsertToolCall(id, d.tool, d.args, "running");
              break;
            }

            case "tool_result": {
              const d = data as {
                callId?: string;
                tool: string;
                result: unknown;
                ok: boolean;
                ms?: number;
              };
              const status = d.ok ? "ok" : "error";
              patchToolCalls((prev) => {
                const updated = [...prev];
                let index = d.callId ? updated.findIndex((tc) => tc.id === d.callId) : -1;
                if (index < 0) {
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (
                      updated[i].tool === d.tool &&
                      (updated[i].status === "running" || updated[i].status === "needs-approval")
                    ) {
                      index = i;
                      break;
                    }
                  }
                }
                if (index >= 0) {
                  updated[index] = {
                    ...updated[index],
                    result: d.result,
                    status,
                    ms: d.ms,
                  };
                  return updated;
                }
                return [
                  ...updated,
                  {
                    id: d.callId || nanoid(),
                    tool: d.tool,
                    args: undefined,
                    result: d.result,
                    status,
                    ms: d.ms,
                    ts: Date.now(),
                  },
                ];
              });
              if (d.ok && !READ_ONLY_TOOLS.has(d.tool)) {
                sceneDirty = true;
              }
              break;
            }

            case "approval_request": {
              const d = data as { requestId: string; callId?: string; tool: string; args: unknown };
              setPendingApproval({ requestId: d.requestId, tool: d.tool, args: d.args });
              upsertToolCall(d.callId || nanoid(), d.tool, d.args, "needs-approval");
              break;
            }

            case "session_snapshot": {
              const d = data as { snapshotId: string };
              setSessionSnapshotId(d.snapshotId);
              patchMessages((prev) => [
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
                patchMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "agent") return prev;
                  return [
                    ...prev,
                    { id: nanoid(), role: "agent", content: agentContent, ts: Date.now() },
                  ];
                });
              }
              finalizeOpenTools();
              break;
            }

            case "error": {
              const d = data as { message: string };
              patchMessages((prev) => [
                ...prev,
                { id: nanoid(), role: "system", content: `Error: ${d.message}`, ts: Date.now() },
              ]);
              finalizeOpenTools("error");
              break;
            }
          }
        }

        if (sceneDirty) {
          onSceneMutatedRef.current?.();
        }
        finalizeOpenTools();
        await persistHistory(messagesRef.current, toolCallsRef.current);
      } catch (e) {
        finalizeOpenTools();
        if (abortRef.current?.signal.aborted) {
          patchMessages((prev) => [
            ...prev,
            { id: nanoid(), role: "system", content: "Request aborted", ts: Date.now() },
          ]);
        } else {
          patchMessages((prev) => [
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
    },
    [
      sceneId,
      model,
      provider,
      approvalMode,
      planMode,
      apiKey,
      baseUrl,
      persistHistory,
      patchMessages,
      patchToolCalls,
      upsertToolCall,
      finalizeOpenTools,
    ]
  );

  const sendMessage = useCallback(
    async (text: string) => {
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
            {
              id: nanoid(),
              role: "system",
              content: "Error: No active canvas found to take screenshot.",
              ts: Date.now(),
            },
          ]);
        }
        return;
      }

      if (text === "/plan" || text.startsWith("/plan ")) {
        const rest =
          text === "/plan"
            ? "Propose a numbered plan for improving this scene, then wait."
            : text.slice(6).trim();
        await sendChatMessage(
          `[PLAN MODE] Propose a numbered plan only. Do not call tools yet.\n\nUser request: ${rest || "Improve the current scene."}`
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
    },
    [isStreaming, sendChatMessage]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    finalizeOpenTools();
    fetch(getApiUrl("/api/agent/abort"), { method: "POST" }).catch(() => {});
  }, [finalizeOpenTools]);

  const approveTool = useCallback(
    async (requestId: string, decision: "allow" | "deny") => {
      setPendingApproval(null);
      patchToolCalls((prev) => {
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
    },
    [patchToolCalls]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setToolCalls([]);
    messagesRef.current = [];
    toolCallsRef.current = [];
    setSessionSnapshotId(null);
    void persistHistory([], []);
    fetch(getApiUrl(`/api/agent/history/${encodeURIComponent(sceneId)}`), {
      method: "DELETE",
    }).catch(() => {});
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
      `Call restore_snapshot with snapshotId "${sessionSnapshotId}" to roll back the scene to the start of this agent session. Then confirm what was restored.`
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
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>
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
