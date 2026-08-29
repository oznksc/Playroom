import { createServer } from "node:http";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";
import { parseAdbDevices, parseAvdList } from "../src/libgdx/adb.js";
import { parseSimctlJson } from "../src/libgdx/simctl.js";
import { setLibgdxExec, type ExecResult } from "../src/libgdx/exec.js";
import { setLibgdxFetch } from "../src/libgdx/debug-client.js";
import { resolveLibgdxRoot } from "../src/libgdx/paths.js";

let root: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-libgdx-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  await writeFile(join(root, "gamekit", "project.json"), projectToJson(createProject("LibGDX MCP")));
  await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
  server = createMcpServer(root);
});

afterEach(async () => {
  setLibgdxExec(null);
  setLibgdxFetch(null);
  await rm(root, { recursive: true, force: true });
});

function tool(name: string) {
  return (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown) => Promise<{ content: Array<{ text: string }>; isError?: boolean }> }> })._registeredTools[name];
}

function json(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe("libGDX MCP registration", () => {
  it("registers gradle, live-runtime, android, and ios tools without colliding with remove_entity", async () => {
    const names = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools
    );
    const required = [
      "libgdx_capabilities",
      "project_info",
      "build",
      "compile",
      "test",
      "dependencies",
      "clean",
      "run",
      "stop",
      "restart",
      "pause",
      "step_frame",
      "inspect_world",
      "inspect_entity",
      "spawn_entity",
      "despawn_entity",
      "set_component",
      "get_fps",
      "get_frame_time",
      "get_draw_calls",
      "get_triangles",
      "list_shaders",
      "reload_shader",
      "set_render_mode",
      "capture_frame",
      "set_camera",
      "list_android_devices",
      "build_android",
      "deploy_android",
      "run_android",
      "list_ios_devices",
      "build_ios",
      "deploy_ios",
      "capture_device_screen",
      "get_device_logs",
      "remove_entity",
    ];
    for (const name of required) {
      expect(names, name).toContain(name);
    }
    expect(tool("remove_entity")).toBeTruthy();
    expect(tool("despawn_entity")).toBeTruthy();
  });
});

describe("adb / simctl parsers", () => {
  it("parses adb devices -l", () => {
    const devices = parseAdbDevices(`List of devices attached
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:1
R58Mxxx                device usb:1-1 product:star2qltexx model:SM_G965F
`);
    expect(devices).toHaveLength(2);
    expect(devices[0].emulator).toBe(true);
    expect(devices[0].serial).toBe("emulator-5554");
    expect(devices[1].model).toBe("SM_G965F");
    expect(devices[1].emulator).toBe(false);
  });

  it("parses emulator -list-avds", () => {
    expect(parseAvdList("Pixel_7_API_34\nMedium_Phone\n")).toEqual(["Pixel_7_API_34", "Medium_Phone"]);
  });

  it("parses simctl list json", () => {
    const devices = parseSimctlJson(
      JSON.stringify({
        devices: {
          "com.apple.CoreSimulator.SimRuntime.iOS-18-0": [
            { udid: "AAA", name: "iPhone 16", state: "Booted", isAvailable: true },
          ],
        },
      })
    );
    expect(devices[0]).toMatchObject({ udid: "AAA", name: "iPhone 16", state: "Booted" });
  });
});

describe("debug HTTP client", () => {
  it("talks to a mock debug agent via inspect_world", async () => {
    const http = createServer((req, res) => {
      const url = req.url ?? "/";
      res.setHeader("Content-Type", "application/json");
      if (url.startsWith("/world")) {
        res.end(JSON.stringify({ ok: true, world: { name: "Main", entityCount: 2 } }));
        return;
      }
      if (url.startsWith("/health")) {
        res.end(JSON.stringify({ ok: true, health: { fps: 60 } }));
        return;
      }
      if (url.startsWith("/control") && req.method === "POST") {
        res.end(JSON.stringify({ ok: true, action: "pause", paused: true }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: url }));
    });
    await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
    const addr = http.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    process.env.PLAYROOM_LIBGDX_DEBUG_URL = `http://127.0.0.1:${port}`;
    try {
      const world = json(await tool("inspect_world").handler({}));
      expect(world.ok).toBe(true);
      expect(world.data.world.entityCount).toBe(2);

      const paused = json(await tool("pause").handler({}));
      expect(paused.ok).toBe(true);
      expect(paused.data.paused).toBe(true);
    } finally {
      delete process.env.PLAYROOM_LIBGDX_DEBUG_URL;
      await new Promise<void>((resolve) => http.close(() => resolve()));
    }
  });

  it("returns a detailed error when the debug agent is down", async () => {
    process.env.PLAYROOM_LIBGDX_DEBUG_URL = "http://127.0.0.1:1";
    try {
      const result = json(await tool("get_fps").handler({}));
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/not reachable/);
      expect(result.hint).toMatch(/run/);
      expect(result.diagnostics.url).toContain("127.0.0.1:1");
    } finally {
      delete process.env.PLAYROOM_LIBGDX_DEBUG_URL;
    }
  });
});

describe("gradle tools with mocked exec", () => {
  it("project_info reports missing gradle root without throwing", async () => {
    const body = json(await tool("project_info").handler({}));
    expect(body.libgdx.root).toBeNull();
    expect(body.libgdx.candidates.length).toBeGreaterThan(0);
    expect(body.android.applicationId).toBe("com.playroom.game");
  });

  it("build runs gradlew when a fake project exists", async () => {
    const gradleRoot = join(root, ".playroom", "native");
    await mkdir(gradleRoot, { recursive: true });
    await writeFile(join(gradleRoot, "settings.gradle"), "include 'core', 'lwjgl3', 'android'\n");
    await writeFile(join(gradleRoot, "gradlew"), "#!/bin/sh\nexit 0\n");
    await writeFile(join(gradleRoot, "gradle.properties"), "gdxVersion=1.13.1\n");

    setLibgdxExec(async (command, args, options) => {
      const result: ExecResult = {
        command,
        args,
        cwd: options?.cwd,
        code: 0,
        stdout: `BUILD SUCCESSFUL ${args.join(" ")}`,
        stderr: "",
        timedOut: false,
        durationMs: 12,
      };
      return result;
    });

    const info = await resolveLibgdxRoot(root);
    expect(info.root).toBe(gradleRoot);
    expect(info.hasAndroid).toBe(true);

    const built = json(await tool("build").handler({}));
    expect(built.ok).toBe(true);
    expect(built.args).toContain("build");
    expect(built.stdout).toMatch(/BUILD SUCCESSFUL/);
  });

  it("build_ios reports the missing ios module as a structured gap", async () => {
    const gradleRoot = join(root, ".playroom", "native");
    await mkdir(gradleRoot, { recursive: true });
    await writeFile(join(gradleRoot, "settings.gradle"), "include 'core', 'lwjgl3', 'android'\n");
    await writeFile(join(gradleRoot, "gradlew"), "#!/bin/sh\nexit 0\n");
    const body = json(await tool("build_ios").handler({}));
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/No ios Gradle module/);
    expect(body.howToAdd.length).toBeGreaterThan(0);
  });

  it("list_android_devices uses mocked adb output", async () => {
    setLibgdxExec(async (command, args) => ({
      command,
      args,
      code: 0,
      stdout:
        command.includes("adb") || args.includes("devices")
          ? "List of devices attached\nemulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64\n"
          : "/usr/bin/adb\n",
      stderr: "",
      timedOut: false,
      durationMs: 1,
    }));
    const body = json(await tool("list_android_devices").handler({}));
    expect(body.ok).toBe(true);
    expect(body.devices[0].serial).toBe("emulator-5554");
  });
});

describe("libgdx_capabilities catalog", () => {
  it("documents hex/H3 as out of scope and remove_entity collision", async () => {
    const body = json(await tool("libgdx_capabilities").handler({}));
    expect(body.catalog.notInRuntime.hexTerritory).toContain("create_hex");
    expect(body.catalog.collisions.remove_entity).toMatch(/despawn_entity/);
    expect(body.catalog.groups.android).toContain("run_android");
  });
});
