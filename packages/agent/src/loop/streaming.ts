export type SseEvent =
  | { type: "token"; text: string }
  | { type: "tool_start"; callId: string; tool: string; args: unknown }
  | { type: "tool_result"; callId: string; tool: string; result: unknown; ok: boolean; ms?: number }
  | { type: "approval_request"; requestId: string; callId: string; tool: string; args: unknown }
  | { type: "done"; usage?: { inputTokens: number; outputTokens: number } }
  | { type: "error"; message: string };

export function encodeSse(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
