export type AgentMessageRole = "user" | "agent" | "system" | "tool";

export type AgentMessage = {
  id: string;
  role: AgentMessageRole;
  content: string;
  ts: number;
  tokens?: number;
};

export type AgentToolCall = {
  id: string;
  tool: string;
  args: unknown;
  result?: unknown;
  status: "running" | "ok" | "error" | "needs-approval";
  ms?: number;
  ts: number;
};

export type SseEventType =
  | "token"
  | "tool_start"
  | "tool_result"
  | "approval_request"
  | "session_snapshot"
  | "done"
  | "error";

export type ApprovalRequest = {
  requestId: string;
  tool: string;
  args: unknown;
};
