import { describe, expect, it } from "vitest";
import { formatToolDigest, toPriorProviderMessages } from "../src/loop/history.js";

describe("toPriorProviderMessages", () => {
  it("maps editor roles and drops empty turns", () => {
    const out = toPriorProviderMessages([
      { role: "user", content: "Make a platform" },
      { role: "agent", content: "I will spawn platforms." },
      { role: "system", content: "Session undo point: snap_1" },
      { role: "tool", content: "ignored" },
      { role: "agent", content: "   " },
    ]);
    expect(out).toEqual([
      { role: "user", content: "Make a platform" },
      { role: "assistant", content: "I will spawn platforms." },
      { role: "user", content: "[note] Session undo point: snap_1" },
    ]);
  });

  it("keeps only the most recent turns", () => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "agent",
      content: `m${i}`,
    }));
    const out = toPriorProviderMessages(items);
    expect(out).toHaveLength(24);
    expect(out[0].content).toBe("m16");
    expect(out[out.length - 1].content).toBe("m39");
  });
});

describe("formatToolDigest", () => {
  it("summarizes recent tool statuses", () => {
    const text = formatToolDigest([
      { tool: "spawn_role", status: "ok" },
      { tool: "layout_entities", status: "ok" },
    ]);
    expect(text).toContain("spawn_role: ok");
    expect(text).toContain("layout_entities: ok");
  });

  it("returns undefined when empty", () => {
    expect(formatToolDigest([])).toBeUndefined();
    expect(formatToolDigest(undefined)).toBeUndefined();
  });
});
