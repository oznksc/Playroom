/**
 * Generates platform entrypoints (web `main.ts`, mobile `App.tsx`) from the
 * project's scene list so export never requires hand-wired imports.
 */

export type BootstrapTransition = {
  type: "none" | "fade" | "slide";
  /** Duration in milliseconds (SceneManager setTimeout). */
  duration: number;
};

export type BootstrapScene = {
  /** Filename under gamekit/scenes, e.g. `menu.scene.json`. */
  file: string;
  /** Bare name without `.scene.json`. */
  bare: string;
  /** Valid TS import binding, e.g. `menuJson`. */
  importVar: string;
  /** Canonical scene.id when known. */
  sceneId?: string;
  /** True when any entity has PlayerController (virtual controls). */
  hasPlayerController: boolean;
};

export type BootstrapInput = {
  scenes: BootstrapScene[];
  /** project.activeScene file or bare id. */
  activeScene?: string;
  transition: BootstrapTransition;
};

/** Convert `level-1.scene.json` → `level_1Json`. */
export function sceneFileToImportVar(file: string): string {
  const bare = file.replace(/\.scene\.json$/i, "");
  let id = bare.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!id) id = "scene";
  if (/^\d/.test(id)) id = `scene_${id}`;
  return `${id}Json`;
}

export function bareSceneName(file: string): string {
  return file.replace(/\.scene\.json$/i, "");
}

/**
 * Prefer project.scenes order; append any extra `.scene.json` files on disk.
 */
export function orderSceneFiles(projectScenes: string[], diskScenes: string[]): string[] {
  const diskSet = new Set(diskScenes);
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const raw of projectScenes) {
    const file = raw.endsWith(".scene.json") ? raw : `${raw}.scene.json`;
    if (diskSet.has(file) && !seen.has(file)) {
      ordered.push(file);
      seen.add(file);
    }
  }
  for (const file of diskScenes) {
    if (!seen.has(file)) {
      ordered.push(file);
      seen.add(file);
    }
  }
  return ordered;
}

/**
 * Schema stores transition duration in seconds; SceneManager expects ms.
 */
export function resolveTransitionMs(
  transitions?: Array<{ type?: string; duration?: number }> | null,
): BootstrapTransition {
  const t = transitions?.[0];
  if (!t || typeof t.duration !== "number" || !Number.isFinite(t.duration)) {
    return { type: "fade", duration: 250 };
  }
  const type =
    t.type === "none" || t.type === "fade" || t.type === "slide" ? t.type : "fade";
  // Values under 20 are treated as seconds (0.35 → 350ms).
  const duration =
    t.duration > 0 && t.duration < 20
      ? Math.round(t.duration * 1000)
      : Math.round(t.duration);
  return { type, duration: Math.max(0, duration) };
}

export function isLikelyMenuSceneId(id: string): boolean {
  return /^(menu|settings|title|credits|level[_-]?select)$/i.test(id);
}

function gameplayIdLiterals(scenes: BootstrapScene[]): string[] {
  const ids = new Set<string>();
  const anyPlayer = scenes.some((s) => s.hasPlayerController);

  for (const s of scenes) {
    const candidates = [s.bare, s.sceneId].filter((x): x is string => Boolean(x));
    if (anyPlayer) {
      if (s.hasPlayerController) {
        for (const c of candidates) ids.add(c);
      }
    } else {
      for (const c of candidates) {
        if (!isLikelyMenuSceneId(c)) ids.add(c);
      }
    }
  }
  return [...ids].sort();
}

function entryFallbackChain(input: BootstrapInput): string[] {
  const chain: string[] = [];
  const push = (v?: string) => {
    if (!v) return;
    const bare = v.replace(/\.scene\.json$/i, "");
    if (bare && !chain.includes(bare)) chain.push(bare);
  };
  push(input.activeScene);
  for (const s of input.scenes) {
    push(s.sceneId);
    push(s.bare);
  }
  push("menu");
  push("main");
  return chain;
}

function formatStringArray(values: string[]): string {
  if (values.length === 0) return "[]";
  return `[\n${values.map((v) => `  ${JSON.stringify(v)},`).join("\n")}\n]`;
}

function sceneImportBlock(scenes: BootstrapScene[], pathPrefix: string): string {
  return scenes
    .map((s) => `import ${s.importVar} from "${pathPrefix}${s.file}";`)
    .join("\n");
}

function sceneRegisterBlock(scenes: BootstrapScene[]): string {
  return scenes.map((s) => `register(${JSON.stringify(s.file)}, ${s.importVar});`).join("\n");
}

function entrySwitchBlock(chain: string[], indent = ""): string {
  if (chain.length === 0) {
    return `${indent}// no scenes`;
  }
  const [first, ...rest] = chain;
  let line = `${indent}manager.switchScene(${JSON.stringify(first)})`;
  for (const id of rest) {
    line += ` ||\n${indent}  manager.switchScene(${JSON.stringify(id)})`;
  }
  line += ";";
  return line;
}

/**
 * Web (Phaser) entry: `src/main.ts`.
 * (Touch controls are handled inside runtime-web; no showControls prop.)
 */
export function generateWebMain(input: BootstrapInput): string {
  if (input.scenes.length === 0) {
    throw new Error("Cannot generate web bootstrap: project has no scenes");
  }
  const { type, duration } = input.transition;
  const entry = entryFallbackChain(input);

  return `/* Generated by gamekit export — do not edit by hand; re-export to regenerate. */
import { createGameKitGame } from "@gamekit/runtime-web";
// Subpath imports avoid pulling React Native entry points into the browser bundle.
import { SceneManager, LocalStorageProvider } from "@gamekit/runtime/manager";
import { loadScene } from "@gamekit/runtime/scene";
import type { GameKitScene, GuiComponent } from "@gamekit/schema";
import projectJson from "../gamekit/project.json";
${sceneImportBlock(input.scenes, "../gamekit/scenes/")}
import { gamekitAssets } from "../gamekit/generated/assets";

const assets = gamekitAssets as Record<string, string>;
const guiComponents = (projectJson.guiComponents ?? []) as GuiComponent[];

const scenes: Record<string, ReturnType<typeof loadScene>> = {};
function register(file: string, raw: unknown) {
  const loaded = loadScene(raw, assets);
  const bare = file.replace(/\\.scene\\.json$/i, "");
  scenes[file] = loaded;
  scenes[bare] = loaded;
  scenes[loaded.scene.id] = loaded;
}

${sceneRegisterBlock(input.scenes)}

const manager = new SceneManager(
  { scenes, transition: { type: ${JSON.stringify(type)}, duration: ${duration} } },
  projectJson.levels ?? [],
  new LocalStorageProvider(),
);

${entrySwitchBlock(entry)}

const container = document.getElementById("game")!;
let game: ReturnType<typeof createGameKitGame> | null = null;

function mountCurrent() {
  const current = manager.getCurrentScene();
  if (!current) return;
  const scene = current.scene as GameKitScene;
  if (game) {
    game.destroy(true);
    game = null;
    container.innerHTML = "";
  }
  game = createGameKitGame({
    scene,
    assets,
    container,
    pixelArt: false,
    guiComponents,
    sceneManager: {
      switchScene: (id) => {
        const ok = manager.switchScene(id);
        if (ok) mountCurrent();
        return ok;
      },
      nextScene: () => {
        const ok = manager.nextScene();
        if (ok) mountCurrent();
        return ok;
      },
      nextLevel: () => {
        const ok = manager.nextLevel();
        if (ok) mountCurrent();
        return ok;
      },
      unlockLevel: (id) => manager.unlockLevel(id),
      completeLevel: (id) => manager.completeLevel(id),
      getState: () => ({ currentLevelId: manager.getState().currentLevelId }),
      setPersistentVar: (k, v) => manager.setPersistentVar(k, v),
      getPersistentVar: (k, d) => manager.getPersistentVar(k, d),
    },
  });
}

mountCurrent();
`;
}

/**
 * Mobile (Expo/Skia) entry: `App.tsx`.
 */
export function generateMobileApp(input: BootstrapInput): string {
  if (input.scenes.length === 0) {
    throw new Error("Cannot generate mobile bootstrap: project has no scenes");
  }
  const { type, duration } = input.transition;
  const gameplay = gameplayIdLiterals(input.scenes);
  const entry = entryFallbackChain(input);

  return `/* Generated by gamekit export — do not edit by hand; re-export to regenerate. */
// Native deps must load before Skia / GameKit (gesture-handler, reanimated).
import "react-native-gesture-handler";
import "react-native-reanimated";

import { useMemo, useState, useCallback } from "react";
import { GameKitGame, loadScene, SceneManager, InMemoryStorage } from "@gamekit/runtime";
import { SafeAreaProvider } from "react-native-safe-area-context";
import projectJson from "./gamekit/project.json";
${sceneImportBlock(input.scenes, "./gamekit/scenes/")}
import { gamekitAssets } from "./gamekit/generated/assets";

/** Scene ids that should show on-screen controls (PlayerController present, or non-menu fallback). */
const GAMEPLAY_SCENE_IDS = new Set<string>(${formatStringArray(gameplay)});

function buildManager() {
  const scenes: Record<string, ReturnType<typeof loadScene>> = {};
  const register = (file: string, raw: unknown) => {
    const loaded = loadScene(raw, gamekitAssets);
    const bare = file.replace(/\\.scene\\.json$/i, "");
    scenes[file] = loaded;
    scenes[bare] = loaded;
    scenes[loaded.scene.id] = loaded;
  };
${sceneRegisterBlock(input.scenes)
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}

  const manager = new SceneManager(
    { scenes, transition: { type: ${JSON.stringify(type)}, duration: ${duration} } },
    projectJson.levels ?? [],
    new InMemoryStorage(),
  );
${entrySwitchBlock(entry, "  ")}
  return manager;
}

/** Expo game shell: multi-scene SceneManager + virtual controls on gameplay scenes. */
export default function App() {
  const manager = useMemo(() => buildManager(), []);
  const [, setTick] = useState(0);
  const remount = useCallback(() => setTick((t) => t + 1), []);

  const current = manager.getCurrentScene();
  if (!current) return null;

  const guiComponents = projectJson.guiComponents ?? [];
  const sceneId = current.scene.id;
  const showControls = GAMEPLAY_SCENE_IDS.has(sceneId);

  return (
    <SafeAreaProvider>
      <GameKitGame
        key={sceneId}
        scene={current.scene}
        assets={current.assets}
        showControls={showControls}
        guiComponents={guiComponents}
        sceneManager={{
          switchScene: (id) => {
            const ok = manager.switchScene(id);
            if (ok) remount();
            return ok;
          },
          nextScene: () => {
            const ok = manager.nextScene();
            if (ok) remount();
            return ok;
          },
          nextLevel: () => {
            const ok = manager.nextLevel();
            if (ok) remount();
            return ok;
          },
          unlockLevel: (id) => manager.unlockLevel(id),
          completeLevel: (id) => manager.completeLevel(id),
          getState: () => ({ currentLevelId: manager.getState().currentLevelId }),
          setPersistentVar: (k, v) => manager.setPersistentVar(k, v),
          getPersistentVar: (k, d) => manager.getPersistentVar(k, d),
        }}
      />
    </SafeAreaProvider>
  );
}
`;
}
