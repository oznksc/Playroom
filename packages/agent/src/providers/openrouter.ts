import type {
  ProviderAdapter,
  StreamInput,
  StreamEvent,
  ProviderMessage,
  ModelTool,
} from "./types.js";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export class OpenRouterAdapter implements ProviderAdapter {
  readonly id = "openrouter" as const;
  readonly label = "OpenRouter";
  readonly defaultBaseUrl = DEFAULT_BASE_URL;
  readonly requiresApiKey = true;

  async listModels(input: { apiKey: string; baseUrl?: string; signal: AbortSignal }): Promise<string[]> {
    try {
      const res = await fetch(`${input.baseUrl ?? DEFAULT_BASE_URL}/models`, {
        headers: {
          "Authorization": `Bearer ${input.apiKey}`,
        },
        signal: input.signal,
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      return data.data?.map((m) => m.id) ?? [];
    } catch {
      return [];
    }
  }

  async validateKey(input: {
    apiKey: string;
    baseUrl?: string;
    signal: AbortSignal;
  }): Promise<{ ok: boolean; reason?: string }> {
    try {
      const res = await fetch(`${input.baseUrl ?? DEFAULT_BASE_URL}/auth/key`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${input.apiKey}`,
        },
        signal: input.signal,
      });
      if (res.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "Cannot connect to OpenRouter" };
    }
  }

  async *stream(input: StreamInput): AsyncGenerator<StreamEvent> {
    const baseUrl = input.baseUrl ?? DEFAULT_BASE_URL;
    const body = buildOpenAiBody(input);

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "authorization": `Bearer ${input.apiKey}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "GameKit",
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: input.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", message: `OpenRouter error ${res.status}: ${text}` };
      return;
    }

    yield* parseOpenAiSse(res);
  }
}

function buildOpenAiBody(input: StreamInput): Record<string, unknown> {
  const messages = input.messages.map((m) => {
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant",
        content: m.content ?? null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args),
          },
        })),
      };
    }
    if (m.role === "tool") {
      return {
        role: "tool",
        tool_call_id: m.toolCallId,
        content: m.content,
      };
    }
    return { role: m.role, content: m.content };
  });

  const body: Record<string, unknown> = {
    model: input.model,
    messages,
    stream: true,
  };

  if (input.tools.length > 0) {
    body.tools = input.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  return body;
}

async function* parseOpenAiSse(res: Response): AsyncGenerator<StreamEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentToolCalls: Map<number, { id: string; name: string; argsJson: string }> = new Map();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          if (currentToolCalls.size > 0) {
            yield {
              type: "tool_calls",
              calls: Array.from(currentToolCalls.values()).map((tc) => ({
                id: tc.id,
                name: tc.name,
                args: JSON.parse(tc.argsJson || "{}"),
              })),
            }
            currentToolCalls.clear();
          }
          yield { type: "done" };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;
          if (!delta) continue;

          if (delta.content) {
            yield { type: "token", text: delta.content };
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!currentToolCalls.has(idx)) {
                currentToolCalls.set(idx, {
                  id: tc.id ?? `call_${idx}`,
                  name: tc.function?.name ?? "",
                  argsJson: "",
                });
              }
              const existing = currentToolCalls.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.argsJson += tc.function.arguments;
            }
          }

          if (choice.finish_reason === "tool_calls" && currentToolCalls.size > 0) {
            yield {
              type: "tool_calls",
              calls: Array.from(currentToolCalls.values()).map((tc) => ({
                id: tc.id,
                name: tc.name,
                args: JSON.parse(tc.argsJson || "{}"),
              })),
            };
            currentToolCalls.clear();
          }
        } catch {
          // not JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
