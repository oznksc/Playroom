import { access, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { validateProject, validateScene, type GameKitProject, type GameKitScene } from "@gamekit/schema";
import { getGameKitRoot } from "./project.js";

export type DoctorIssue = {
  level: "error" | "warn" | "info";
  code: string;
  message: string;
  path?: string;
};

export type DoctorReport = {
  ok: boolean;
  projectPath: string;
  issues: DoctorIssue[];
  summary: {
    scenes: number;
    assets: number;
    levels: number;
    errors: number;
    warnings: number;
  };
};

export async function runDoctor(root: string): Promise<DoctorReport> {
  const issues: DoctorIssue[] = [];
  const gamekitRoot = getGameKitRoot(root);
  const projectPath = join(gamekitRoot, "project.json");

  try {
    await access(projectPath);
  } catch {
    issues.push({
      level: "error",
      code: "NO_PROJECT",
      message: "gamekit/project.json not found. Run `gamekit init` first.",
      path: projectPath,
    });
    return finalize(root, issues, 0, 0, 0);
  }

  let project: GameKitProject;
  try {
    const raw = JSON.parse(await readFile(projectPath, "utf8"));
    const result = validateProject(raw);
    if (!result.ok) {
      for (const err of result.errors) {
        issues.push({ level: "error", code: "PROJECT_INVALID", message: err, path: "gamekit/project.json" });
      }
      return finalize(root, issues, 0, 0, 0);
    }
    project = result.value;
  } catch (e) {
    issues.push({
      level: "error",
      code: "PROJECT_PARSE",
      message: e instanceof Error ? e.message : "Failed to parse project.json",
      path: "gamekit/project.json",
    });
    return finalize(root, issues, 0, 0, 0);
  }

  // Node version
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) {
    issues.push({
      level: "warn",
      code: "NODE_VERSION",
      message: `Node ${process.versions.node} detected; Node 18+ is recommended.`,
    });
  } else {
    issues.push({
      level: "info",
      code: "NODE_VERSION",
      message: `Node ${process.versions.node}`,
    });
  }

  const scenesDir = join(gamekitRoot, "scenes");
  const assetsDir = join(gamekitRoot, "assets");
  let sceneFiles: string[] = [];
  try {
    sceneFiles = (await readdir(scenesDir)).filter((f) => f.endsWith(".scene.json"));
  } catch {
    issues.push({ level: "error", code: "NO_SCENES_DIR", message: "gamekit/scenes/ missing" });
  }

  // Project scenes listed but missing on disk
  for (const listed of project.scenes) {
    if (!sceneFiles.includes(listed)) {
      issues.push({
        level: "error",
        code: "SCENE_MISSING",
        message: `Project lists scene "${listed}" but file is missing`,
        path: `gamekit/scenes/${listed}`,
      });
    }
  }

  // Orphan scene files
  for (const file of sceneFiles) {
    if (!project.scenes.includes(file)) {
      issues.push({
        level: "warn",
        code: "SCENE_ORPHAN",
        message: `Scene file "${file}" is not listed in project.scenes`,
        path: `gamekit/scenes/${file}`,
      });
    }
  }

  const usedAssetIds = new Set<string>();

  for (const file of sceneFiles) {
    const path = join(scenesDir, file);
    try {
      const raw = JSON.parse(await readFile(path, "utf8"));
      const result = validateScene(raw);
      if (!result.ok) {
        for (const err of result.errors) {
          issues.push({ level: "error", code: "SCENE_INVALID", message: err, path: `gamekit/scenes/${file}` });
        }
        continue;
      }
      collectAssetRefs(result.value, usedAssetIds);
    } catch (e) {
      issues.push({
        level: "error",
        code: "SCENE_PARSE",
        message: e instanceof Error ? e.message : "Parse failed",
        path: `gamekit/scenes/${file}`,
      });
    }
  }

  // Assets on disk vs project
  const projectAssetIds = new Set(project.assets.map((a) => a.id));
  for (const asset of project.assets) {
    const assetPath = join(assetsDir, asset.file);
    try {
      await stat(assetPath);
    } catch {
      issues.push({
        level: "error",
        code: "ASSET_FILE_MISSING",
        message: `Asset "${asset.id}" points to missing file "${asset.file}"`,
        path: `gamekit/assets/${asset.file}`,
      });
    }
  }

  for (const id of usedAssetIds) {
    if (!projectAssetIds.has(id) && id !== "" && id !== "default") {
      issues.push({
        level: "warn",
        code: "ASSET_UNREGISTERED",
        message: `Scene references assetId "${id}" which is not in project.assets`,
      });
    }
  }

  for (const asset of project.assets) {
    if (!usedAssetIds.has(asset.id)) {
      issues.push({
        level: "info",
        code: "ASSET_UNUSED",
        message: `Asset "${asset.id}" is not referenced by any scene`,
        path: `gamekit/assets/${asset.file}`,
      });
    }
  }

  // Levels
  for (const level of project.levels) {
    for (const sceneId of level.sceneIds) {
      const asFile = sceneId.endsWith(".scene.json") ? sceneId : `${sceneId}.scene.json`;
      const exists =
        project.scenes.includes(sceneId) ||
        project.scenes.includes(asFile) ||
        sceneFiles.includes(asFile) ||
        sceneFiles.includes(sceneId);
      if (!exists) {
        issues.push({
          level: "warn",
          code: "LEVEL_SCENE_MISSING",
          message: `Level "${level.name}" references scene "${sceneId}" which is not in the project`,
        });
      }
    }
  }

  if (project.activeScene && !project.scenes.includes(project.activeScene) && !sceneFiles.includes(project.activeScene)) {
    issues.push({
      level: "warn",
      code: "ACTIVE_SCENE_MISSING",
      message: `activeScene "${project.activeScene}" does not exist`,
    });
  }

  return finalize(root, issues, sceneFiles.length, project.assets.length, project.levels.length);
}

function collectAssetRefs(scene: GameKitScene, out: Set<string>): void {
  for (const entity of scene.entities) {
    for (const comp of entity.components) {
      if ("assetId" in comp && typeof (comp as { assetId?: string }).assetId === "string") {
        out.add((comp as { assetId: string }).assetId);
      }
      if ("fontAssetId" in comp && typeof (comp as { fontAssetId?: string }).fontAssetId === "string") {
        out.add((comp as { fontAssetId: string }).fontAssetId);
      }
      if ("tilesetId" in comp && typeof (comp as { tilesetId?: string }).tilesetId === "string") {
        out.add((comp as { tilesetId: string }).tilesetId);
      }
    }
  }
}

function finalize(
  root: string,
  issues: DoctorIssue[],
  scenes: number,
  assets: number,
  levels: number,
): DoctorReport {
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warn").length;
  return {
    ok: errors === 0,
    projectPath: join(getGameKitRoot(root), "project.json"),
    issues,
    summary: { scenes, assets, levels, errors, warnings },
  };
}
