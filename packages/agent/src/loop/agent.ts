import { nanoid } from "nanoid";
import type { ProviderAdapter, ProviderMessage, ToolCall } from "../providers/types.js";
import type { McpClient } from "../mcp/client.js";
import { listTools, toModelTools } from "../mcp/tools.js";
import { callTool } from "../mcp/executor.js";
import { MessageHistory } from "./history.js";
import { globalApprovalGate, type ApprovalGate, type ApprovalMode } from "./approval.js";
import { buildSystemPrompt, type PromptContext } from "../system/prompt.js";
import type { SseEvent } from "./streaming.js";

export type AgentInput = {
  message: string;
  screenshot?: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  approvalMode: ApprovalMode;
  /** When true, first reply must be a plan with no tool calls. */
  planMode?: boolean;
  sceneContext: PromptContext;
  signal: AbortSignal;
  /** Optional undo snapshot id created before the run. */
  sessionSnapshotId?: string;
};

export type AgentDeps = {
  provider: ProviderAdapter;
  mcpClient: McpClient;
  /** Defaults to process-wide globalApprovalGate so /api/agent/approve works. */
  approvalGate?: ApprovalGate;
};

const MAX_TURNS = 25;

const PLAN_MODE_INSTRUCTION = `PLAN MODE is ON.
1. First reply with a numbered plan of the exact tool steps you will take.
2. Do NOT call any tools in that first reply.
3. After the user confirms (or sends "execute"), run the plan with tools.
4. Prefer snapshot_undo_point before bulk destructive edits when possible.`;

export async function* runAgent(
  input: AgentInput,
  deps: AgentDeps,
): AsyncGenerator<SseEvent> {
  const { provider, mcpClient } = deps;
  const history = new MessageHistory();
  const approvalGate = deps.approvalGate ?? globalApprovalGate;

  // Build system prompt
  let system = buildSystemPrompt(input.sceneContext);
  if (input.planMode || input.approvalMode === "plan") {
    system += `\n\n## Plan Mode\n${PLAN_MODE_INSTRUCTION}`;
  }
  if (input.sessionSnapshotId) {
    system += `\n\n## Session Safety\nAn undo snapshot was created before this run: \`${input.sessionSnapshotId}\`. You can call restore_snapshot with this id if the user wants to roll back.`;
  }
  history.append({ role: "system", content: system });
  let userContent = input.message;
  if (input.screenshot) {
    userContent = `${input.message}

[VISION] A canvas screenshot of the active scene is attached as an image.
Viewport: ${input.sceneContext.viewport.width}×${input.sceneContext.viewport.height} (${input.sceneContext.orientation}).
Describe spatial layout precisely (left/right/above/below, approximate pixel positions).
Prefer tool calls to fix issues you can see (missing colliders, bad spacing, off-screen entities).`;
  }
  history.append({ role: "user", content: userContent, screenshot: input.screenshot });

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
