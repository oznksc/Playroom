import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createLevel, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let root: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-persistence-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  const project = createProject("Persistence Test");
  project.scenes = ["main.scene.json"];
  project.levels = [createLevel("First", 0), createLevel("Second", 1)];
  await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));
  await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
  server = createMcpServer(root);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

function tool(name: string) {
  return (server as any)._registeredTools[name];
}

describe("persistence and doctor tool handlers", () => {
  it("persists variables through a save/load slot", async () => {
    await tool("set_persistent_var").handler({ key: "coins", value: 42 });
    const saved = await tool("save_game").handler({ slotName: "slot-1" });
    expect(JSON.parse(saved.content[0].text).success).toBe(true);
    await tool("set_persistent_var").handler({ key: "coins", value: 0 });
    await tool("load_game").handler({ slotName: "slot-1" });
    const loaded = await tool("get_persistent_var").handler({ key: "coins" });
    expect(JSON.parse(loaded.content[0].text).value).toBe(42);
  });

  it("reports missing project assets through doctor", async () => {
    const projectPath = join(root, "gamekit", "project.json");
    const project = JSON.parse(await (await import("node:fs/promises")).readFile(projectPath, "utf8"));
    project.assets.push({ id: "missing", file: "missing.png", kind: "image" });
    await writeFile(projectPath, JSON.stringify(project, null, 2));
    const result = await tool("run_doctor").handler({ includeInfo: false });
    const report = JSON.parse(result.content[0].text);
    expect(report.ok).toBe(false);
    expect(report.issues.some((issue: { code: string }) => issue.code === "ASSET_FILE_MISSING")).toBe(true);
  });
});
