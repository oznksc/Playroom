import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { AgentAuditLogger } from "../src/audit/logger.js";

describe("AgentAuditLogger", () => {
  let tempDir: string;
  let logger: AgentAuditLogger;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gamekit-audit-test-"));
    logger = new AgentAuditLogger(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("appends and queries audit entries with default fields", async () => {
    const entry1 = await logger.append({
      tool: "get_scene",
      args: { scenePath: "main.scene.json" },
      status: "ok",
      durationMs: 15,
      sceneId: "main",
    });

    expect(entry1.id).toBeDefined();
    expect(entry1.timestamp).toBeGreaterThan(0);
    expect(entry1.isoTime).toBeDefined();
    expect(entry1.tool).toBe("get_scene");
    expect(entry1.status).toBe("ok");

    const entry2 = await logger.append({
      tool: "add_entity",
      args: { name: "Player" },
      status: "ok",
      durationMs: 40,
      sceneId: "main",
    });

    const entries = await logger.query();
    expect(entries).toHaveLength(2);
    // Newest first
    expect(entries[0].tool).toBe("add_entity");
    expect(entries[1].tool).toBe("get_scene");
  });

  it("filters entries by tool, sceneId, and status", async () => {
    await logger.append({ tool: "get_scene", args: {}, status: "ok", sceneId: "main" });
    await logger.append({ tool: "delete_scene", args: {}, status: "denied", sceneId: "boss" });
    await logger.append({ tool: "add_entity", args: {}, status: "error", error: "Failed", sceneId: "main" });
    await logger.append({ tool: "get_scene", args: {}, status: "cached", cached: true, sceneId: "boss" });

    const sceneMain = await logger.query({ sceneId: "main" });
    expect(sceneMain).toHaveLength(2);

    const denied = await logger.query({ status: "denied" });
    expect(denied).toHaveLength(1);
    expect(denied[0].tool).toBe("delete_scene");

    const getSceneTools = await logger.query({ tool: "get_scene" });
    expect(getSceneTools).toHaveLength(2);

    const limited = await logger.query({ limit: 1 });
    expect(limited).toHaveLength(1);
    expect(limited[0].tool).toBe("get_scene");
    expect(limited[0].status).toBe("cached");
  });

  it("prunes old entries beyond max limit", async () => {
    for (let i = 0; i < 15; i++) {
      await logger.append({ tool: "test_tool", args: { index: i }, status: "ok" });
    }

    const before = await logger.query();
    expect(before).toHaveLength(15);

    const prunedCount = await logger.prune(5);
    expect(prunedCount).toBe(10);

    const after = await logger.query();
    expect(after).toHaveLength(5);
    // Kept the most recent 5 entries (index 14 down to 10)
    expect((after[0].args as { index: number }).index).toBe(14);
    expect((after[4].args as { index: number }).index).toBe(10);
  });

  it("clears audit log cleanly", async () => {
    await logger.append({ tool: "get_scene", args: {}, status: "ok" });
    expect(await logger.query()).toHaveLength(1);

    await logger.clear();
    expect(await logger.query()).toHaveLength(0);
  });
});
