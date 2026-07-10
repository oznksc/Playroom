import type {
  ProviderAdapter,
  StreamInput,
  StreamEvent,
  ProviderMessage,
  ModelTool,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";

export class AnthropicAdapter implements ProviderAdapter {
  readonly id = "anthropic" as const;
  readonly label = "Anthropic Claude";
  readonly defaultBaseUrl = DEFAULT_BASE_URL;
  readonly requiresApiKey = true;

  async listModels(): Promise<string[]> {
    return ["claude-sonnet-4-5", "claude-haiku-4-5"];
  }

  async validateKey(input: {
    apiKey: string;
    baseUrl?: string;
    signal: AbortSignal;
  }): Promise<{ ok: boolean; reason?: string }> {
    try {
      const res = await fetch(`${input.baseUrl ?? DEFAULT_BASE_URL}/v1/messages`, {
        method: "POST",
        headers: {
          "x-api-key": input.apiKey,
          "anthropic-version": API_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: input.signal,
      });

      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, reason: "Invalid API key" };
      return { ok: false, reason: `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "Network error" };
    }
  }

  async *stream(input: StreamInput): AsyncGenerator<StreamEvent> {
    const baseUrl = DEFAULT_BASE_URL;
    const body = buildRequestBody(input);

    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": input.apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: input.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      yield { type: "error", message: `Anthropic API error ${res.status}: ${text}` };
      return;
    }

    yield* parseAnthropicSse(res);
  }
}

function buildRequestBody(input: StreamInput): Record<string, unknown> {
  const messages = input.messages.filter((m) => m.role !== "system");
  const systemMsg = input.messages.find((m) => m.role === "system");

  const body: Record<string, unknown> = {
    model: input.model,
    max_tokens: 4096,
    stream: true,
    messages: messages.map((m) => {
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant",
          content: [
            ...(m.content ? [{ type: "text", text: m.content }] : []),
            ...m.toolCalls.map((tc) => ({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: tc.args,
            })),
          ],
        };
      }
      if (m.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: m.toolCallId,
              content: m.content,
            },
          ],
        };
      }
      if (m.role === "user") {
        if (m.screenshot) {
          const parts = m.screenshot.split(",");
          const base64Data = parts[1] || m.screenshot;
          const mediaType = parts[0]?.split(";")[0]?.split(":")[1] || "image/png";
          return {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: m.content,
              },
            ],
          };
        }
        return { role: "user", content: m.content };
      }
      return { role: m.role, content: m.content };
    }),
  };

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  if (input.tools.length > 0) {
    body.tools = input.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  return body;
}

async function* parseAnthropicSse(res: Response): AsyncGenerator<StreamEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentToolId = "";
  let currentToolName = "";
  let toolArgsJson = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (!line.startsWith("data: ")) continue;

        const data = JSON.parse(line.slice(6));

        switch (currentEvent) {
          case "content_block_start": {
            if (data.content_block?.type === "tool_use") {
              currentToolId = data.content_block.id;
              currentToolName = data.content_block.name;
              toolArgsJson = "";
            }
            break;
          }

          case "content_block_delta": {
            if (data.delta?.type === "text_delta") {
              yield { type: "token", text: data.delta.text };
            } else if (data.delta?.type === "input_json_delta") {
              toolArgsJson += data.delta.partial_json;
            }
            break;
          }

          case "content_block_stop": {
            if (currentToolId) {
              let args: unknown = {};
              try {
                args = JSON.parse(toolArgsJson);
              } catch {
                // partial JSON — ignore
              }
              yield {
                type: "tool_calls",
                calls: [{ id: currentToolId, name: currentToolName, args }],
              };
              currentToolId = "";
              currentToolName = "";
              toolArgsJson = "";
            }
            break;
          }

          case "message_delta": {
            if (data.usage) {
              yield {
                type: "done",
                usage: {
                  inputTokens: data.usage.input_tokens ?? 0,
                  outputTokens: data.usage.output_tokens ?? 0,
                },
              };
            }
            break;
          }

          case "message_stop": {
            yield { type: "done" };
            return;
          }

          case "error": {
            yield { type: "error", message: data.error?.message ?? "Unknown error" };
            return;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
