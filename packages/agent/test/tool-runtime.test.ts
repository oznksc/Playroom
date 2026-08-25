import { describe, expect, it } from "vitest";
import {
  ToolCallCache,
  InspectSpinTracker,
  compactText,
  fingerprint,
  isReadOnlyTool,
  isMutationTool,
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

  it("invalidates cached scene queries when a mutation tool runs", () => {
    const cache = new ToolCallCache();
    const readKey = fingerprint("get_scene", { scenePath: "main.scene.json" });
    const listKey = fingerprint("list_entities", { scenePath: "main.scene.json" });
    const recipeKey = fingerprint("describe_recipe", { recipeId: "coin-pickup" });

    cache.record(readKey, { content: { entities: [] }, text: "{}", isError: false });
    cache.record(listKey, { content: { entities: [] }, text: "[]", isError: false });
    cache.record(recipeKey, { content: { id: "coin-pickup" }, text: "{}", isError: false });

    // Mutation tool executes
    const invalidated = cache.invalidateOnMutation("add_entity", { name: "Coin" });
    expect(invalidated).toBeGreaterThanOrEqual(2);

    // Scene reads are invalidated (miss again)
    expect(cache.skipReason(readKey)).toBeNull();
    expect(cache.skipReason(listKey)).toBeNull();

    const stats = cache.getStats();
    expect(stats.misses).toBeGreaterThan(0);
  });
});

describe("InspectSpinTracker", () => {
  it("tracks consecutive read turns and resets on mutation", () => {
    const tracker = new InspectSpinTracker();

    // Turn 1: read
    const t1 = tracker.recordTurn([{ name: "get_scene", args: {} }]);
    expect(t1.consecutiveReadTurns).toBe(1);
    expect(t1.intervention).toBe("none");

    // Turn 2: read
    const t2 = tracker.recordTurn([{ name: "list_entities", args: {} }]);
    expect(t2.consecutiveReadTurns).toBe(2);
    expect(t2.intervention).toBe("none");

    // Turn 3: read -> soft nudge
    const t3 = tracker.recordTurn([{ name: "inspect_layout", args: {} }]);
    expect(t3.consecutiveReadTurns).toBe(3);
    expect(t3.intervention).toBe("nudge");
    expect(t3.message).toBeDefined();

    // Turn 4: read -> strict directive
    const t4 = tracker.recordTurn([{ name: "get_game_rules", args: {} }]);
    expect(t4.consecutiveReadTurns).toBe(4);
    expect(t4.intervention).toBe("directive");

    // Turn 5: mutation -> resets consecutive count
    const t5 = tracker.recordTurn([{ name: "add_entity", args: { name: "Box" } }]);
    expect(t5.consecutiveReadTurns).toBe(0);
    expect(t5.intervention).toBe("none");
  });

  it("triggers circuit breaker on 5 consecutive reads", () => {
    const tracker = new InspectSpinTracker();
    for (let i = 0; i < 4; i++) {
      tracker.recordTurn([{ name: `get_item_${i}`, args: {} }]);
    }
    const t5 = tracker.recordTurn([{ name: "get_item_5", args: {} }]);
    expect(t5.consecutiveReadTurns).toBe(5);
    expect(t5.intervention).toBe("circuit_breaker");
    expect(t5.haltReads).toBe(true);
  });

  it("detects repeating tool call cycles", () => {
    const tracker = new InspectSpinTracker();
    // Repeating ABAB cycle
    tracker.recordTurn([{ name: "get_scene", args: { p: 1 } }]);
    tracker.recordTurn([{ name: "inspect_layout", args: { p: 1 } }]);
    tracker.recordTurn([{ name: "get_scene", args: { p: 1 } }]);
    const res = tracker.recordTurn([{ name: "inspect_layout", args: { p: 1 } }]);
    expect(res.intervention).toBe("circuit_breaker");
    expect(res.haltReads).toBe(true);
  });
});

describe("classifiers", () => {
  it("marks list/get tools read-only and mutation tools properly", () => {
    expect(isReadOnlyTool("list_entities")).toBe(true);
    expect(isReadOnlyTool("get_scene_settings")).toBe(true);
    expect(isReadOnlyTool("get_audit_log")).toBe(true);
    expect(isReadOnlyTool("query_audit_log")).toBe(true);
    expect(isMutationTool("spawn_role")).toBe(true);
    expect(isMutationTool("add_entity")).toBe(true);
    expect(isMutationTool("set_gravity")).toBe(true);
  });

  it("detects transient provider errors", () => {
    expect(isTransientProviderError(new Error("429 rate limit"))).toBe(true);
    expect(isTransientProviderError(new Error("overloaded"))).toBe(true);
    expect(isTransientProviderError(new Error("invalid api key"))).toBe(false);
  });
});
