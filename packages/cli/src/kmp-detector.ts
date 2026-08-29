import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type KmpLayoutType =
  | "multi-module-kmp"     // shared/src/commonMain/kotlin
  | "compose-multiplatform" // composeApp/src/commonMain/kotlin
  | "libgdx-standard"      // core/src/main/kotlin or core/src/main/java
  | "single-module-jvm"    // src/main/kotlin or src/main/java
  | "generic-gradle"
  | "none";

export interface KmpModuleInfo {
  name: string;
  path: string;
  sourceDir: string;
  hasKotlin: boolean;
  hasJava: boolean;
  buildScriptPath?: string;
  buildScriptType?: "kts" | "groovy";
}

export interface KmpProjectInfo {
  isGradleProject: boolean;
  layoutType: KmpLayoutType;
  root: string;
  buildScriptType: "kts" | "groovy" | null;
  settingsScriptPath?: string;
  sharedModule?: KmpModuleInfo;
  desktopModule?: KmpModuleInfo;
  androidModule?: KmpModuleInfo;
  iosModule?: KmpModuleInfo;
  detectedModules: string[];
  alreadyAdopted: boolean;
}

/**
 * Inspect a directory to detect whether it is an existing Kotlin Multiplatform (KMP)
 * or Gradle project and locate candidate shared logic and launcher source roots.
 */
export async function detectKmpProject(root: string): Promise<KmpProjectInfo> {
  const hasSettingsKts = existsSync(join(root, "settings.gradle.kts"));
  const hasSettingsGroovy = existsSync(join(root, "settings.gradle"));
  const hasRootBuildKts = existsSync(join(root, "build.gradle.kts"));
  const hasRootBuildGroovy = existsSync(join(root, "build.gradle"));
  const hasGradlew = existsSync(join(root, "gradlew")) || existsSync(join(root, "gradlew.bat"));

  const isGradleProject =
    hasSettingsKts || hasSettingsGroovy || hasRootBuildKts || hasRootBuildGroovy || hasGradlew;

  if (!isGradleProject) {
    return {
      isGradleProject: false,
      layoutType: "none",
      root,
      buildScriptType: null,
      detectedModules: [],
      alreadyAdopted: existsSync(join(root, "gamekit", "project.json")),
    };
  }

  const buildScriptType: "kts" | "groovy" =
    hasSettingsKts || hasRootBuildKts ? "kts" : "groovy";
  const settingsScriptPath = hasSettingsKts
    ? join(root, "settings.gradle.kts")
    : hasSettingsGroovy
      ? join(root, "settings.gradle")
      : undefined;

  let detectedModules: string[] = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    detectedModules = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "build")
      .map((e) => e.name);
  } catch {
    detectedModules = [];
  }

  // Detect shared logic source directory
  let sharedModule: KmpModuleInfo | undefined;
  let layoutType: KmpLayoutType = "generic-gradle";

  // Check 1: Multi-Module KMP (e.g. shared/src/commonMain/kotlin)
  if (existsSync(join(root, "shared", "src", "commonMain", "kotlin"))) {
    layoutType = "multi-module-kmp";
    sharedModule = {
      name: "shared",
      path: join(root, "shared"),
      sourceDir: join(root, "shared", "src", "commonMain", "kotlin"),
      hasKotlin: true,
      hasJava: existsSync(join(root, "shared", "src", "commonMain", "java")),
      buildScriptPath: getModuleBuildScript(root, "shared"),
      buildScriptType: getModuleBuildScriptType(root, "shared"),
    };
  }
  // Check 2: Compose Multiplatform (e.g. composeApp/src/commonMain/kotlin)
  else if (existsSync(join(root, "composeApp", "src", "commonMain", "kotlin"))) {
    layoutType = "compose-multiplatform";
    sharedModule = {
      name: "composeApp",
      path: join(root, "composeApp"),
      sourceDir: join(root, "composeApp", "src", "commonMain", "kotlin"),
      hasKotlin: true,
      hasJava: false,
      buildScriptPath: getModuleBuildScript(root, "composeApp"),
      buildScriptType: getModuleBuildScriptType(root, "composeApp"),
    };
  }
  // Check 3: Standard LibGDX (e.g. core/src/main/kotlin or core/src/main/java)
  else if (
    existsSync(join(root, "core", "src", "main", "kotlin")) ||
    existsSync(join(root, "core", "src", "main", "java"))
  ) {
    layoutType = "libgdx-standard";
    const hasKt = existsSync(join(root, "core", "src", "main", "kotlin"));
    sharedModule = {
      name: "core",
      path: join(root, "core"),
      sourceDir: hasKt
        ? join(root, "core", "src", "main", "kotlin")
        : join(root, "core", "src", "main", "java"),
      hasKotlin: hasKt,
      hasJava: existsSync(join(root, "core", "src", "main", "java")),
      buildScriptPath: getModuleBuildScript(root, "core"),
      buildScriptType: getModuleBuildScriptType(root, "core"),
    };
  }
  // Check 4: Single Module (e.g. src/main/kotlin or src/main/java)
  else if (
    existsSync(join(root, "src", "main", "kotlin")) ||
    existsSync(join(root, "src", "main", "java"))
  ) {
    layoutType = "single-module-jvm";
    const hasKt = existsSync(join(root, "src", "main", "kotlin"));
    sharedModule = {
      name: "root",
      path: root,
      sourceDir: hasKt ? join(root, "src", "main", "kotlin") : join(root, "src", "main", "java"),
      hasKotlin: hasKt,
      hasJava: existsSync(join(root, "src", "main", "java")),
      buildScriptPath: hasRootBuildKts
        ? join(root, "build.gradle.kts")
        : hasRootBuildGroovy
          ? join(root, "build.gradle")
          : undefined,
      buildScriptType,
    };
  }

  // Detect launcher modules
  const desktopModule = findModule(root, [
    "desktopApp",
    "desktop",
    "lwjgl3",
    "desktopApp/src/jvmMain/kotlin",
    "desktop/src/main/kotlin",
    "lwjgl3/src/main/kotlin",
    "lwjgl3/src/main/java",
  ]);

  const androidModule = findModule(root, [
    "androidApp",
    "android",
    "androidApp/src/main/kotlin",
    "android/src/main/kotlin",
    "android/src/main/java",
  ]);

  const iosModule = findModule(root, [
    "iosApp",
    "ios",
    "iosApp/src/iosMain/kotlin",
    "ios/src/main/kotlin",
  ]);

  const alreadyAdopted =
    existsSync(join(root, "gamekit", "project.json")) ||
    (sharedModule !== undefined &&
      existsSync(join(sharedModule.sourceDir, "com", "playroom", "runtime", "GameKitGame.kt")));

  return {
    isGradleProject,
    layoutType,
    root,
    buildScriptType,
    settingsScriptPath,
    sharedModule,
    desktopModule,
    androidModule,
    iosModule,
    detectedModules,
    alreadyAdopted,
  };
}

function getModuleBuildScript(root: string, moduleName: string): string | undefined {
  const kts = join(root, moduleName, "build.gradle.kts");
  if (existsSync(kts)) return kts;
  const groovy = join(root, moduleName, "build.gradle");
  if (existsSync(groovy)) return groovy;
  return undefined;
}

function getModuleBuildScriptType(root: string, moduleName: string): "kts" | "groovy" | undefined {
  if (existsSync(join(root, moduleName, "build.gradle.kts"))) return "kts";
  if (existsSync(join(root, moduleName, "build.gradle"))) return "groovy";
  return undefined;
}

function findModule(root: string, candidates: string[]): KmpModuleInfo | undefined {
  for (const candidate of candidates) {
    const candidatePath = join(root, candidate.split("/")[0]);
    if (existsSync(candidatePath)) {
      const name = candidate.split("/")[0];
      const hasJvmMain = existsSync(join(candidatePath, "src", "jvmMain", "kotlin"));
      const hasCommonMain = existsSync(join(candidatePath, "src", "commonMain", "kotlin"));
      const hasMainKt = existsSync(join(candidatePath, "src", "main", "kotlin"));
      const hasJava = existsSync(join(candidatePath, "src", "main", "java"));
      const hasKotlin = hasJvmMain || hasCommonMain || hasMainKt;
      const sourceDir = hasJvmMain
        ? join(candidatePath, "src", "jvmMain", "kotlin")
        : hasCommonMain
          ? join(candidatePath, "src", "commonMain", "kotlin")
          : hasMainKt
            ? join(candidatePath, "src", "main", "kotlin")
            : join(candidatePath, "src", "main", "java");

      return {
        name,
        path: candidatePath,
        sourceDir,
        hasKotlin,
        hasJava,
        buildScriptPath: getModuleBuildScript(root, name),
        buildScriptType: getModuleBuildScriptType(root, name),
      };
    }
  }
  return undefined;
}
