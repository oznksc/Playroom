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
  tmpDir = join(tmpdir(), `gamekit-mcp-scene-asset-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });

  const project = createProject("Test Project");
  project.scenes = ["main.scene.json"];
  await writeFile(join(gkDir, "project.json"), projectToJson(project));
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("scene tool handlers", () => {
  it("lists scenes", async () => {
    const { data } = await call("list_scenes");
    expect(data).toContain("main.scene.json");
  });

  it("creates a scene and registers it in the project", async () => {
    const { data } = await call("create_scene", { name: "Level 1", orientation: "landscape" });
    expect(data.filename).toBe("level-1.scene.json");
    expect(data.scene.viewport.width).toBe(844);

    const { data: scenes } = await call("list_scenes");
    expect(scenes).toContain("level-1.scene.json");
  });

  it("creates a portrait scene with swapped viewport", async () => {
    const { data } = await call("create_scene", { name: "Portrait", orientation: "portrait" });
    expect(data.scene.viewport.width).toBe(390);
    expect(data.scene.viewport.height).toBe(844);
  });

  it("deletes a scene and removes it from the project", async () => {
    await call("create_scene", { name: "Temp", orientation: "landscape" });
    const { data } = await call("delete_scene", { path: "temp.scene.json" });
    expect(data.success).toBe(true);

    const { data: scenes } = await call("list_scenes");
    expect(scenes).not.toContain("temp.scene.json");
  });

  it("activates a scene via load_scene and reports it in get_active_scene", async () => {
    await call("create_scene", { name: "Level 2", orientation: "landscape" });
    const { data: load } = await call("load_scene", {
      scenePath: "level-2.scene.json",
      transition: "fade",
    });
    expect(load.success).toBe(true);
    expect(load.activeScene).toBe("level-2.scene.json");
    expect(load.transition.type).toBe("fade");
    expect(load.transition.duration).toBe(0.3);

    const { data: active } = await call("get_active_scene");
    expect(active.activeScene).toBe("level-2.scene.json");
  });

  it("registers a scene transition preset", async () => {
    const { data } = await call("define_scene_transition", {
      id: "to-boss",
      name: "To Boss",
      toSceneId: "boss.scene.json",
      type: "slide",
      duration: 0.5,
    });
    expect(data.success).toBe(true);
    expect(data.transition.type).toBe("slide");

    const { data: active } = await call("get_active_scene");
    expect(active.transitions.some((t: any) => t.id === "to-boss")).toBe(true);
  });
});

describe("asset tool handlers", () => {
  it("adds and lists an asset", async () => {
    const { data } = await call("add_asset", { id: "player", file: "player.png", kind: "image" });
    expect(data.success).toBe(true);

    const { data: assets } = await call("list_assets");
    expect(assets.some((a: any) => a.id === "player")).toBe(true);
  });

  it("rejects a duplicate asset id", async () => {
    await call("add_asset", { id: "player", file: "player.png", kind: "image" });
    const { result, data } = await call("add_asset", { id: "player", file: "other.png", kind: "image" });
    expect(result.isError).toBe(true);
    expect(data.error).toContain("already exists");
  });

  it("removes an asset", async () => {
    await call("add_asset", { id: "coin", file: "coin.png", kind: "image" });
    const { data } = await call("remove_asset", { id: "coin" });
    expect(data.success).toBe(true);

    const { data: assets } = await call("list_assets");
    expect(assets.some((a: any) => a.id === "coin")).toBe(false);
  });

  it("returns an error removing a missing asset", async () => {
    const { result, data } = await call("remove_asset", { id: "ghost" });
    expect(result.isError).toBe(true);
    expect(data.error).toContain("not found");
  });

  it("rejects unsupported audio extensions in import_audio", async () => {
    const { result, data } = await call("import_audio", {
      id: "boom",
      sourcePath: "/tmp/boom.flac",
    });
    expect(result.isError).toBe(true);
    expect(data.error).toContain("Unsupported audio extension");
  });
});
