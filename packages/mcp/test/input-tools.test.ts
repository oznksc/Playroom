import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

function tool(name: string): { handler: (args: any) => Promise<any> } {
  const registered = (server as any)._registeredTools[name];
  if (!registered) throw new Error(`Tool not registered: ${name}`);
  return registered;
}

async function call(name: string, args: any = {}): Promise<any> {
  const result = await tool(name).handler(args);
  return { result, data: JSON.parse(result.content[0].text) };
}

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-input-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });

  await writeFile(join(gkDir, "project.json"), projectToJson(createProject("Test Project")));
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("input tool handlers", () => {
  it("defines a new input action binding", async () => {
    const { data } = await call("define_input_action", {
      scenePath: "main.scene.json",
      action: "fire",
      keys: ["Space", "Enter"],
    });
    expect(data.success).toBe(true);
    expect(data.action).toBe("fire");
    expect(data.binding.keys).toEqual(["Space", "Enter"]);
  });

  it("adds touchControl to a binding", async () => {
    const { data } = await call("define_input_action", {
      scenePath: "main.scene.json",
      action: "jump",
      keys: ["Space", "w", "W"],
      touchControl: "jump",
    });
    expect(data.binding.touchControl).toBe("jump");
  });

  it("reads input map defaults from a scene", async () => {
    const { data } = await call("get_input_map", {
      scenePath: "main.scene.json",
    });
    expect(data.inputMap).toBeDefined();
    expect(data.inputMap.bindings).toBeDefined();
    expect(data.inputMap.bindings.length).toBeGreaterThanOrEqual(3);
  });

  it("returns defined input map after define_input_action", async () => {
    await call("define_input_action", {
      scenePath: "main.scene.json",
      action: "fire",
      keys: ["Space"],
    });
    const { data } = await call("get_input_map", {
      scenePath: "main.scene.json",
    });
    expect(data.inputMap.bindings.some((b: any) => b.action === "fire")).toBe(true);
  });
});
