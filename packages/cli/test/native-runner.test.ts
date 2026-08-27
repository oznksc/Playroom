import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createProject, createEmptyScene, projectToJson, sceneToJson } from "@gamekit/schema";
import { NativeRunnerManager } from "../src/native-runner.js";
import { startEditorServer, type EditorServerHandle } from "../src/server.js";

let root: string;
let server: EditorServerHandle;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-cli-native-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  await writeFile(join(gk, "project.json"), projectToJson(createProject("NativePlayTest")));
  await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("main")));
  server = await startEditorServer({ root, port: 0 });
});

afterEach(async () => {
  await server.close();
  await rm(root, { recursive: true, force: true });
});

describe("Native Runner & IPC", () => {
  it("initializes NativeRunnerManager with idle state", () => {
    const manager = new NativeRunnerManager();
    const state = manager.getState();
    expect(state.running).toBe(false);
    expect(state.status).toBe("idle");
    expect(state.logs).toEqual([]);
  });

  it("syncs and bootstraps libGDX project under .playroom/native", async () => {
    const manager = new NativeRunnerManager();
    const nativeDir = await manager.syncProjectToNative(root);

    expect(existsSync(join(nativeDir, "build.gradle"))).toBe(true);
    expect(existsSync(join(nativeDir, "settings.gradle"))).toBe(true);
    expect(existsSync(join(nativeDir, "core", "build.gradle"))).toBe(true);
    expect(existsSync(join(nativeDir, "lwjgl3", "build.gradle"))).toBe(true);
    expect(existsSync(join(nativeDir, "assets", "gamekit", "project.json"))).toBe(true);
    expect(existsSync(join(nativeDir, "assets", "gamekit", "scenes", "main.scene.json"))).toBe(true);

    // Test incremental update
    const updatedScene = createEmptyScene("main");
    updatedScene.name = "Updated Title";
    await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(updatedScene));

    await manager.syncProjectToNative(root);
    const syncedSceneRaw = await readFile(join(nativeDir, "assets", "gamekit", "scenes", "main.scene.json"), "utf8");
    const syncedScene = JSON.parse(syncedSceneRaw);
    expect(syncedScene.name).toBe("Updated Title");
  });

  it("serves native status via GET /api/native/status", async () => {
    const res = await fetch(`${server.url}/api/native/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; state: { running: boolean; status: string } };
    expect(body.ok).toBe(true);
    expect(body.state.running).toBe(false);
    expect(["idle", "stopped"]).toContain(body.state.status);
  });

  it("safely handles stop via POST /api/native/stop", async () => {
    const res = await fetch(`${server.url}/api/native/stop`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; state: { running: boolean } };
    expect(body.ok).toBe(true);
    expect(body.state.running).toBe(false);
  });
});
