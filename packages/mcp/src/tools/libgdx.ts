import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { toolJson } from "../utils/result.js";
import { adb, adbPath, emulatorPath, parseAdbDevices, parseAvdList } from "../libgdx/adb.js";
import { LIBGDX_MCP_CATALOG } from "../libgdx/catalog.js";
import { debugRequest } from "../libgdx/debug-client.js";
import { runCommand, spawnDetached, which } from "../libgdx/exec.js";
import {
  ANDROID_ACTIVITY,
  ANDROID_APPLICATION_ID,
  debugBaseUrl,
  gradlewCommand,
  resolveLibgdxRoot,
  type LibgdxRootInfo,
} from "../libgdx/paths.js";
import { parseSimctlJson, simctl } from "../libgdx/simctl.js";
import { getMcpNativeRunner } from "./native-runner.js";

function payload(data: unknown, isError = false) {
  return toolJson(data, isError);
}

async function rootOf(fileIO: FileIO): Promise<LibgdxRootInfo> {
  return resolveLibgdxRoot(fileIO.projectRoot);
}

async function gradle(
  info: LibgdxRootInfo,
  tasks: string[],
  timeoutMs: number
): Promise<Awaited<ReturnType<typeof runCommand>> & { root: string | null }> {
  if (!info.root || !info.hasGradlew) {
    return {
      command: "gradlew",
      args: tasks,
      cwd: info.root ?? undefined,
      code: null,
      stdout: "",
      stderr:
        "No libGDX Gradle project found. Export with `gamekit export --platform libgdx` or `gamekit play --platform libgdx` first.",
      timedOut: false,
      durationMs: 0,
      root: info.root,
    };
  }
  const { command } = gradlewCommand(info.root);
  const result = await runCommand(command, tasks, { cwd: info.root, timeoutMs });
  return { ...result, root: info.root };
}

async function live(
  fileIO: FileIO,
  path: string,
  options?: {
    method?: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    timeoutMs?: number;
  }
) {
  const info = await rootOf(fileIO);
  return debugRequest(path, { ...options, libgdxRoot: info.root, rootInfo: info });
}

export function registerLibgdxTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "libgdx_capabilities",
    "Catalog of every libGDX + emulator MCP tool, the live debug HTTP protocol, Android/iOS gaps, and names that collide with scene-JSON tools.",
    {},
    async () => {
      const info = await rootOf(fileIO);
      const health = await debugRequest("/health", { libgdxRoot: info.root, rootInfo: info, timeoutMs: 1500 });
      return payload({
        catalog: LIBGDX_MCP_CATALOG,
        project: info,
        debugUrl: debugBaseUrl(),
        runtimeConnected: health.ok,
        runtimeHealth: health.data ?? health.error,
        adb: await adbPath(),
        emulator: await emulatorPath(),
        xcrun: process.platform === "darwin" ? await which("xcrun") : null,
      });
    }
  );

  server.tool(
    "project_info",
    "Inspect the libGDX Gradle project: modules, gdx version, Android applicationId, debug port, toolchain paths.",
    {},
    async () => {
      const info = await rootOf(fileIO);
      const health = await debugRequest("/health", { libgdxRoot: info.root, timeoutMs: 1500 });
      let gradleProperties = "";
      if (info.root) {
        try {
          const { readFile } = await import("node:fs/promises");
          gradleProperties = await readFile(join(info.root, "gradle.properties"), "utf8");
        } catch {
          gradleProperties = "";
        }
      }
      return payload({
        ok: info.root !== null,
        libgdx: info,
        gradleProperties,
        android: {
          applicationId: ANDROID_APPLICATION_ID,
          activity: ANDROID_ACTIVITY,
          modulePresent: info.hasAndroid,
        },
        ios: {
          modulePresent: info.hasIos,
          gap: LIBGDX_MCP_CATALOG.iosGap,
        },
        debug: {
          url: debugBaseUrl(),
          connected: health.ok,
          health: health.data ?? health.error,
        },
        nativeRunner: getMcpNativeRunner().getState(),
        toolchains: {
          adb: await adbPath(),
          emulator: await emulatorPath(),
          xcrun: process.platform === "darwin" ? await which("xcrun") : null,
          java: await which("java"),
        },
      });
    }
  );

  const gradleTool = (
    name: string,
    description: string,
    tasks: string[],
    timeoutMs: number
  ) => {
    server.tool(name, description, {
      extraArgs: z.array(z.string()).optional().describe("Additional Gradle arguments"),
    }, async ({ extraArgs }) => {
      const info = await rootOf(fileIO);
      const result = await gradle(info, [...tasks, ...(extraArgs ?? [])], timeoutMs);
      return payload(
        {
          ok: result.code === 0 && !result.timedOut,
          source: info.source,
          ...result,
        },
        result.code !== 0
      );
    });
  };

  gradleTool("build", "Gradle build of the libGDX project (all modules).", ["build"], 180_000);
  gradleTool("compile", "Compile libGDX Java (lwjgl3 classes, skip tests).", ["lwjgl3:compileJava", "-x", "test"], 120_000);
  gradleTool("test", "Run libGDX Gradle tests.", ["test"], 180_000);
  gradleTool("dependencies", "Print Gradle dependency trees.", ["dependencies"], 120_000);
  gradleTool("clean", "Gradle clean of the libGDX project.", ["clean"], 60_000);
  gradleTool("gradle_tasks", "List Gradle tasks.", ["tasks", "--all"], 60_000);

  server.tool(
    "run",
    "Launch the desktop libGDX LWJGL3 game (syncs gamekit assets, sets PLAYROOM_DEBUG_PORT, waits for the debug agent).",
    {
      waitMs: z.number().int().min(0).max(120000).optional().describe("How long to poll /health (default 45000)"),
    },
    async ({ waitMs }) => {
      const runner = getMcpNativeRunner();
      const state = await runner.start(fileIO.projectRoot);
      const deadline = Date.now() + (waitMs ?? 45_000);
      let health = await debugRequest("/health", { timeoutMs: 1500, libgdxRoot: join(fileIO.projectRoot, ".playroom", "native") });
      while (!health.ok && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000));
        health = await debugRequest("/health", { timeoutMs: 1500, libgdxRoot: join(fileIO.projectRoot, ".playroom", "native") });
      }
      return payload({
        ok: state.status === "running" || state.status === "launching",
        runner: state,
        debugUrl: debugBaseUrl(),
        runtimeConnected: health.ok,
        health: health.data ?? health.error,
        hint: health.ok
          ? "Live tools (inspect_world, pause, get_fps, …) are available."
          : "Gradle is starting. Poll get_runtime_status / libgdx_capabilities until /health succeeds. First run downloads Gradle + libGDX and can take minutes.",
      });
    }
  );

  server.tool("stop", "Stop the desktop libGDX process started by run/launch_native_game.", {}, async () => {
    await getMcpNativeRunner().stop();
    return payload({ ok: true, runner: getMcpNativeRunner().getState() });
  });

  server.tool("restart", "Stop then start the desktop libGDX runner.", {}, async () => {
    await getMcpNativeRunner().stop();
    const state = await getMcpNativeRunner().start(fileIO.projectRoot);
    return payload({ ok: true, runner: state, debugUrl: debugBaseUrl() });
  });

  server.tool(
    "pause",
    "Pause live simulation (rendering continues). Requires a running debug agent.",
    {},
    async () => payload(await live(fileIO, "/control", { method: "POST", body: { action: "pause" } }))
  );
  server.tool(
    "resume",
    "Resume live simulation after pause.",
    {},
    async () => payload(await live(fileIO, "/control", { method: "POST", body: { action: "resume" } }))
  );
  server.tool(
    "step_frame",
    "Advance the paused libGDX simulation by N frames.",
    { frames: z.number().int().min(1).max(120).optional() },
    async ({ frames }) =>
      payload(await live(fileIO, "/control", { method: "POST", body: { action: "step", frames: frames ?? 1 } }))
  );
  server.tool(
    "reload_scene",
    "Hot-reload the active scene JSON inside the running libGDX process.",
    {},
    async () => payload(await live(fileIO, "/control", { method: "POST", body: { action: "reload" } }))
  );
  server.tool(
    "get_runtime_status",
    "Debug agent health + native runner process state + last logs.",
    {},
    async () => {
      const info = await rootOf(fileIO);
      const health = await debugRequest("/health", { libgdxRoot: info.root, rootInfo: info, timeoutMs: 2000 });
      return payload({
        runner: getMcpNativeRunner().getState(),
        debugUrl: debugBaseUrl(),
        runtime: health,
      });
    }
  );

  server.tool(
    "inspect_world",
    "Dump the live libGDX scene: viewport, gravity, game rules, every entity (summary or full components).",
    { detail: z.enum(["summary", "full"]).optional() },
    async ({ detail }) => payload(await live(fileIO, "/world", { query: { detail: detail ?? "summary" } }))
  );
  server.tool(
    "inspect_entity",
    "Inspect one live entity: transform, every component, Box2D body.",
    { id: z.string().describe("Entity id") },
    async ({ id }) => payload(await live(fileIO, "/entity", { query: { id } }))
  );
  server.tool(
    "spawn_entity",
    "Spawn an entity into the LIVE libGDX world (not scene JSON). Body is SceneLoader entity JSON: {id?, name, components:[], x?, y?}.",
    {
      entity: z.record(z.unknown()).describe("Entity JSON with optional id, name, components, x, y"),
    },
    async ({ entity }) => payload(await live(fileIO, "/entity/spawn", { method: "POST", body: entity }))
  );
  server.tool(
    "despawn_entity",
    "Remove an entity from the LIVE libGDX world. Scene-JSON deletion remains remove_entity.",
    { id: z.string() },
    async ({ id }) => payload(await live(fileIO, "/entity/remove", { method: "POST", body: { id } }))
  );
  server.tool(
    "set_component",
    "Add or replace a component on a LIVE entity. Rebuilds the Box2D body when the type is physical.",
    {
      entityId: z.string(),
      component: z.record(z.unknown()).describe("Component JSON including type"),
    },
    async ({ entityId, component }) =>
      payload(await live(fileIO, "/component/set", { method: "POST", body: { entityId, component } }))
  );

  server.tool("get_fps", "Live frames-per-second from the debug agent.", {}, async () => {
    const r = await live(fileIO, "/perf");
    const perf = (r.data as { perf?: { fps?: number } } | undefined)?.perf;
    return payload({ ...r, fps: perf?.fps });
  });
  server.tool("get_frame_time", "Live frame time in milliseconds.", {}, async () => {
    const r = await live(fileIO, "/perf");
    const perf = (r.data as { perf?: { frameTimeMs?: number; delta?: number } } | undefined)?.perf;
    return payload({ ...r, frameTimeMs: perf?.frameTimeMs, delta: perf?.delta });
  });
  server.tool("get_draw_calls", "GLProfiler draw calls + SpriteBatch renderCalls + per-primitive estimates.", {}, async () => {
    const r = await live(fileIO, "/perf");
    return payload(r);
  });
  server.tool("get_triangles", "Estimated triangles (GLProfiler vertexCount / 3).", {}, async () => {
    const r = await live(fileIO, "/perf");
    const perf = (r.data as { perf?: { triangles?: number; vertexCount?: number } } | undefined)?.perf;
    return payload({ ...r, triangles: perf?.triangles, vertexCount: perf?.vertexCount });
  });
  server.tool("get_gl_profile", "Full GLProfiler snapshot (calls, drawCalls, shaderSwitches, textureBindings, vertices).", {}, async () =>
    payload(await live(fileIO, "/gl"))
  );

  server.tool("list_shaders", "List the SpriteBatch default shader and any custom shader loaded via reload_shader.", {}, async () =>
    payload(await live(fileIO, "/shaders"))
  );
  server.tool(
    "reload_shader",
    "Load a vertex/fragment pair onto SpriteBatch, or omit paths to revert to the default shader.",
    {
      name: z.string().optional(),
      vertPath: z.string().optional().describe("Internal file path, e.g. shaders/sprite.vert"),
      fragPath: z.string().optional(),
    },
    async ({ name, vertPath, fragPath }) =>
      payload(await live(fileIO, "/shaders/reload", { method: "POST", body: { name, vertPath, fragPath } }))
  );
  server.tool(
    "set_render_mode",
    "Live render mode: default | colliders | overdraw | wireframe | no_sprites | physics.",
    { mode: z.enum(["default", "colliders", "overdraw", "wireframe", "no_sprites", "physics"]) },
    async ({ mode }) => payload(await live(fileIO, "/render-mode", { method: "POST", body: { mode } }))
  );
  server.tool(
    "capture_frame",
    "Capture the current backbuffer as PNG. Returns path, size, and base64 when under 1.5MB.",
    {},
    async () => payload(await live(fileIO, "/capture", { method: "POST", body: {}, timeoutMs: 15_000 }))
  );
  server.tool(
    "set_camera",
    "Set live OrthographicCamera x/y/zoom. Omit fields to read the current camera.",
    {
      x: z.number().optional(),
      y: z.number().optional(),
      zoom: z.number().optional(),
    },
    async ({ x, y, zoom }) => {
      if (x === undefined && y === undefined && zoom === undefined) {
        return payload(await live(fileIO, "/camera"));
      }
      return payload(await live(fileIO, "/camera", { method: "POST", body: { x, y, zoom } }));
    }
  );
  server.tool("get_graphics_info", "Window size, PPI, GL version, safe insets, cached textures.", {}, async () =>
    payload(await live(fileIO, "/graphics"))
  );
  server.tool("list_textures", "Texture ids currently in EntityRenderer's cache.", {}, async () => {
    const r = await live(fileIO, "/graphics");
    const g = (r.data as { graphics?: { cachedTextures?: string[] } } | undefined)?.graphics;
    return payload({ ...r, textures: g?.cachedTextures ?? [] });
  });
  server.tool("get_application_info", "libGDX Application type, heaps, OS, project name, lifecycle pause.", {}, async () =>
    payload(await live(fileIO, "/application"))
  );
  server.tool("get_input_state", "Pointers, keys, accelerometer/gyro availability, injected debug keys.", {}, async () =>
    payload(await live(fileIO, "/input"))
  );
  server.tool(
    "inject_input",
    "Inject held/tap keys into the live PlayerController (left/right/jump or libGDX keycode/name).",
    {
      left: z.boolean().optional(),
      right: z.boolean().optional(),
      jump: z.boolean().optional(),
      key: z.string().optional().describe("libGDX key name, e.g. SPACE, A, LEFT"),
      keycode: z.number().int().optional(),
      down: z.boolean().optional(),
      tap: z.boolean().optional(),
      clear: z.boolean().optional(),
    },
    async (body) => payload(await live(fileIO, "/input", { method: "POST", body }))
  );
  server.tool("get_audio_state", "Cached sounds, active instances, listener position.", {}, async () =>
    payload(await live(fileIO, "/audio"))
  );
  server.tool("inspect_physics", "Box2D world gravity, every body, fixture counts, PPM.", {}, async () =>
    payload(await live(fileIO, "/physics"))
  );
  server.tool(
    "set_live_gravity",
    "Set live Box2D gravity in pixels/s² (same units as scene JSON).",
    { x: z.number(), y: z.number() },
    async ({ x, y }) => payload(await live(fileIO, "/physics/gravity", { method: "POST", body: { x, y } }))
  );
  server.tool(
    "raycast_live",
    "Box2D raycast in pixel coordinates. Returns the closest hit entity if any.",
    { x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() },
    async (body) => payload(await live(fileIO, "/physics/raycast", { method: "POST", body }))
  );
  server.tool(
    "list_internal_files",
    "List Gdx.files.internal/local entries (default path gamekit).",
    { path: z.string().optional() },
    async ({ path }) => payload(await live(fileIO, "/files", { query: { path: path ?? "gamekit" } }))
  );
  server.tool(
    "get_preferences",
    "List keys in a libGDX Preferences file (default name playroom).",
    { name: z.string().optional() },
    async ({ name }) => payload(await live(fileIO, "/preferences", { query: { name: name ?? "playroom" } }))
  );
  server.tool(
    "set_preference",
    "Write a string preference and flush.",
    { name: z.string().optional(), key: z.string(), value: z.string() },
    async ({ name, key, value }) =>
      payload(await live(fileIO, "/preferences", { method: "POST", body: { name: name ?? "playroom", key, value } }))
  );

  server.tool("list_android_devices", "adb devices -l (physical + emulators).", {}, async () => {
    const { ok, result, adb: bin } = await adb(["devices", "-l"]);
    return payload({
      ok,
      adb: bin,
      devices: parseAdbDevices(result.stdout),
      raw: result.stdout,
      error: ok ? undefined : result.stderr,
    }, !ok);
  });
  server.tool("list_android_avds", "emulator -list-avds", {}, async () => {
    const bin = await emulatorPath();
    if (!bin) {
      return payload({ ok: false, error: "emulator binary not on PATH. Install Android SDK emulator." }, true);
    }
    const result = await runCommand(bin, ["-list-avds"], { timeoutMs: 15_000 });
    return payload({
      ok: result.code === 0,
      emulator: bin,
      avds: parseAvdList(result.stdout),
      raw: result.stdout,
      stderr: result.stderr,
    }, result.code !== 0);
  });
  server.tool(
    "start_android_emulator",
    "Start an AVD (`emulator -avd <name> -no-snapshot-save`). Does not wait for boot completion.",
    { avd: z.string(), extraArgs: z.array(z.string()).optional() },
    async ({ avd, extraArgs }) => {
      const bin = await emulatorPath();
      if (!bin) return payload({ ok: false, error: "emulator binary not on PATH" }, true);
      const spawned = spawnDetached(bin, ["-avd", avd, "-no-snapshot-save", ...(extraArgs ?? [])]);
      return payload({
        ok: true,
        launched: bin,
        avd,
        pid: spawned.pid ?? null,
        note: "Emulator started detached. Poll list_android_devices until state=device (often 10–40s).",
      });
    }
  );
  server.tool(
    "build_android",
    "Gradle android:assembleDebug. APK typically at android/build/outputs/apk/debug/.",
    {},
    async () => {
      const info = await rootOf(fileIO);
      if (!info.hasAndroid) {
        return payload({ ok: false, error: "No android module in this libGDX project.", libgdx: info }, true);
      }
      const result = await gradle(info, ["android:assembleDebug"], 300_000);
      return payload({
        ok: result.code === 0,
        ...result,
        apkHint: info.root ? join(info.root, "android/build/outputs/apk/debug") : null,
        applicationId: ANDROID_APPLICATION_ID,
      }, result.code !== 0);
    }
  );
  server.tool(
    "deploy_android",
    "Install the debug APK via Gradle android:installDebug (or adb install). Optional serial.",
    { serial: z.string().optional() },
    async ({ serial }) => {
      const info = await rootOf(fileIO);
      if (!info.hasAndroid) return payload({ ok: false, error: "No android module." }, true);
      const extra = serial ? [`-Pandroid.injected.invoked.from.ide=true`] : [];
      const env = serial ? { ANDROID_SERIAL: serial } : undefined;
      if (!info.root) return payload({ ok: false, error: "No Gradle root" }, true);
      const { command } = gradlewCommand(info.root);
      const result = await runCommand(command, ["android:installDebug", ...extra], {
        cwd: info.root,
        timeoutMs: 300_000,
        env,
      });
      return payload({
        ok: result.code === 0,
        serial: serial ?? null,
        applicationId: ANDROID_APPLICATION_ID,
        activity: ANDROID_ACTIVITY,
        ...result,
      }, result.code !== 0);
    }
  );
  server.tool(
    "run_android",
    "Install debug APK, adb reverse the debug port, launch the activity. Optional serial.",
    { serial: z.string().optional() },
    async ({ serial }) => {
      const info = await rootOf(fileIO);
      if (!info.root || !info.hasAndroid) {
        return payload({ ok: false, error: "Android module / Gradle root missing", libgdx: info }, true);
      }
      const env = serial ? { ANDROID_SERIAL: serial } : undefined;
      const { command } = gradlewCommand(info.root);
      const install = await runCommand(command, ["android:installDebug"], {
        cwd: info.root,
        timeoutMs: 300_000,
        env,
      });
      const adbArgs = serial ? ["-s", serial] : [];
      const reverse = await adb([...adbArgs, "reverse", "tcp:17478", "tcp:17478"]);
      const launch = await adb([
        ...adbArgs,
        "shell",
        "am",
        "start",
        "-n",
        `${ANDROID_APPLICATION_ID}/${ANDROID_ACTIVITY}`,
      ]);
      return payload({
        ok: install.code === 0 && launch.ok,
        install,
        reverse: { ok: reverse.ok, stdout: reverse.result.stdout, stderr: reverse.result.stderr },
        launch: { ok: launch.ok, stdout: launch.result.stdout, stderr: launch.result.stderr },
        debugUrl: debugBaseUrl(),
        hint: "If /health fails, wait for the app to finish create() then retry. Physical devices need wireless reverse or adb reverse.",
      }, install.code !== 0 || !launch.ok);
    }
  );
  server.tool(
    "adb_reverse",
    "adb reverse tcp:<hostPort> tcp:<devicePort> so the host MCP can reach the on-device debug agent.",
    {
      serial: z.string().optional(),
      hostPort: z.number().int().optional(),
      devicePort: z.number().int().optional(),
    },
    async ({ serial, hostPort, devicePort }) => {
      const args = [
        ...(serial ? ["-s", serial] : []),
        "reverse",
        `tcp:${hostPort ?? 17478}`,
        `tcp:${devicePort ?? 17478}`,
      ];
      const r = await adb(args);
      return payload({ ok: r.ok, ...r.result }, !r.ok);
    }
  );
  server.tool(
    "adb_shell",
    "Run adb shell <command...>. Intended for dumpsys/getprop/am/input, not unrelated host commands.",
    {
      serial: z.string().optional(),
      command: z.array(z.string()).min(1),
    },
    async ({ serial, command }) => {
      const r = await adb([...(serial ? ["-s", serial] : []), "shell", ...command], { timeoutMs: 20_000 });
      return payload({ ok: r.ok, ...r.result }, !r.ok);
    }
  );
  server.tool(
    "adb_input",
    "Inject a tap, text, or keyevent on the Android device/emulator.",
    {
      serial: z.string().optional(),
      kind: z.enum(["tap", "text", "keyevent", "swipe"]),
      x: z.number().optional(),
      y: z.number().optional(),
      x2: z.number().optional(),
      y2: z.number().optional(),
      text: z.string().optional(),
      keycode: z.string().optional().describe("e.g. KEYCODE_BACK, KEYCODE_HOME, 4"),
    },
    async (args) => {
      const prefix = args.serial ? ["-s", args.serial] : [];
      let shell: string[] = [];
      if (args.kind === "tap") shell = ["input", "tap", String(args.x ?? 0), String(args.y ?? 0)];
      else if (args.kind === "text") shell = ["input", "text", args.text ?? ""];
      else if (args.kind === "keyevent") shell = ["input", "keyevent", args.keycode ?? "KEYCODE_BACK"];
      else shell = ["input", "swipe", String(args.x ?? 0), String(args.y ?? 0), String(args.x2 ?? 0), String(args.y2 ?? 0)];
      const r = await adb([...prefix, "shell", ...shell]);
      return payload({ ok: r.ok, ...r.result }, !r.ok);
    }
  );

  server.tool("list_ios_devices", "xcrun simctl list devices --json (booted and available).", {}, async () => {
    const r = await simctl(["list", "devices", "--json"]);
    const devices = r.ok ? parseSimctlJson(r.result.stdout) : [];
    return payload({
      ok: r.ok,
      platform: process.platform,
      xcrun: r.xcrun,
      devices,
      error: r.ok ? undefined : r.result.stderr,
      iosModule: (await rootOf(fileIO)).hasIos,
      gap: LIBGDX_MCP_CATALOG.iosGap,
    }, !r.ok && process.platform === "darwin");
  });
  server.tool(
    "boot_ios_simulator",
    "Boot a simulator by UDID or name.",
    { udid: z.string().describe("Simulator UDID from list_ios_devices") },
    async ({ udid }) => {
      const r = await simctl(["boot", udid], { timeoutMs: 60_000 });
      return payload({ ok: r.ok, ...r.result }, !r.ok);
    }
  );
  server.tool(
    "shutdown_ios_simulator",
    "Shutdown a simulator (or `all`).",
    { udid: z.string().default("all") },
    async ({ udid }) => {
      const r = await simctl(["shutdown", udid], { timeoutMs: 30_000 });
      return payload({ ok: r.ok, ...r.result }, !r.ok);
    }
  );
  server.tool("build_ios", "Attempt an iOS/RoboVM build. This template has no ios module — returns a structured gap.", {}, async () => {
    const info = await rootOf(fileIO);
    if (!info.hasIos) {
      return payload(
        {
          ok: false,
          error: "No ios Gradle module in templates/libgdx-game (only core, lwjgl3, android).",
          howToAdd: [
            "Add an ios/ RoboVM (or gdx-jnigen + moe) module to settings.gradle",
            "Install Xcode + a matching RoboVM backend for libGDX 1.13.1",
            "Then this tool will run ./gradlew ios:createIPA / ios:launchIPhoneSimulator",
          ],
          libgdx: info,
          simulatorsStillWork: process.platform === "darwin",
        },
        true
      );
    }
    const result = await gradle(info, ["ios:createIPA"], 300_000);
    return payload({ ok: result.code === 0, ...result }, result.code !== 0);
  });
  server.tool(
    "deploy_ios",
    "Install/launch on a simulator. Fails with a structured gap until an ios module exists.",
    { udid: z.string().optional() },
    async ({ udid }) => {
      const info = await rootOf(fileIO);
      if (!info.hasIos) {
        return payload({
          ok: false,
          error: "Cannot deploy: no ios module / .app bundle is produced by this template.",
          udid: udid ?? null,
          nextSteps: [
            "list_ios_devices / boot_ios_simulator still work",
            "capture_device_screen with platform=ios captures the booted simulator",
            "Add a RoboVM ios module to produce an .app, then simctl install + launch",
          ],
        }, true);
      }
      return payload({ ok: false, error: "ios module present but deploy pipeline is not wired yet", udid }, true);
    }
  );

  server.tool(
    "capture_device_screen",
    "Screenshot a device. platform=android uses adb exec-out screencap; platform=ios uses simctl io screenshot.",
    {
      platform: z.enum(["android", "ios"]).default("android"),
      serial: z.string().optional().describe("adb serial or simulator UDID"),
      outPath: z.string().optional(),
    },
    async ({ platform, serial, outPath }) => {
      const dest =
        outPath ??
        join(fileIO.projectRoot, ".playroom", "captures", `device-${platform}-${Date.now()}.png`);
      await mkdir(join(dest, ".."), { recursive: true });
      if (platform === "android") {
        const args = [...(serial ? ["-s", serial] : []), "exec-out", "screencap", "-p"];
        const r = await adb(args, { timeoutMs: 20_000 });
        if (!r.ok) return payload({ ok: false, ...r.result }, true);
        const { writeFile } = await import("node:fs/promises");
        // adb exec-out returns binary PNG on stdout; our exec captures utf8 so prefer adb -s shell.
        const pull = await adb(
          [...(serial ? ["-s", serial] : []), "shell", "screencap", "-p", "/sdcard/playroom-screen.png"]
        );
        const fetch = await adb(
          [...(serial ? ["-s", serial] : []), "pull", "/sdcard/playroom-screen.png", dest]
        );
        return payload({
          ok: fetch.ok,
          path: dest,
          pull: pull.result.stderr,
          fetch: fetch.result.stderr,
          note: "PNG written via adb pull. Open the path locally.",
        }, !fetch.ok);
      }
      const udid = serial ?? "booted";
      const r = await simctl(["io", udid, "screenshot", dest], { timeoutMs: 20_000 });
      return payload({ ok: r.ok, path: dest, ...r.result }, !r.ok);
    }
  );

  server.tool(
    "get_device_logs",
    "Recent logs. Android: adb logcat -d -t N. iOS: simctl spawn log show last N.",
    {
      platform: z.enum(["android", "ios"]).default("android"),
      serial: z.string().optional(),
      lines: z.number().int().min(10).max(2000).optional(),
      filter: z.string().optional().describe("Android logcat filter spec, e.g. GameKit:D PlayroomDebug:D *:S"),
    },
    async ({ platform, serial, lines, filter }) => {
      const n = lines ?? 200;
      if (platform === "android") {
        const args = [
          ...(serial ? ["-s", serial] : []),
          "logcat",
          "-d",
          "-t",
          String(n),
        ];
        if (filter) args.push(...filter.split(/\s+/));
        const r = await adb(args, { timeoutMs: 15_000 });
        return payload({ ok: r.ok, logs: r.result.stdout, stderr: r.result.stderr }, !r.ok);
      }
      const udid = serial ?? "booted";
      const r = await simctl(
        ["spawn", udid, "log", "show", "--last", `${Math.max(1, Math.round(n / 20))}s`, "--style", "compact"],
        { timeoutMs: 15_000 }
      );
      return payload({ ok: r.ok, logs: r.result.stdout, stderr: r.result.stderr }, !r.ok);
    }
  );
}
