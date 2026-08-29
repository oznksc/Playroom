import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { detectKmpProject } from "../src/kmp-detector.js";
import { adoptKmpProject } from "../src/kmp-injector.js";
import { initProject, readProject, readScene } from "../src/project.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-kmp-adopt-${randomUUID()}`);
  await mkdir(root, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("KMP Project Auto-Detection", () => {
  it("detects a non-gradle directory correctly", async () => {
    const info = await detectKmpProject(root);
    expect(info.isGradleProject).toBe(false);
    expect(info.layoutType).toBe("none");
  });

  it("detects a multi-module KMP project with shared commonMain", async () => {
    await writeFile(join(root, "settings.gradle.kts"), "include(\":shared\", \":desktopApp\", \":androidApp\")");
    await writeFile(join(root, "build.gradle.kts"), "// root build");
    await mkdir(join(root, "shared", "src", "commonMain", "kotlin"), { recursive: true });
    await mkdir(join(root, "desktopApp", "src", "jvmMain", "kotlin"), { recursive: true });
    await mkdir(join(root, "androidApp", "src", "main", "kotlin"), { recursive: true });

    const info = await detectKmpProject(root);
    expect(info.isGradleProject).toBe(true);
    expect(info.buildScriptType).toBe("kts");
    expect(info.layoutType).toBe("multi-module-kmp");
    expect(info.sharedModule?.name).toBe("shared");
    expect(info.sharedModule?.sourceDir).toBe(join(root, "shared", "src", "commonMain", "kotlin"));
    expect(info.desktopModule?.name).toBe("desktopApp");
    expect(info.androidModule?.name).toBe("androidApp");
  });

  it("detects a Compose Multiplatform project", async () => {
    await writeFile(join(root, "settings.gradle.kts"), "include(\":composeApp\")");
    await mkdir(join(root, "composeApp", "src", "commonMain", "kotlin"), { recursive: true });

    const info = await detectKmpProject(root);
    expect(info.isGradleProject).toBe(true);
    expect(info.layoutType).toBe("compose-multiplatform");
    expect(info.sharedModule?.name).toBe("composeApp");
  });
});

describe("KMP Project Auto-Adoption & Injection", () => {
  it("automatically adopts an existing KMP project with runtime and scenes", async () => {
    await writeFile(join(root, "settings.gradle.kts"), "include(\":shared\", \":desktopApp\")");
    await writeFile(join(root, "build.gradle.kts"), "// root build");
    await mkdir(join(root, "shared", "src", "commonMain", "kotlin"), { recursive: true });
    await mkdir(join(root, "desktopApp", "src", "jvmMain", "kotlin"), { recursive: true });

    const result = await adoptKmpProject(root, { name: "Adopted Space Game" });
    expect(result.success).toBe(true);
    expect(result.projectInfo.layoutType).toBe("multi-module-kmp");

    // Verify injected runtime files
    const runtimeDir = join(root, "shared", "src", "commonMain", "kotlin", "com", "playroom", "runtime");
    expect(existsSync(runtimeDir)).toBe(true);
    expect(existsSync(join(runtimeDir, "GameKitGame.java")) || existsSync(join(runtimeDir, "GameKitGame.kt"))).toBe(true);
    expect(existsSync(join(runtimeDir, "ktx", "PlayroomKtx.kt"))).toBe(true);

    // Verify GameKit folder structure
    expect(existsSync(join(root, "gamekit", "project.json"))).toBe(true);
    expect(existsSync(join(root, "gamekit", "scenes", "main.scene.json"))).toBe(true);
    expect(existsSync(join(root, "gamekit", "generated", "assets.json"))).toBe(true);

    const project = await readProject(root);
    expect(project.name).toBe("Adopted Space Game");

    const scene = await readScene(root, "main.scene.json");
    expect(scene.id).toBe("main");

    // Verify generated Gradle helper
    expect(existsSync(join(root, "gamekit.gradle.kts"))).toBe(true);
    const gradleHelper = await readFile(join(root, "gamekit.gradle.kts"), "utf8");
    expect(gradleHelper).toContain("gdxVersion");

    // Verify desktop launcher helper
    const launcherFile = join(root, "desktopApp", "src", "jvmMain", "kotlin", "PlayroomLauncher.kt");
    expect(existsSync(launcherFile)).toBe(true);
  });

  it("integrates autoInjectKmp through initProject", async () => {
    await writeFile(join(root, "settings.gradle"), "include 'core', 'lwjgl3'");
    await writeFile(join(root, "build.gradle"), "// groovy build");
    await mkdir(join(root, "core", "src", "main", "kotlin"), { recursive: true });

    const res = await initProject(root, { name: "Auto Groovy Init", autoInjectKmp: true });
    expect(res.projectPath).toBe(join(root, "gamekit", "project.json"));
    expect(existsSync(join(root, "core", "src", "main", "kotlin", "com", "playroom", "runtime"))).toBe(true);
    expect(existsSync(join(root, "gamekit.gradle"))).toBe(true);
  });
});
