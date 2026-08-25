import { describe, expect, it } from "vitest";
import {
  ToolCallCache,
  compactText,
  fingerprint,
  isReadOnlyTool,
  isTransientProviderError,
  normalizeToolResult,
} from "../src/loop/tool-runtime.js";

describe("normalizeToolResult", () => {
  it("unwraps MCP text content blocks", () => {
    const result = normalizeToolResult({
      content: [{ type: "text", text: JSON.stringify({ ok: true, id: "hero-1" }) }],
    });
    expect(result.isError).toBe(false);
    expect(result.content).toEqual({ ok: true, id: "hero-1" });
    expect(result.text).toContain("hero-1");
  });

  it("flags isError from the envelope", () => {
    const result = normalizeToolResult({
      content: [{ type: "text", text: '{"error":"nope"}' }],
      isError: true,
    });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual({ error: "nope" });
  });
});

describe("compactText", () => {
  it("truncates long payloads", () => {
    const text = "x".repeat(9000);
    const out = compactText(text);
    expect(out.length).toBeLessThan(text.length);
    expect(out).toContain("truncated");
  });
});

describe("fingerprint + cache", () => {
  it("treats key order as identical", () => {
    expect(fingerprint("spawn_role", { b: 1, a: 2 })).toBe(fingerprint("spawn_role", { a: 2, b: 1 }));
  });

  it("reuses a successful identical call and blocks a twice-failed one", () => {
    const cache = new ToolCallCache();
    const key = fingerprint("list_entities", { scenePath: "main.scene.json" });
    expect(cache.skipReason(key)).toBeNull();
    cache.record(key, { content: { count: 1 }, text: '{"count":1}', isError: false });
    expect(cache.skipReason(key)).toMatch(/already succeeded/i);

    const failKey = fingerprint("add_entity", { name: "x" });
    cache.record(failKey, { content: { error: "bad" }, text: "bad", isError: true });
    expect(cache.skipReason(failKey)).toBeNull();
    cache.record(failKey, { content: { error: "bad" }, text: "bad", isError: true });
    expect(cache.skipReason(failKey)).toMatch(/failed twice/i);
  });
});

describe("classifiers", () => {
  it("marks list/get tools read-only", () => {
    expect(isReadOnlyTool("list_entities")).toBe(true);
    expect(isReadOnlyTool("get_scene_settings")).toBe(true);
    expect(isReadOnlyTool("spawn_role")).toBe(false);
  });

  it("detects transient provider errors", () => {
    expect(isTransientProviderError(new Error("429 rate limit"))).toBe(true);
    expect(isTransientProviderError(new Error("overloaded"))).toBe(true);
    expect(isTransientProviderError(new Error("invalid api key"))).toBe(false);
  });
});
