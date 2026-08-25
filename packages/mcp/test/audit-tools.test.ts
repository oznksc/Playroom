import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createProject, projectToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-audit-test-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  const agentDir = join(gkDir, "agent");
  await mkdir(agentDir, { recursive: true });

  const project = createProject("Audit MCP Project");
  await writeFile(join(gkDir, "project.json"), projectToJson(project));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("audit tools in MCP", () => {
  it("returns empty entries when no audit logs exist", async () => {
    const tool = (server as any)._registeredTools.get_audit_log;
    expect(tool).toBeDefined();

    const result = await tool.handler({});
    const body = JSON.parse(result.content[0].text);
    expect(body.total).toBe(0);
    expect(body.entries).toEqual([]);
  });

  it("queries recorded audit log entries with filters", async () => {
    const auditFile = join(tmpDir, "gamekit", "agent", "audit.jsonl");
    const log1 = {
      id: "entry-1",
      timestamp: 1000,
      isoTime: "2026-08-25T10:00:00.000Z",
      tool: "get_scene",
      args: { scenePath: "main.scene.json" },
      status: "ok",
      sceneId: "main",
      durationMs: 10,
    };
    const log2 = {
      id: "entry-2",
      timestamp: 2000,
      isoTime: "2026-08-25T10:00:05.000Z",
      tool: "add_entity",
      args: { name: "Player" },
      status: "ok",
      sceneId: "main",
      durationMs: 25,
    };
    const log3 = {
      id: "entry-3",
      timestamp: 3000,
      isoTime: "2026-08-25T10:00:10.000Z",
      tool: "delete_scene",
      args: { scenePath: "level2.scene.json" },
      status: "denied",
      sceneId: "level2",
      durationMs: 0,
    };

    await writeFile(auditFile, `${JSON.stringify(log1)}\n${JSON.stringify(log2)}\n${JSON.stringify(log3)}\n`);

    const tool = (server as any)._registeredTools.get_audit_log;

    // All entries (newest first)
    const resAll = await tool.handler({});
    const bodyAll = JSON.parse(resAll.content[0].text);
    expect(bodyAll.total).toBe(3);
    expect(bodyAll.entries[0].tool).toBe("delete_scene");

    // Filter by tool
    const resTool = await tool.handler({ tool: "add_entity" });
    const bodyTool = JSON.parse(resTool.content[0].text);
    expect(bodyTool.total).toBe(1);
    expect(bodyTool.entries[0].tool).toBe("add_entity");

    // Filter by status
    const resStatus = await tool.handler({ status: "denied" });
    const bodyStatus = JSON.parse(resStatus.content[0].text);
    expect(bodyStatus.total).toBe(1);
    expect(bodyStatus.entries[0].status).toBe("denied");

    // Limit
    const resLimit = await tool.handler({ limit: 1 });
    const bodyLimit = JSON.parse(resLimit.content[0].text);
    expect(bodyLimit.total).toBe(1);
    expect(bodyLimit.entries[0].id).toBe("entry-3");
  });
});
