import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createProject, projectToJson } from "@gamekit/schema";
import { AgentAuditLogger } from "@gamekit/agent";
import { startEditorServer, type EditorServerHandle } from "../src/server.js";

let root: string;
let server: EditorServerHandle;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-cli-audit-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  await mkdir(join(gk, "agent"), { recursive: true });
  await writeFile(join(gk, "project.json"), projectToJson(createProject("AuditTest")));
  server = await startEditorServer({ root, port: 0 });
});

afterEach(async () => {
  await server.close();
  await rm(root, { recursive: true, force: true });
});

describe("Agent Audit API & Logger", () => {
  it("serves empty audit logs when none recorded", async () => {
    const res = await fetch(`${server.url}/api/agent/audit`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: unknown[]; total: number };
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("serves recorded audit entries and filters via query params", async () => {
    const logger = new AgentAuditLogger(root);
    await logger.append({
      tool: "get_scene",
      args: { scenePath: "main.scene.json" },
      status: "ok",
      sceneId: "main",
      durationMs: 12,
    });
    await logger.append({
      tool: "add_entity",
      args: { name: "Hero" },
      status: "ok",
      sceneId: "main",
      durationMs: 35,
    });
    await logger.append({
      tool: "delete_scene",
      args: { scenePath: "extra.scene.json" },
      status: "denied",
      sceneId: "extra",
      durationMs: 0,
    });

    // Query all
    const resAll = await fetch(`${server.url}/api/agent/audit`);
    expect(resAll.status).toBe(200);
    const bodyAll = (await resAll.json()) as {
      entries: Array<{ tool: string; status: string }>;
      total: number;
    };
    expect(bodyAll.total).toBe(3);
    expect(bodyAll.entries[0].tool).toBe("delete_scene");

    // Filter by tool
    const resTool = await fetch(`${server.url}/api/agent/audit?tool=get_scene`);
    const bodyTool = (await resTool.json()) as { entries: Array<{ tool: string }>; total: number };
    expect(bodyTool.total).toBe(1);
    expect(bodyTool.entries[0].tool).toBe("get_scene");

    // Filter by status
    const resStatus = await fetch(`${server.url}/api/agent/audit?status=denied`);
    const bodyStatus = (await resStatus.json()) as {
      entries: Array<{ status: string }>;
      total: number;
    };
    expect(bodyStatus.total).toBe(1);
    expect(bodyStatus.entries[0].status).toBe("denied");

    // Limit
    const resLimit = await fetch(`${server.url}/api/agent/audit?limit=2`);
    const bodyLimit = (await resLimit.json()) as { entries: unknown[]; total: number };
    expect(bodyLimit.total).toBe(2);
  });

  it("clears audit logs via DELETE /api/agent/audit", async () => {
    const logger = new AgentAuditLogger(root);
    await logger.append({ tool: "get_scene", args: {}, status: "ok" });

    const deleteRes = await fetch(`${server.url}/api/agent/audit`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);

    const getRes = await fetch(`${server.url}/api/agent/audit`);
    const body = (await getRes.json()) as { entries: unknown[]; total: number };
    expect(body.total).toBe(0);
  });
});
