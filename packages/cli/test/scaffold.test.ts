import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { scaffoldProject, detectPackageManagers, GENRE_TEMPLATES } from "../src/scaffold.js";
import { readProject, readScene } from "../src/project.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-scaffold-${randomUUID()}`);
  await mkdir(root, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("scaffoldProject", () => {
  it("detects available package managers", async () => {
    const pms = await detectPackageManagers();
    expect(pms.available.length).toBeGreaterThan(0);
    expect(["pnpm", "bun", "yarn", "npm"]).toContain(pms.preferred);
  });

  it("exposes rich genre templates", () => {
    expect(GENRE_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const ids = GENRE_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("platformer");
    expect(ids).toContain("topdown");
    expect(ids).toContain("physics-puzzle");
    expect(ids).toContain("blank");
  });

  it("scaffolds a full Web Game project with Phaser and Vite", async () => {
    const targetDir = join(root, "my-web-game");
    const result = await scaffoldProject({
      targetDir,
      name: "Cyber Blade Web",
      platform: "web",
      genre: "platformer",
      runInstall: false,
      initGit: true,
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("web");
    expect(result.genre).toBe("platformer");
    expect(existsSync(join(targetDir, "package.json"))).toBe(true);
    expect(existsSync(join(targetDir, "index.html"))).toBe(true);
    expect(existsSync(join(targetDir, "vite.config.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "main.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "gamekit", "project.json"))).toBe(true);
    expect(existsSync(join(targetDir, "gamekit", "scenes", "platformer.scene.json"))).toBe(true);
    expect(existsSync(join(targetDir, "gamekit", "generated", "assets.ts"))).toBe(true);
    expect(existsSync(join(targetDir, ".gitignore"))).toBe(true);

    const pkg = JSON.parse(await readFile(join(targetDir, "package.json"), "utf8")) as {
      name: string;
      dependencies: Record<string, string>;
    };
    expect(pkg.name).toBe("cyber-blade-web");
    expect(pkg.dependencies["@gamekit/runtime-web"]).toBeDefined();
    expect(pkg.dependencies["phaser"]).toBeDefined();

    const project = await readProject(targetDir);
    expect(project.name).toBe("Cyber Blade Web");
    expect(project.scenes).toContain("platformer.scene.json");
    expect(project.scenes).toContain("menu.scene.json");

    const scene = await readScene(targetDir, "platformer.scene.json");
    expect(scene.entities.length).toBeGreaterThan(0);
  });

  it("scaffolds an Expo Mobile project with Skia and React Native", async () => {
    const targetDir = join(root, "my-mobile-game");
    const result = await scaffoldProject({
      targetDir,
      name: "Mobile Quest",
      platform: "expo",
      genre: "topdown",
      runInstall: false,
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("expo");
    expect(existsSync(join(targetDir, "package.json"))).toBe(true);
    expect(existsSync(join(targetDir, "App.tsx"))).toBe(true);
    expect(existsSync(join(targetDir, "app.json"))).toBe(true);
    expect(existsSync(join(targetDir, "babel.config.js"))).toBe(true);
    expect(existsSync(join(targetDir, "gamekit", "scenes", "topdown.scene.json"))).toBe(true);

    const pkg = JSON.parse(await readFile(join(targetDir, "package.json"), "utf8")) as {
      name: string;
      dependencies: Record<string, string>;
    };
    expect(pkg.name).toBe("mobile-quest");
    expect(pkg.dependencies["@gamekit/runtime"]).toBeDefined();
    expect(pkg.dependencies["@shopify/react-native-skia"]).toBeDefined();
    expect(pkg.dependencies["expo"]).toBeDefined();
  });

  it("scaffolds a Desktop Tauri + Web game project", async () => {
    const targetDir = join(root, "my-desktop-game");
    const result = await scaffoldProject({
      targetDir,
      name: "Desktop Arcade",
      platform: "tauri",
      genre: "physics-puzzle",
      runInstall: false,
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("tauri");
    expect(existsSync(join(targetDir, "src-tauri", "tauri.conf.json"))).toBe(true);
    expect(existsSync(join(targetDir, "src-tauri", "Cargo.toml"))).toBe(true);
    expect(existsSync(join(targetDir, "src-tauri", "src", "main.rs"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "main.ts"))).toBe(true);
  });

  it("scaffolds a LibGDX Kotlin project with LibKTX and Gradle", async () => {
    const targetDir = join(root, "my-libgdx-kotlin-game");
    const result = await scaffoldProject({
      targetDir,
      name: "Kotlin Pixel Quest",
      platform: "libgdx",
      language: "kotlin",
      genre: "platformer",
      runInstall: false,
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("libgdx");
    expect(result.language).toBe("kotlin");
    expect(existsSync(join(targetDir, "build.gradle"))).toBe(true);
    expect(existsSync(join(targetDir, "settings.gradle"))).toBe(true);
    expect(existsSync(join(targetDir, "gradle.properties"))).toBe(true);
    expect(existsSync(join(targetDir, "core", "build.gradle"))).toBe(true);
    expect(existsSync(join(targetDir, "core", "src", "main", "kotlin", "com", "playroom", "runtime", "ktx", "PlayroomKtx.kt"))).toBe(true);
    expect(existsSync(join(targetDir, "lwjgl3", "src", "main", "kotlin", "com", "playroom", "runtime", "lwjgl3", "Lwjgl3Launcher.kt"))).toBe(true);
    expect(existsSync(join(targetDir, "android", "src", "main", "kotlin", "com", "playroom", "runtime", "android", "AndroidLauncher.kt"))).toBe(true);
    expect(existsSync(join(targetDir, "gamekit", "project.json"))).toBe(true);
    expect(existsSync(join(targetDir, "gamekit", "scenes", "platformer.scene.json"))).toBe(true);

    const gradleProps = await readFile(join(targetDir, "gradle.properties"), "utf8");
    expect(gradleProps).toContain("kotlinVersion");
    expect(gradleProps).toContain("ktxVersion");
  });

  it("scaffolds a LibGDX Java project with classic LibGDX setup", async () => {
    const targetDir = join(root, "my-libgdx-java-game");
    const result = await scaffoldProject({
      targetDir,
      name: "Java Platformer",
      platform: "libgdx",
      language: "java",
      genre: "topdown",
      runInstall: false,
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("libgdx");
    expect(result.language).toBe("java");
    expect(existsSync(join(targetDir, "build.gradle"))).toBe(true);
    expect(existsSync(join(targetDir, "core", "src", "main", "java", "com", "playroom", "runtime", "GameKitGame.java"))).toBe(true);
    expect(existsSync(join(targetDir, "lwjgl3", "src", "main", "java", "com", "playroom", "runtime", "lwjgl3", "Lwjgl3Launcher.java"))).toBe(true);
  });

  it("scaffolds a LibGDX Kotlin Multiplatform (KMP) project", async () => {
    const targetDir = join(root, "my-libgdx-kmp-game");
    const result = await scaffoldProject({
      targetDir,
      name: "KMP Galaxy Game",
      platform: "libgdx",
      language: "kmp",
      genre: "topdown-shooter",
      runInstall: false,
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("libgdx");
    expect(result.language).toBe("kmp");
    expect(existsSync(join(targetDir, "build.gradle"))).toBe(true);
    expect(existsSync(join(targetDir, "core", "src", "main", "kotlin", "com", "playroom", "runtime", "kmp", "PlatformServices.kt"))).toBe(true);
  });
});
