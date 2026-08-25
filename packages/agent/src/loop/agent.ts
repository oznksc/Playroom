import { nanoid } from "nanoid";
import type { ProviderAdapter, StreamEvent, ToolCall } from "../providers/types.js";
import type { McpClient } from "../mcp/client.js";
import { listTools, toModelTools } from "../mcp/tools.js";
import { callTool } from "../mcp/executor.js";
import { MessageHistory, formatToolDigest, toPriorProviderMessages, type PriorTurn } from "./history.js";
import { globalApprovalGate, type ApprovalGate, type ApprovalMode } from "./approval.js";
import { buildSystemPrompt, type PromptContext } from "../system/prompt.js";
import type { SseEvent } from "./streaming.js";
import {
  ToolCallCache,
  fingerprint,
  isReadOnlyTool,
  isTransientProviderError,
} from "./tool-runtime.js";

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
  /** Prior editor chat (not including the live user message). */
  priorTurns?: PriorTurn[];
  /** Compact prior tool-call statuses for this scene chat. */
  priorTools?: Array<{ tool: string; status: string }>;
};

export type AgentDeps = {
  provider: ProviderAdapter;
  mcpClient: McpClient;
  /** Defaults to process-wide globalApprovalGate so /api/agent/approve works. */
  approvalGate?: ApprovalGate;
};

const MAX_TURNS = 25;
const PROVIDER_RETRY_MS = 400;
const SPIN_BREAKER =
  "Stop inspecting. You already queried the scene enough times. Make a concrete edit with a write tool, or finish with a short summary of the current scene.";

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
  for (const prior of toPriorProviderMessages(input.priorTurns)) {
    history.append(prior);
  }
  const digest = formatToolDigest(input.priorTools);
  if (digest) {
    history.append({ role: "user", content: digest });
    history.append({
      role: "assistant",
      content: "Understood. I will use those prior results and continue from the current scene state.",
    });
  }
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
  const cache = new ToolCallCache();
  let inspectTurns = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let streamEvents: StreamEvent[] = [];

    try {
      streamEvents = yield* streamProvider(provider, input, history.getMessages(), modelTools);
    } catch (e) {
      if (input.signal.aborted) {
        yield { type: "done" };
        return;
      }
      yield { type: "error", message: `Provider error: ${e instanceof Error ? e.message : e}` };
      return;
    }

    const text = streamEvents
      .filter((e): e is Extract<StreamEvent, { type: "token" }> => e.type === "token")
      .map((e) => e.text)
      .join("");

    const toolCalls = streamEvents
      .filter((e): e is Extract<StreamEvent, { type: "tool_calls" }> => e.type === "tool_calls")
      .flatMap((e) => e.calls ?? []);

    const doneEvent = streamEvents.find((e) => e.type === "done");
    const errorEvent = streamEvents.find((e) => e.type === "error");

    if (errorEvent) {
      yield { type: "error", message: errorEvent.message ?? "Unknown error" };
      return;
    }

    if (text || toolCalls.length > 0) {
      history.append({
        role: "assistant",
        content: text || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
    }

    if (toolCalls.length === 0) {
      yield { type: "done", usage: doneEvent?.usage };
      return;
    }

    yield* executeToolCalls(toolCalls, {
      mcpClient,
      approvalGate,
      approvalMode: input.approvalMode,
      signal: input.signal,
      history,
      cache,
    });

    const onlyReads = toolCalls.every((c) => isReadOnlyTool(c.name));
    inspectTurns = onlyReads ? inspectTurns + 1 : 0;
    if (inspectTurns >= 3) {
      history.append({ role: "user", content: SPIN_BREAKER });
      inspectTurns = 0;
    }

    history.compact();
  }

  yield { type: "error", message: "Max turns exceeded (25)" };
}

async function* streamProvider(
  provider: ProviderAdapter,
  input: AgentInput,
  messages: ReturnType<MessageHistory["getMessages"]>,
  tools: ReturnType<typeof toModelTools>,
): AsyncGenerator<SseEvent, StreamEvent[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const collected: StreamEvent[] = [];
    try {
      const stream = provider.stream({
        apiKey: input.apiKey,
        baseUrl: input.baseUrl,
        model: input.model,
        messages,
        tools,
        signal: input.signal,
      });
      for await (const event of stream) {
        if (event.type === "token") {
          yield { type: "token", text: event.text };
        }
        collected.push(event);
      }
      return collected;
    } catch (e) {
      lastError = e;
      if (input.signal.aborted) throw e;
      if (attempt === 0 && isTransientProviderError(e)) {
        await sleep(PROVIDER_RETRY_MS);
        continue;
      }
      throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function* executeToolCalls(
  toolCalls: ToolCall[],
  ctx: {
    mcpClient: AgentDeps["mcpClient"];
    approvalGate: ApprovalGate;
    approvalMode: ApprovalMode;
    signal: AbortSignal;
    history: MessageHistory;
    cache: ToolCallCache;
  },
): AsyncGenerator<SseEvent> {
  let index = 0;
  while (index < toolCalls.length) {
    const head = toolCalls[index];
    const parallel = !ctx.approvalGate.needsApproval(head.name, ctx.approvalMode) && isReadOnlyTool(head.name);
    if (!parallel) {
      yield* runOneTool(head, ctx);
      index += 1;
      continue;
    }
    const batch: ToolCall[] = [];
    while (index < toolCalls.length) {
      const next = toolCalls[index];
      if (ctx.approvalGate.needsApproval(next.name, ctx.approvalMode) || !isReadOnlyTool(next.name)) break;
      batch.push(next);
      index += 1;
    }
    yield* runReadBatch(batch, ctx);
  }
}

async function* runReadBatch(
  batch: ToolCall[],
  ctx: Parameters<typeof executeToolCalls>[1],
): AsyncGenerator<SseEvent> {
  if (batch.length === 1) {
    yield* runOneTool(batch[0], ctx);
    return;
  }
  const prepared = batch.map((call) => {
    const callId = call.id || nanoid();
    const key = fingerprint(call.name, call.args);
    return { call, callId, key };
  });
  for (const item of prepared) {
    yield { type: "tool_start", callId: item.callId, tool: item.call.name, args: item.call.args };
  }
  const started = Date.now();
  const settled = await Promise.all(
    prepared.map(async (item) => {
      const skip = ctx.cache.skipReason(item.key);
      if (skip) {
        const cached = ctx.cache.cached(item.key);
        return {
          item,
          result: {
            content: cached?.content ?? { skipped: true, reason: skip },
            text: cached?.ok ? cached.text : skip,
            isError: cached ? !cached.ok : true,
          },
        };
      }
      try {
        const result = await callTool(ctx.mcpClient, item.call.name, item.call.args, ctx.signal);
        ctx.cache.record(item.key, result);
        return { item, result };
      } catch (e) {
        const result = {
          content: { error: e instanceof Error ? e.message : "Tool call failed" },
          text: e instanceof Error ? e.message : "Tool call failed",
          isError: true,
        };
        ctx.cache.record(item.key, result);
        return { item, result };
      }
    }),
  );
  const ms = Date.now() - started;
  for (const { item, result } of settled) {
    yield {
      type: "tool_result",
      callId: item.callId,
      tool: item.call.name,
      result: result.content,
      ok: !result.isError,
      ms,
    };
    ctx.history.append({
      role: "tool",
      toolCallId: item.call.id,
      name: item.call.name,
      content: result.text,
    });
  }
}

async function* runOneTool(
  call: ToolCall,
  ctx: Parameters<typeof executeToolCalls>[1],
): AsyncGenerator<SseEvent> {
  const callId = call.id || nanoid();

  if (ctx.approvalGate.needsApproval(call.name, ctx.approvalMode)) {
    const reqId = nanoid();
    yield {
      type: "approval_request",
      requestId: reqId,
      callId,
      tool: call.name,
      args: call.args,
    };
    const decision = await ctx.approvalGate.waitForApproval(reqId, ctx.signal);
    if (decision === "deny") {
      yield {
        type: "tool_result",
        callId,
        tool: call.name,
        result: { denied: true },
        ok: false,
      };
      ctx.history.append({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify({ denied: true }),
      });
      return;
    }
  }

  const key = fingerprint(call.name, call.args);
  const skip = ctx.cache.skipReason(key);
  yield { type: "tool_start", callId, tool: call.name, args: call.args };
  const startMs = Date.now();

  if (skip) {
    const cached = ctx.cache.cached(key);
    const ok = cached?.ok ?? false;
    yield {
      type: "tool_result",
      callId,
      tool: call.name,
      result: cached?.content ?? { skipped: true, reason: skip },
      ok,
      ms: Date.now() - startMs,
    };
    ctx.history.append({
      role: "tool",
      toolCallId: call.id,
      name: call.name,
      content: ok && cached ? cached.text : skip,
    });
    return;
  }

  let result;
  try {
    result = await callTool(ctx.mcpClient, call.name, call.args, ctx.signal);
  } catch (e) {
    result = {
      content: { error: e instanceof Error ? e.message : "Tool call failed" },
      text: e instanceof Error ? e.message : "Tool call failed",
      isError: true,
    };
  }
  ctx.cache.record(key, result);

  yield {
    type: "tool_result",
    callId,
    tool: call.name,
    result: result.content,
    ok: !result.isError,
    ms: Date.now() - startMs,
  };
  ctx.history.append({
    role: "tool",
    toolCallId: call.id,
    name: call.name,
    content: result.text,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
