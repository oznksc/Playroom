import { nanoid } from "nanoid";
import type { ProviderAdapter, ProviderMessage, ToolCall } from "../providers/types.js";
import type { McpClient } from "../mcp/client.js";
import { listTools, toModelTools } from "../mcp/tools.js";
import { callTool } from "../mcp/executor.js";
import { MessageHistory } from "./history.js";
import { ApprovalGate, type ApprovalMode } from "./approval.js";
import { buildSystemPrompt, type PromptContext } from "../system/prompt.js";
import type { SseEvent } from "./streaming.js";

export type AgentInput = {
  message: string;
  screenshot?: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  approvalMode: ApprovalMode;
  sceneContext: PromptContext;
  signal: AbortSignal;
};

export type AgentDeps = {
  provider: ProviderAdapter;
  mcpClient: McpClient;
};

const MAX_TURNS = 25;

export async function* runAgent(
  input: AgentInput,
  deps: AgentDeps,
): AsyncGenerator<SseEvent> {
  const { provider, mcpClient } = deps;
  const history = new MessageHistory();
  const approvalGate = new ApprovalGate();

  // Build system prompt
  const system = buildSystemPrompt(input.sceneContext);
  history.append({ role: "system", content: system });
  history.append({ role: "user", content: input.message, screenshot: input.screenshot });

  // Fetch MCP tools
  let mcpTools;
  try {
    mcpTools = await listTools(mcpClient);
  } catch (e) {
    yield { type: "error", message: `Failed to list MCP tools: ${e instanceof Error ? e.message : e}` };
    return;
  }

  const modelTools = toModelTools(mcpTools, provider.id);

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Call provider
    let streamEvents: Array<{ type: string; text?: string; calls?: ToolCall[]; message?: string; usage?: { inputTokens: number; outputTokens: number } }> = [];

    try {
      const stream = provider.stream({
        apiKey: input.apiKey,
        baseUrl: input.baseUrl,
        model: input.model,
        messages: history.getMessages(),
        tools: modelTools,
        signal: input.signal,
      });

      for await (const event of stream) {
        if (event.type === "token") {
          yield { type: "token", text: event.text };
        }
        streamEvents.push(event);
      }
    } catch (e) {
      if (input.signal.aborted) {
        yield { type: "done" };
        return;
      }
      yield { type: "error", message: `Provider error: ${e instanceof Error ? e.message : e}` };
      return;
    }

    // Collect text and tool calls from stream
    const text = streamEvents
      .filter((e): e is { type: "token"; text: string } => e.type === "token")
      .map((e) => e.text)
      .join("");

    const toolCalls = streamEvents
      .filter((e): e is { type: "tool_calls"; calls: ToolCall[] } => e.type === "tool_calls")
      .flatMap((e) => e.calls ?? []);

    const doneEvent = streamEvents.find((e) => e.type === "done");
    const errorEvent = streamEvents.find((e) => e.type === "error");

    if (errorEvent) {
      yield { type: "error", message: errorEvent.message ?? "Unknown error" };
      return;
    }

    // Append assistant response to history
    if (text || toolCalls.length > 0) {
      history.append({
        role: "assistant",
        content: text || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
    }

    // No tool calls — we're done
    if (toolCalls.length === 0) {
      yield { type: "done", usage: doneEvent?.usage };
      return;
    }

    // Process tool calls
    for (const call of toolCalls) {
      // Check approval
      if (approvalGate.needsApproval(call.name, input.approvalMode)) {
        const reqId = nanoid();
        yield {
          type: "approval_request",
          requestId: reqId,
          tool: call.name,
          args: call.args,
        };

        const decision = await approvalGate.waitForApproval(reqId, input.signal);
        if (decision === "deny") {
          history.append({
            role: "user",
            content: `User denied tool call: ${call.name}`,
          });
          continue;
        }
      }

      // Execute tool
      yield { type: "tool_start", tool: call.name, args: call.args };
      const startMs = Date.now();

      let result;
      try {
        result = await callTool(mcpClient, call.name, call.args, input.signal);
      } catch (e) {
        result = { content: { error: e instanceof Error ? e.message : "Tool call failed" }, isError: true };
      }

      const ms = Date.now() - startMs;
      yield {
        type: "tool_result",
        tool: call.name,
        result: result.content,
        ok: !result.isError,
        ms,
      };

      // Append tool result to history
      history.append({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify(result.content),
      });
    }

    // Compact history if too long
    history.compact();
  }

  yield { type: "error", message: "Max turns exceeded (25)" };
}
