import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  slugify,
} from "@gamekit/schema";
import {
  createGameFromSkill,
  generateAssetRegistry,
  getGameKitRoot,
  initProject,
  buildExportBootstrapInput,
} from "./project.js";
import {
  generateMobileApp,
  generateWebMain,
} from "./export-bootstrap.js";

export type ProjectPlatform = "expo" | "web" | "tauri" | "libgdx";
export type ProjectGenre =
  | "platformer"
  | "topdown"
  | "puzzle"
  | "topdown-shooter"
  | "endless-runner"
  | "physics-puzzle"
  | "blank";
export type PackageManager = "pnpm" | "bun" | "yarn" | "npm";

export interface ScaffoldOptions {
  targetDir: string;
  name: string;
  platform: ProjectPlatform;
  genre?: ProjectGenre;
  packageManager?: PackageManager;
  runInstall?: boolean;
  initGit?: boolean;
  onProgress?: (message: string, step: number, total: number, logDetail?: string) => void;
}

export interface ScaffoldResult {
  success: boolean;
  targetDir: string;
  name: string;
  platform: ProjectPlatform;
  genre: string;
  projectPath: string;
  scenePath: string;
  packageManager: PackageManager;
  installed: boolean;
  warnings: string[];
}

export interface TemplateMetadata {
  id: ProjectGenre;
  name: string;
  description: string;
  icon: string;
  badge: string;
  features: string[];
}

export const GENRE_TEMPLATES: TemplateMetadata[] = [
  {
    id: "platformer",
    name: "2D Platformer",
    description: "Side-scrolling platformer with physics, jumping, coins, hazard spikes, and level completion.",
    icon: "Gamepad2",
    badge: "Most Popular",
    features: ["Physics & Jump mechanics", "Coin collection triggers", "Hazard spikes & respawn", "Touch & WASD controls"],
  },
  {
    id: "topdown",
    name: "Top-Down Adventure",
    description: "Zelda-style 8-directional adventure with obstacles, collectibles, and camera follow.",
    icon: "Compass",
    badge: "RPG Starter",
    features: ["8-directional smooth movement", "Obstacle collisions", "Camera follow target", "Touch & Keyboard input"],
  },
  {
    id: "topdown-shooter",
    name: "Top-Down Shooter / Action",
    description: "Fast-paced arena shooter with enemies, projectile hazards, and score tracking.",
    icon: "Crosshair",
    badge: "Action",
    features: ["Action shooting controls", "Enemy hazard kill zones", "Health & Score counters", "Wave arena setup"],
  },
  {
    id: "physics-puzzle",
    name: "Physics & Puzzle",
    description: "Sokoban & physics-inspired puzzle game with goal triggers and rigid body mechanics.",
    icon: "Boxes",
    badge: "Puzzle",
    features: ["Pushable rigid bodies", "Goal socket triggers", "Level progression flow", "Undo & Reset support"],
  },
  {
    id: "endless-runner",
    name: "Endless Runner",
    description: "Fast reflex runner with procedurally styled obstacles and coin streaks.",
    icon: "Zap",
    badge: "Arcade",
    features: ["Continuous runner mechanics", "Coin multiplier rules", "Single life challenge", "Quick retry loop"],
  },
  {
    id: "blank",
    name: "Clean Slate / Sandbox",
    description: "Minimal starting canvas with player entity, camera follow, and empty world ready for custom creation.",
    icon: "Sparkles",
    badge: "Minimal",
    features: ["Basic PlayerController", "CameraFollow component", "Clean canvas structure", "Pre-configured input map"],
  },
];

/**
 * Check which package managers are installed on the system.
 */
export async function detectPackageManagers(): Promise<{
  available: PackageManager[];
  preferred: PackageManager;
}> {
  const managers: PackageManager[] = ["pnpm", "bun", "yarn", "npm"];
  const available: PackageManager[] = [];

  for (const pm of managers) {
    const isAvailable = await checkCommandExists(pm);
    if (isAvailable) {
      available.push(pm);
    }
  }

  if (available.length === 0) {
    available.push("npm");
  }

  // Preference order: pnpm > bun > yarn > npm
  const preferred = available[0] ?? "npm";
  return { available, preferred };
}

function checkCommandExists(cmd: string): Promise<boolean> {
  return new Promise((res) => {
    const child = spawn(process.platform === "win32" ? "where" : "which", [cmd], {
      stdio: "ignore",
    });
    child.on("close", (code) => res(code === 0));
    child.on("error", () => res(false));
  });
}

function getPlayroomRoot(): string {
  return fileURLToPath(new URL("../../..", import.meta.url));
}

function getTemplateDir(name: "expo-game" | "web-game" | "libgdx-game"): string {
  return join(getPlayroomRoot(), "templates", name);
}

/**
 * Scaffold a complete, ready-to-run Playroom project.
 */
export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const totalSteps = options.runInstall ? 5 : 4;
  const targetDir = resolve(options.targetDir);
  const projectName = options.name.trim() || basename(targetDir);
  const projectSlug = slugify(projectName) || "playroom-game";
  const platform = options.platform;
  const genre = options.genre ?? "platformer";
  const pm = options.packageManager ?? (await detectPackageManagers()).preferred;
  const warnings: string[] = [];

  options.onProgress?.("Creating project directories…", 1, totalSteps);
  await mkdir(targetDir, { recursive: true });

  const playroomRoot = getPlayroomRoot();
  let rootPkgVersion = "0.1.1";
  try {
    const rootPkg = JSON.parse(await readFile(join(playroomRoot, "package.json"), "utf8")) as {
      version?: string;
    };
    if (rootPkg.version) rootPkgVersion = rootPkg.version;
  } catch {
    // fallback
  }

  // ── Step 1: Generate Platform Scaffolding ──────────────────────────────
  options.onProgress?.(`Scaffolding ${platform.toUpperCase()} project files…`, 2, totalSteps);

  if (platform === "expo") {
    const templateDir = getTemplateDir("expo-game");
    const filesToCopy = [
      { src: join(templateDir, "app.json"), dest: join(targetDir, "app.json") },
      { src: join(templateDir, "babel.config.js"), dest: join(targetDir, "babel.config.js") },
      { src: join(templateDir, "tsconfig.json"), dest: join(targetDir, "tsconfig.json") },
    ];

    for (const { src, dest } of filesToCopy) {
      try {
        if (existsSync(src)) {
          let content = await readFile(src, "utf8");
          if (dest.endsWith("app.json")) {
            const appJson = JSON.parse(content) as {
              expo?: { name?: string; slug?: string };
            };
            if (appJson.expo) {
              appJson.expo.name = projectName;
              appJson.expo.slug = projectSlug;
            }
            content = JSON.stringify(appJson, null, 2);
          }
          await writeFile(dest, content);
        }
      } catch (err) {
        warnings.push(`Could not copy ${basename(src)}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Expo package.json
    const expoPackageJson = {
      name: projectSlug,
      version: "0.1.0",
      private: true,
      scripts: {
        start: "expo start",
        ios: "expo start --ios",
        android: "expo start --android",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@gamekit/runtime": `^${rootPkgVersion}`,
        "@shopify/react-native-skia": "^1.5.4",
        expo: "^52.0.0",
        "expo-av": "~15.0.2",
        react: "^18.3.1",
        "react-native": "^0.76.5",
        "react-native-gesture-handler": "^2.20.2",
        "react-native-reanimated": "^3.16.1",
        "react-native-safe-area-context": "^4.12.0",
      },
      devDependencies: {
        "@babel/core": "^7.26.0",
        "@types/react": "^18.3.12",
        typescript: "^5.7.2",
      },
    };
    await writeFile(join(targetDir, "package.json"), JSON.stringify(expoPackageJson, null, 2) + "\n");
  } else if (platform === "web" || platform === "tauri") {
    const templateDir = getTemplateDir("web-game");
    const filesToCopy = [
      { src: join(templateDir, "index.html"), dest: join(targetDir, "index.html") },
      { src: join(templateDir, "vite.config.ts"), dest: join(targetDir, "vite.config.ts") },
      { src: join(templateDir, "tsconfig.json"), dest: join(targetDir, "tsconfig.json") },
    ];

    for (const { src, dest } of filesToCopy) {
      try {
        if (existsSync(src)) {
          let content = await readFile(src, "utf8");
          if (dest.endsWith("index.html")) {
            content = content.replace(/<title>.*?<\/title>/, `<title>${projectName}</title>`);
          }
          await writeFile(dest, content);
        }
      } catch (err) {
        warnings.push(`Could not copy ${basename(src)}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await mkdir(join(targetDir, "src"), { recursive: true });

    const webPackageJson = {
      name: projectSlug,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
        typecheck: "tsc --noEmit",
        ...(platform === "tauri" ? { tauri: "tauri" } : {}),
      },
      dependencies: {
        "@gamekit/runtime": `^${rootPkgVersion}`,
        "@gamekit/runtime-web": `^${rootPkgVersion}`,
        "@gamekit/schema": `^${rootPkgVersion}`,
        phaser: "^3.87.0",
      },
      devDependencies: {
        typescript: "^5.7.2",
        vite: "^6.0.5",
        ...(platform === "tauri" ? { "@tauri-apps/cli": "^2.0.0" } : {}),
      },
    };
    await writeFile(join(targetDir, "package.json"), JSON.stringify(webPackageJson, null, 2) + "\n");

    // Tauri setup if target is tauri
    if (platform === "tauri") {
      const tauriDir = join(targetDir, "src-tauri");
      await mkdir(join(tauriDir, "src"), { recursive: true });

      const tauriConf = {
        $schema: "https://schema.tauri.app/config/2",
        productName: projectName,
        version: "0.1.0",
        identifier: `com.playroom.${projectSlug.replace(/[^a-zA-Z0-9]/g, "")}`,
        build: {
          beforeDevCommand: `${pm} run dev`,
          beforeBuildCommand: `${pm} run build`,
          devUrl: "http://localhost:5173",
          frontendDist: "../dist",
        },
        app: {
          windows: [
            {
              title: projectName,
              width: 1280,
              height: 720,
              resizable: true,
              fullscreen: false,
            },
          ],
          security: {
            csp: null,
          },
        },
        bundle: {
          active: true,
          targets: "all",
          icon: ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"],
        },
      };
      await writeFile(join(tauriDir, "tauri.conf.json"), JSON.stringify(tauriConf, null, 2) + "\n");

      const cargoToml = `[package]
name = "${projectSlug.replace(/[^a-zA-Z0-9_-]/g, "_")}"
version = "0.1.0"
description = "${projectName} - Playroom Game"
edition = "2021"

[lib]
name = "${projectSlug.replace(/[^a-zA-Z0-9_]/g, "_")}_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;
      await writeFile(join(tauriDir, "Cargo.toml"), cargoToml);

      const rustMain = `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
`;
      await writeFile(join(tauriDir, "src", "main.rs"), rustMain);
    }
  } else if (platform === "libgdx") {
    // LibGDX (Java/Kotlin, Gradle) — copy the pre-built template wholesale
    const templateDir = getTemplateDir("libgdx-game");
    const { cp } = await import("node:fs/promises");
    try {
      if (existsSync(templateDir)) {
        await cp(templateDir, targetDir, { recursive: true });
      } else {
        warnings.push("LibGDX template directory not found; only the gamekit/ folder will be generated.");
      }
    } catch (err) {
      warnings.push(`Could not copy LibGDX template: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Step 2: Initialize GameKit Folder & Genre Gameplay ────────────────
  options.onProgress?.(`Building GameKit scenes & rules for ${genre}…`, 3, totalSteps);

  const gamekitRoot = getGameKitRoot(targetDir);
  await mkdir(join(gamekitRoot, "scenes"), { recursive: true });
  await mkdir(join(gamekitRoot, "assets"), { recursive: true });
  await mkdir(join(gamekitRoot, "prefabs"), { recursive: true });
  await mkdir(join(gamekitRoot, "generated"), { recursive: true });

  let primarySceneFile = "main.scene.json";
  let sceneId = "main";

  if (genre === "blank") {
    await initProject(targetDir, { name: projectName });
    primarySceneFile = "main.scene.json";
    sceneId = "main";
  } else {
    try {
      const createRes = await createGameFromSkill(targetDir, genre, {
        name: projectName,
        platform: platform === "expo" ? "mobile" : platform === "libgdx" ? "mobile" : "web",
      });
      primarySceneFile = createRes.gameplayFile;
      sceneId = createRes.sceneId;
      if (createRes.warnings?.length) {
        warnings.push(...createRes.warnings);
      }
    } catch (e) {
      warnings.push(`Skill template "${genre}" fallback: ${e instanceof Error ? e.message : String(e)}`);
      await initProject(targetDir, { name: projectName });
      primarySceneFile = "main.scene.json";
      sceneId = "main";
    }
  }

  // ── Step 3: Generate Bootstrap Entrypoints ────────────────────────────
  options.onProgress?.("Generating platform runtime entrypoints…", 4, totalSteps);
  await generateAssetRegistry(targetDir, platform === "expo" ? "mobile" : "web");

  try {
    const bootstrap = await buildExportBootstrapInput(targetDir);
    if (platform === "expo") {
      await writeFile(join(targetDir, "App.tsx"), generateMobileApp(bootstrap));
    } else {
      await writeFile(join(targetDir, "src", "main.ts"), generateWebMain(bootstrap));
    }
  } catch (err) {
    warnings.push(`Entrypoint generator warning: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Step 4: Install Dependencies (Optional / Auto) ───────────────────
  let installed = false;
  if (options.runInstall) {
    options.onProgress?.(`Installing dependencies with ${pm}…`, 5, totalSteps, `Running \`${pm} install\` in ${targetDir}`);
    try {
      await runPackageManagerInstall(targetDir, pm, (log) => {
        options.onProgress?.(`Installing dependencies with ${pm}…`, 5, totalSteps, log);
      });
      installed = true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      warnings.push(`Package install failed: ${errMsg}. Run \`${pm} install\` manually.`);
    }
  }

  // Optional git init
  if (options.initGit) {
    try {
      const gitIgnoreContent = `node_modules/
dist/
build/
.expo/
*.log
.DS_Store
src-tauri/target/
gamekit/generated/
`;
      await writeFile(join(targetDir, ".gitignore"), gitIgnoreContent);
      await runCommand("git", ["init"], targetDir);
    } catch {
      // ignore git init errors
    }
  }

  options.onProgress?.("Project ready!", totalSteps, totalSteps);

  return {
    success: true,
    targetDir,
    name: projectName,
    platform,
    genre,
    projectPath: join(gamekitRoot, "project.json"),
    scenePath: join(gamekitRoot, "scenes", primarySceneFile),
    packageManager: pm,
    installed,
    warnings,
  };
}

function runPackageManagerInstall(
  cwd: string,
  pm: PackageManager,
  onLog?: (line: string) => void,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const args = ["install"];
    const child = spawn(pm, args, {
      cwd,
      shell: process.platform === "win32",
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.stdout?.on("data", (data: Buffer) => {
      const str = data.toString("utf8");
      onLog?.(str.trim());
    });

    child.stderr?.on("data", (data: Buffer) => {
      const str = data.toString("utf8");
      onLog?.(str.trim());
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${pm} install exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "ignore" });
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

/**
 * Open OS native folder picker dialog (macOS AppleScript, Windows PowerShell, Linux Zenity/KDialog).
 */
export async function openNativeFolderDialog(prompt = "Select Location Directory"): Promise<string | null> {
  const platform = process.platform;
  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    if (platform === "darwin") {
      const script = `POSIX path of (choose folder with prompt "${prompt.replace(/"/g, '\\"')}")`;
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const selected = stdout.trim().replace(/\/$/, "");
      return selected || null;
    } else if (platform === "win32") {
      const psCommand = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = '${prompt.replace(/'/g, "''")}'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }"`;
      const { stdout } = await execAsync(psCommand);
      const selected = stdout.trim();
      return selected || null;
    } else {
      try {
        const { stdout } = await execAsync(`zenity --file-selection --directory --title="${prompt}"`);
        return stdout.trim() || null;
      } catch {
        const { stdout } = await execAsync(`kdialog --getexistingdirectory`);
        return stdout.trim() || null;
      }
    }
  } catch {
    return null;
  }
}

