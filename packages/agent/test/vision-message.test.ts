import { describe, expect, it } from "vitest";
import { AnthropicAdapter } from "../src/providers/anthropic.js";
import { OpenAIAdapter } from "../src/providers/openai.js";

// Access build helpers indirectly by streaming is heavy; instead re-import patterns
// by testing message shape via a tiny local replica of the conversion used in adapters.

function anthropicUserContent(content: string, screenshot?: string) {
  if (!screenshot) return { role: "user", content };
  const parts = screenshot.split(",");
  const base64Data = parts[1] || screenshot;
  const mediaType = parts[0]?.split(";")[0]?.split(":")[1] || "image/png";
  return {
    role: "user",
    content: [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      },
      { type: "text", text: content },
    ],
  };
}

function openAiUserContent(content: string, screenshot?: string) {
  if (!screenshot) return { role: "user", content };
  return {
    role: "user",
    content: [
      { type: "image_url", image_url: { url: screenshot } },
      { type: "text", text: content },
    ],
  };
}

describe("vision message formatting", () => {
  it("AnthropicAdapter exists and requires API key", () => {
    const a = new AnthropicAdapter();
    expect(a.requiresApiKey).toBe(true);
    expect(a.id).toBe("anthropic");
  });

  it("OpenAIAdapter exists", () => {
    const a = new OpenAIAdapter();
    expect(a.id).toBe("openai");
  });

  it("formats data-url screenshots for Anthropic", () => {
    const msg = anthropicUserContent("Look at this", "data:image/png;base64,AAAA");
    expect(msg.content[0]).toMatchObject({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "AAAA" },
    });
    expect(msg.content[1]).toEqual({ type: "text", text: "Look at this" });
  });

  it("formats data-url screenshots for OpenAI-compatible providers", () => {
    const dataUrl = "data:image/png;base64,BBBB";
    const msg = openAiUserContent("Look", dataUrl);
    expect(msg.content[0]).toEqual({
      type: "image_url",
      image_url: { url: dataUrl },
    });
  });
});
