export type ProviderMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export type ToolCall = {
  id: string;
  name: string;
  args: unknown;
};

export type ModelTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type StreamInput = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: ProviderMessage[];
  tools: ModelTool[];
  signal: AbortSignal;
};

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "error"; message: string }
  | { type: "done"; usage?: { inputTokens: number; outputTokens: number } };

export type ProviderId = "anthropic" | "openai" | "google" | "ollama" | "lmstudio" | "custom" | "openrouter";

export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly label: string;
  readonly defaultBaseUrl: string;
  readonly requiresApiKey: boolean;

  listModels(input: {
    apiKey: string;
    baseUrl?: string;
    signal: AbortSignal;
  }): Promise<string[]>;

  stream(input: StreamInput): AsyncGenerator<StreamEvent>;

  validateKey(input: {
    apiKey: string;
    baseUrl?: string;
    signal: AbortSignal;
  }): Promise<{ ok: boolean; reason?: string }>;
}
