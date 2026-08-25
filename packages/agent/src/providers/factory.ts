import { AnthropicAdapter } from "./anthropic.js";
import { GoogleAdapter } from "./google.js";
import { LmStudioAdapter } from "./lmstudio.js";
import { OllamaAdapter } from "./ollama.js";
import { OpenAIAdapter } from "./openai.js";
import { OpenRouterAdapter } from "./openrouter.js";
import type { ProviderAdapter, ProviderId } from "./types.js";

export type ProviderCatalogEntry = {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  defaultModel: string;
  supported: true;
  hint: string;
};

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: "anthropic",
    label: "Anthropic Claude",
    defaultBaseUrl: "https://api.anthropic.com",
    requiresApiKey: true,
    defaultModel: "claude-sonnet-4-5",
    supported: true,
    hint: "Best at long tool loops for scene building.",
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    defaultModel: "gpt-4o",
    supported: true,
    hint: "GPT-4o and GPT-5. Uses the Chat Completions API.",
  },
  {
    id: "xai",
    label: "xAI Grok",
    defaultBaseUrl: "https://api.x.ai/v1",
    requiresApiKey: true,
    defaultModel: "grok-4",
    supported: true,
    hint: "OpenAI-compatible API. Create a key at console.x.ai.",
  },
  {
    id: "google",
    label: "Google AI",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    requiresApiKey: true,
    defaultModel: "gemini-2.0-flash",
    supported: true,
    hint: "Gemini via the OpenAI-compatible endpoint.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    defaultModel: "anthropic/claude-sonnet-4.5",
    supported: true,
    hint: "One key for many models. Set the model id from OpenRouter.",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    defaultBaseUrl: "http://localhost:11434",
    requiresApiKey: false,
    defaultModel: "llama3.1:8b",
    supported: true,
    hint: "Run ollama serve. No API key.",
  },
  {
    id: "lmstudio",
    label: "LM Studio (local)",
    defaultBaseUrl: "http://127.0.0.1:1234",
    requiresApiKey: false,
    defaultModel: "local-model",
    supported: true,
    hint: "Start the local server in LM Studio. No API key.",
  },
];

export function createProvider(id: string): ProviderAdapter | null {
  switch (id) {
    case "lmstudio":
      return new LmStudioAdapter();
    case "openrouter":
      return new OpenRouterAdapter();
    case "openai":
      return new OpenAIAdapter();
    case "xai":
      return new OpenAIAdapter("xai", "xAI Grok", "https://api.x.ai/v1");
    case "google":
      return new GoogleAdapter();
    case "ollama":
      return new OllamaAdapter();
    case "anthropic":
      return new AnthropicAdapter();
    default:
      return null;
  }
}

export function defaultModelFor(id: string): string {
  return PROVIDER_CATALOG.find((p) => p.id === id)?.defaultModel ?? "claude-sonnet-4-5";
}
