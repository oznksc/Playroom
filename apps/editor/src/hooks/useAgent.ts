import { useState, useCallback, useRef } from "react";
import { nanoid } from "../lib/nanoid.js";
import { getApiUrl } from "../lib/api.js";
import { parseSseStream } from "../lib/agent-stream.js";
import type { AgentMessage, AgentToolCall, ApprovalRequest } from "../lib/agent-schemas.js";
import type { ApprovalMode } from "../lib/approval-mode.js";

export type UseAgentReturn = {
  messages: AgentMessage[];
  toolCalls: AgentToolCall[];
  isStreaming: boolean;
  pendingApproval: ApprovalRequest | null;
  sendMessage: (text: string) => Promise<void>;
  abort: () => void;
  approveTool: (requestId: string, decision: "allow" | "deny") => Promise<void>;
  clear: () => void;
};

export function useAgent(
  sceneId: string,
  model: string,
  provider: string,
  approvalMode: ApprovalMode,
): UseAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<AgentToolCall[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
                  updated[i] = { ...updated[i], result: d.result, status: d.ok ? "ok" : "error", ms: d.ms };
                  break;
                }
              }
              return updated;
            });
            break;
          }

          case "approval_request": {
            const d = data as { requestId: string; tool: string; args: unknown };
            setPendingApproval({ requestId: d.requestId, tool: d.tool, args: d.args });
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
    } catch (e) {
      if (abortRef.current?.signal.aborted) {
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "system", content: "Request aborted", ts: Date.now() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "system", content: `Network error: ${e instanceof Error ? e.message : e}`, ts: Date.now() },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [sceneId, model, provider, approvalMode]);

  const sendMessage = useCallback(async (text: string) => {
    if (isStreaming) return;

    if (text.startsWith("/screenshot")) {
      const prompt = text.slice(11).trim() || "Analyze this scene visual layout.";
      const canvas = document.querySelector("canvas");
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        await sendChatMessage(prompt, dataUrl);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: "system", content: "Error: No active canvas found to take screenshot.", ts: Date.now() },
        ]);
      }
      return;
    }

    if (text.startsWith("/")) {
      handleSlashCommand(text, sceneId, setMessages);
      return;
    }

    await sendChatMessage(text);
  }, [isStreaming, sendChatMessage, sceneId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const approveTool = useCallback(async (requestId: string, decision: "allow" | "deny") => {
    setPendingApproval(null);
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
  }, []);

  return { messages, toolCalls, isStreaming, pendingApproval, sendMessage, abort, approveTool, clear };
}

function handleSlashCommand(
  text: string,
  sceneId: string,
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
        { id: nanoid(), role: "system", content: `Unknown command: ${cmd}. Type /help for available commands.`, ts: Date.now() },
      ]);
  }
}

const SLASH_HELP_TEXT = `Available commands:
/screenshot [prompt]  — Capture canvas & send to vision model
/spawn <type> [x] [y]  — Create entity (player, enemy, collectible, platform)
/apply <skill>         — Apply game template skill
/validate              — Validate current scene
/gravity <y>           — Set gravity
/clear                 — Clear conversation
/help                  — Show this help`;
