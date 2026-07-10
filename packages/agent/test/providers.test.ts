import { describe, expect, it, vi, beforeEach } from "vitest";
import { OpenAIAdapter } from "../src/providers/openai.js";
import { OllamaAdapter } from "../src/providers/ollama.js";
import { GoogleAdapter } from "../src/providers/google.js";

describe("agent provider adapters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("OpenAIAdapter listModels returns list of models on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "gpt-4o" }, { id: "gpt-4-turbo" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const adapter = new OpenAIAdapter();
    const models = await adapter.listModels({ apiKey: "test-key", signal: new AbortController().signal });
    expect(models).toEqual(["gpt-4o", "gpt-4-turbo"]);
    expect(mockFetch).toHaveBeenCalledWith("https://api.openai.com/v1/models", expect.any(Object));
  });

  it("OpenAIAdapter validateKey returns ok on HTTP 200", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal("fetch", mockFetch);

    const adapter = new OpenAIAdapter();
    const result = await adapter.validateKey({ apiKey: "test-key", signal: new AbortController().signal });
    expect(result).toEqual({ ok: true });
  });

  it("OllamaAdapter listModels fetches local tags and maps names", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: "llama3.1:8b" }, { name: "mistral" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const adapter = new OllamaAdapter();
    const models = await adapter.listModels({ apiKey: "", signal: new AbortController().signal });
    expect(models).toEqual(["llama3.1:8b", "mistral"]);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/tags", expect.any(Object));
  });

  it("OllamaAdapter validateKey always returns ok: true", async () => {
    const adapter = new OllamaAdapter();
    const result = await adapter.validateKey({ apiKey: "", signal: new AbortController().signal });
    expect(result).toEqual({ ok: true });
  });

  it("GoogleAdapter listModels falls back to default models on failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
    });
    vi.stubGlobal("fetch", mockFetch);

    const adapter = new GoogleAdapter();
    const models = await adapter.listModels({ apiKey: "test-key", signal: new AbortController().signal });
    expect(models).toContain("gemini-2.0-flash");
    expect(models).toContain("gemini-1.5-pro");
  });
});
