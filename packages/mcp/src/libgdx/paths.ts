import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_DEBUG_PORT = 17478;
export const ANDROID_APPLICATION_ID = "com.playroom.game";
export const ANDROID_ACTIVITY = "com.playroom.runtime.android.AndroidLauncher";

export type LibgdxRootInfo = {
  root: string | null;
  source: string;
  hasGradlew: boolean;
  hasLwjgl3: boolean;
  hasAndroid: boolean;
  hasIos: boolean;
  settingsGradle: string | null;
  candidates: Array<{ path: string; reason: string; exists: boolean }>;
};

function hasGradleProject(dir: string): boolean {
  return (
    existsSync(join(dir, "settings.gradle")) &&
    (existsSync(join(dir, "gradlew")) || existsSync(join(dir, "gradlew.bat")))
  );
}

export function monorepoLibgdxTemplate(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const template = resolve(here, "../../../../templates/libgdx-game");
  return existsSync(join(template, "settings.gradle")) ? template : null;
}

export async function resolveLibgdxRoot(projectRoot: string): Promise<LibgdxRootInfo> {
  const candidates: Array<{ path: string; reason: string }> = [];
  const envRoot = process.env.PLAYROOM_LIBGDX_ROOT;
  if (envRoot) candidates.push({ path: resolve(envRoot), reason: "PLAYROOM_LIBGDX_ROOT" });
  candidates.push({ path: resolve(projectRoot), reason: "MCP project root" });
  candidates.push({
    path: join(resolve(projectRoot), ".playroom", "native"),
    reason: ".playroom/native (gamekit play / launch_native_game)",
  });
  const template = monorepoLibgdxTemplate();
  if (template) candidates.push({ path: template, reason: "Playroom templates/libgdx-game" });

  const detailed = candidates.map((c) => ({
    path: c.path,
    reason: c.reason,
    exists: existsSync(c.path),
  }));

  for (const c of detailed) {
    if (!c.exists) continue;
    if (c.reason === "Playroom templates/libgdx-game") continue;
    if (!hasGradleProject(c.path) && c.reason !== "MCP project root") continue;
    if (!hasGradleProject(c.path)) continue;
    const settings = await readFile(join(c.path, "settings.gradle"), "utf8").catch(() => "");
    return {
      root: c.path,
      source: c.reason,
      hasGradlew: existsSync(join(c.path, "gradlew")) || existsSync(join(c.path, "gradlew.bat")),
      hasLwjgl3: /lwjgl3/.test(settings) || existsSync(join(c.path, "lwjgl3")),
      hasAndroid: /android/.test(settings) || existsSync(join(c.path, "android")),
      hasIos: /ios/.test(settings) || existsSync(join(c.path, "ios")),
      settingsGradle: settings,
      candidates: detailed,
    };
  }

  return {
    root: null,
    source: "not-found",
    hasGradlew: false,
    hasLwjgl3: false,
    hasAndroid: false,
    hasIos: false,
    settingsGradle: null,
    candidates: detailed,
  };
}

export function gradlewCommand(root: string): { command: string; argsPrefix: string[] } {
  if (process.platform === "win32") {
    return { command: join(root, "gradlew.bat"), argsPrefix: [] };
  }
  return { command: join(root, "gradlew"), argsPrefix: [] };
}

export function debugBaseUrl(): string {
  if (process.env.PLAYROOM_LIBGDX_DEBUG_URL) return process.env.PLAYROOM_LIBGDX_DEBUG_URL.replace(/\/$/, "");
  const port = Number(process.env.PLAYROOM_DEBUG_PORT || DEFAULT_DEBUG_PORT);
  return `http://127.0.0.1:${Number.isFinite(port) ? port : DEFAULT_DEBUG_PORT}`;
}

export async function readDebugPortFile(libgdxRoot: string | null): Promise<{ port?: number; path?: string } | null> {
  if (!libgdxRoot) return null;
  const paths = [
    join(libgdxRoot, "assets", "playroom-debug.json"),
    join(libgdxRoot, "playroom-debug.json"),
  ];
  for (const path of paths) {
    try {
      const raw = await readFile(path, "utf8");
      const json = JSON.parse(raw) as { port?: number };
      return { ...json, path };
    } catch {
      // continue
    }
  }
  return null;
}

export async function listGradleModules(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
