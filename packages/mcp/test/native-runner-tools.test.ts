import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let root: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-native-runner-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  await writeFile(
    join(root, "gamekit", "project.json"),
    projectToJson(createProject("Native Runner Test"))
  );
  await writeFile(
    join(root, "gamekit", "scenes", "main.scene.json"),
    sceneToJson(createEmptyScene("Main"))
  );
  server = createMcpServer(root);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

function tool(name: string) {
  return (server as any)._registeredTools[name];
}

describe("MCP native runner tools", () => {
  it("inspects initial native runner status", async () => {
    const result = await tool("get_native_runner_status").handler({});
    const state = JSON.parse(result.content[0].text);
    expect(state).toHaveProperty("status");
    expect(state).toHaveProperty("running");
    expect(state).toHaveProperty("logs");
    expect(Array.isArray(state.logs)).toBe(true);
  });

  it("launches native runner and synchronizes project files", async () => {
    const result = await tool("launch_native_game").handler({});
    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.state.status).toBeDefined();

    const statusRes = await tool("get_native_runner_status").handler({});
    const state = JSON.parse(statusRes.content[0].text);
    expect(state.logs.some((l: string) => l.includes("NativeRunner") || l.includes("gradlew"))).toBe(true);
  });

  it("stops native runner cleanly", async () => {
    const result = await tool("stop_native_game").handler({});
    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.state.running).toBe(false);
  });
});
