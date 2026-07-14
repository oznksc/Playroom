import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import {
  type GameKitAsset,
  type GameKitComponent,
  type GameKitPrefab,
  type GameKitProject,
  type GameKitScene,
  type TransformComponent,
  createEmptyScene,
  createEntity,
  createId,
  createPrefab,
  createProject,
  prefabToJson,
  projectToJson,
  sceneToJson,
  slugify,
  validatePrefab,
  validateProject,
  validateScene,
  type GameSavePayload,
} from "@gamekit/schema";

export type InitResult = {
  projectPath: string;
  scenePath: string;
};

export async function initProject(root: string, options: { name?: string } = {}): Promise<InitResult> {
  const gamekitRoot = getGameKitRoot(root);
  const scenesRoot = join(gamekitRoot, "scenes");
  const assetsRoot = join(gamekitRoot, "assets");
  const generatedRoot = join(gamekitRoot, "generated");

  await mkdir(scenesRoot, { recursive: true });
  await mkdir(assetsRoot, { recursive: true });
  await mkdir(generatedRoot, { recursive: true });

  const projectPath = join(gamekitRoot, "project.json");
  const scenePath = join(scenesRoot, "main.scene.json");

  if (!await exists(projectPath)) {
    await writeFile(projectPath, projectToJson(createProject(options.name ?? "Playroom Game")));
  }

  if (!await exists(scenePath)) {
    await writeFile(scenePath, sceneToJson(createStarterScene()));
  }

  await generateAssetRegistry(root);
  return { projectPath, scenePath };
}

export async function readProject(root: string): Promise<GameKitProject> {
  const projectPath = join(getGameKitRoot(root), "project.json");
  const raw = JSON.parse(await readFile(projectPath, "utf8")) as unknown;
  const result = validateProject(raw);

  if (!result.ok) {
    throw new Error(`Invalid gamekit/project.json:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return result.value;
}

export async function writeProject(root: string, project: GameKitProject): Promise<void> {
  const result = validateProject(project);
  if (!result.ok) {
    throw new Error(`Cannot write invalid project:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }
  await writeFile(join(getGameKitRoot(root), "project.json"), projectToJson(project));
}

export async function readScene(root: string, file = "main.scene.json"): Promise<GameKitScene> {
  const scenePath = join(getGameKitRoot(root), "scenes", sanitizeSceneFile(file));
  const raw = JSON.parse(await readFile(scenePath, "utf8")) as unknown;
  const result = validateScene(raw);

  if (!result.ok) {
    throw new Error(`Invalid scene ${file}:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return result.value;
}

export async function getSceneMtime(root: string, file = "main.scene.json"): Promise<number> {
  const scenePath = join(getGameKitRoot(root), "scenes", sanitizeSceneFile(file));
  const st = await stat(scenePath);
  return st.mtimeMs;
}

export async function writeScene(root: string, scene: GameKitScene, file = "main.scene.json"): Promise<void> {
  const result = validateScene(scene);
  if (!result.ok) {
    throw new Error(`Cannot write invalid scene:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  await mkdir(join(getGameKitRoot(root), "scenes"), { recursive: true });
  await writeFile(join(getGameKitRoot(root), "scenes", sanitizeSceneFile(file)), sceneToJson(scene));
}

export async function listAssets(root: string): Promise<GameKitAsset[]> {
  await initProject(root);
  return (await readProject(root)).assets;
}

export async function importAsset(root: string, sourceFile: string): Promise<GameKitAsset> {
  await initProject(root);

  const extension = extname(sourceFile).toLowerCase();
  let kind: "image" | "audio" | "font";
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(extension)) {
    kind = "image";
  } else if ([".mp3", ".ogg", ".wav"].includes(extension)) {
    kind = "audio";
  } else if ([".ttf", ".otf"].includes(extension)) {
    kind = "font";
  } else {
    throw new Error("Supported formats: images (png, jpg, jpeg, webp, svg), audio (mp3, ogg, wav), fonts (ttf, otf).");
  }

  const sourceInfo = await stat(sourceFile);
  if (!sourceInfo.isFile()) {
    throw new Error(`Asset source is not a file: ${sourceFile}`);
  }

  const assetId = slugify(basename(sourceFile, extension));
  const fileName = uniqueAssetFileName(`${assetId}${extension}`);
  const assetsRoot = join(getGameKitRoot(root), "assets");
  const destination = join(assetsRoot, fileName);
  await pipeline(createReadStream(sourceFile), createWriteStream(destination));

  const project = await readProject(root);
  const asset: GameKitAsset = {
    id: assetId,
    file: fileName,
    kind
  };

  project.assets = [
    ...project.assets.filter((existing) => existing.id !== asset.id),
    asset
  ].sort((a, b) => a.id.localeCompare(b.id));

  await writeProject(root, project);
  await generateAssetRegistry(root);
  return asset;
}

export async function importAssetBuffer(root: string, fileName: string, data: Buffer): Promise<GameKitAsset> {
  await initProject(root);
  const extension = extname(fileName).toLowerCase();
  let kind: "image" | "audio" | "font";
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(extension)) {
    kind = "image";
  } else if ([".mp3", ".ogg", ".wav"].includes(extension)) {
    kind = "audio";
  } else if ([".ttf", ".otf"].includes(extension)) {
    kind = "font";
  } else {
    throw new Error("Supported formats: images (png, jpg, jpeg, webp, svg), audio (mp3, ogg, wav), fonts (ttf, otf).");
  }

  const assetId = slugify(basename(fileName, extension));
  const savedFile = uniqueAssetFileName(`${assetId}${extension}`);
  await writeFile(join(getGameKitRoot(root), "assets", savedFile), data);

  const project = await readProject(root);
  const asset: GameKitAsset = {
    id: assetId,
    file: savedFile,
    kind
  };
  project.assets = [
    ...project.assets.filter((existing) => existing.id !== asset.id),
    asset
  ].sort((a, b) => a.id.localeCompare(b.id));

  await writeProject(root, project);
  await generateAssetRegistry(root);
  return asset;
}

export async function removeAsset(root: string, assetId: string): Promise<void> {
  const project = await readProject(root);
  const asset = project.assets.find((a) => a.id === assetId);
  if (!asset) {
    throw new Error(`Asset "${assetId}" not found in project`);
  }

  const assetsRoot = join(getGameKitRoot(root), "assets");
  const filePath = join(assetsRoot, asset.file);
  try {
    await unlink(filePath);
  } catch {
    // File may already be missing — that's fine
  }

  project.assets = project.assets.filter((a) => a.id !== assetId);
  await writeProject(root, project);
  await generateAssetRegistry(root);
}

export async function generateAssetRegistry(root: string, platform: "mobile" | "web" = "mobile"): Promise<string> {
  const generatedRoot = join(getGameKitRoot(root), "generated");
  await mkdir(generatedRoot, { recursive: true });

  let project: GameKitProject;
  try {
    project = await readProject(root);
  } catch {
    project = createProject("Playroom Game");
  }

  const output = join(generatedRoot, "assets.ts");

  if (platform === "web") {
    const entries = project.assets
      .map((asset) => `  ${JSON.stringify(asset.id)}: new URL("../assets/${asset.file}", import.meta.url).href`)
      .join(",\n");

    await writeFile(output, `/* This file is generated by Playroom CLI. */
export const gamekitAssets: Record<string, string> = {
${entries}
};

export type GameKitAssetId = keyof typeof gamekitAssets;
`);
  } else {
    const entries = project.assets
      .map((asset) => `  ${JSON.stringify(asset.id)}: require("../assets/${asset.file}")`)
      .join(",\n");

    await writeFile(output, `/* This file is generated by Playroom CLI. */
/* eslint-disable @typescript-eslint/no-var-requires */
export const gamekitAssets = {
${entries}
} as const;

export type GameKitAssetId = keyof typeof gamekitAssets;
`);
  }

  return relative(root, output);
}

export async function getProjectSnapshot(root: string): Promise<{
  project: GameKitProject;
  scenes: string[];
  assets: GameKitAsset[];
  levels: GameKitProject["levels"];
  guiComponents: GameKitProject["guiComponents"];
}> {
  await initProject(root);
  const gamekitRoot = getGameKitRoot(root);
  const project = await readProject(root);
  const sceneFiles = await readdir(join(gamekitRoot, "scenes"));

  return {
    project,
    scenes: sceneFiles.filter((file) => file.endsWith(".scene.json")).sort(),
    assets: project.assets,
    levels: project.levels ?? [],
    guiComponents: project.guiComponents ?? []
  };
}

/**
 * Resolve the gamekit data directory from a project root.
 * Accepts either:
 * - project root containing `gamekit/project.json` (normal)
 * - the `gamekit/` folder itself (user selected it in the file picker)
 */
export function getGameKitRoot(root: string): string {
  // Prefer treating root as the gamekit folder when it already looks like one
  // (user picked `.../gamekit` in the file dialog).
  if (existsSync(join(root, "project.json")) && existsSync(join(root, "scenes"))) {
    return root;
  }
  return join(root, "gamekit");
}

function getPrefabsRoot(root: string): string {
  return join(getGameKitRoot(root), "prefabs");
}

export type PrefabSummary = {
  file: string;
  id: string;
  name: string;
  componentTypes: string[];
  sourceEntityName?: string;
};

export async function listPrefabs(root: string): Promise<PrefabSummary[]> {
  const dir = getPrefabsRoot(root);
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".prefab.json")).sort();
    const out: PrefabSummary[] = [];
    for (const file of files) {
      try {
        const prefab = await readPrefab(root, file);
        out.push({
          file,
          id: prefab.id,
          name: prefab.name,
          componentTypes: prefab.components.map((c) => c.type),
          sourceEntityName: prefab.sourceEntityName,
        });
      } catch {
        out.push({ file, id: file, name: file, componentTypes: [] });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function readPrefab(root: string, file: string): Promise<GameKitPrefab> {
  const path = join(getPrefabsRoot(root), basename(file));
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  const result = validatePrefab(raw);
  if (!result.ok) {
    throw new Error(`Invalid prefab ${file}:\n${result.errors.map((e) => `- ${e}`).join("\n")}`);
  }
  return result.value;
}

export async function createPrefabFromEntity(
  root: string,
  sceneFile: string,
  entityId: string,
  name?: string,
): Promise<{ file: string; prefab: GameKitPrefab }> {
  const scene = await readScene(root, sceneFile);
  const entity = scene.entities.find((e) => e.id === entityId);
  if (!entity) throw new Error(`Entity not found: ${entityId}`);

  const prefabName = name?.trim() || entity.name;
  const prefab = createPrefab(prefabName, entity.components, entity.name);
  const file = `${slugify(prefabName) || prefab.id}.prefab.json`;
  await mkdir(getPrefabsRoot(root), { recursive: true });
  await writeFile(join(getPrefabsRoot(root), file), prefabToJson(prefab));
  return { file, prefab };
}

export async function instantiatePrefab(
  root: string,
  sceneFile: string,
  prefabId: string,
  options: { x?: number; y?: number; name?: string } = {},
): Promise<{ entityId: string; name: string }> {
  const file = prefabId.endsWith(".prefab.json")
    ? prefabId
    : `${slugify(prefabId)}.prefab.json`;

  let prefab: GameKitPrefab;
  try {
    prefab = await readPrefab(root, file);
  } catch {
    const all = await listPrefabs(root);
    const match = all.find((p) => p.id === prefabId || p.name === prefabId || p.file === file);
    if (!match) throw new Error(`Prefab not found: ${prefabId}`);
    prefab = await readPrefab(root, match.file);
  }

  const scene = await readScene(root, sceneFile);
  const instanceName = options.name?.trim() || prefab.name;
  const entity = createEntity(instanceName, {
    x: options.x ?? 0,
    y: options.y ?? 0,
  });
  entity.id = createId(instanceName);

  const components = structuredClone(prefab.components) as GameKitComponent[];
  const hasTransform = components.some((c) => c.type === "Transform");
  if (!hasTransform) {
    entity.components = [
      {
        type: "Transform",
        position: { x: options.x ?? 0, y: options.y ?? 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      ...components,
    ];
  } else {
    entity.components = components.map((c) => {
      if (c.type !== "Transform") return c;
      const t = c as TransformComponent;
      if (options.x !== undefined || options.y !== undefined) {
        return {
          ...t,
          position: {
            x: options.x ?? t.position.x,
            y: options.y ?? t.position.y,
          },
        };
      }
      return t;
    });
  }

  scene.entities.push(entity);
  await writeScene(root, scene, sceneFile);
  return { entityId: entity.id, name: entity.name };
}

export type SkillSummary = {
  id: string;
  name: string;
  description: string;
  entityCount: number;
};

function getSkillsDir(): string {
  // packages/cli/src or packages/cli/dist → packages/mcp/skills
  return fileURLToPath(new URL("../../mcp/skills/", import.meta.url));
}

export async function listSkills(): Promise<SkillSummary[]> {
  const skillsDir = getSkillsDir();
  try {
    const files = (await readdir(skillsDir)).filter((f) => f.endsWith(".json"));
    const skills: SkillSummary[] = [];
    for (const file of files) {
      try {
        const raw = JSON.parse(await readFile(join(skillsDir, file), "utf8")) as {
          name?: string;
          description?: string;
          entities?: unknown[];
        };
        skills.push({
          id: file.replace(/\.json$/, ""),
          name: raw.name ?? file,
          description: raw.description ?? "",
          entityCount: raw.entities?.length ?? 0,
        });
      } catch {
        // skip
      }
    }
    return skills.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

export async function applySkill(
  root: string,
  skillId: string,
  sceneName?: string,
): Promise<{ filename: string; sceneId: string; entityCount: number }> {
  const skillsDir = getSkillsDir();
  const skillPath = join(skillsDir, `${skillId}.json`);
  const skill = JSON.parse(await readFile(skillPath, "utf8")) as {
    name: string;
    orientation?: "landscape" | "portrait";
    viewport?: GameKitScene["viewport"];
    gravity?: GameKitScene["gravity"];
    inputMap?: GameKitScene["inputMap"];
    entities: Array<{ name: string; components: GameKitComponent[] }>;
  };

  const scene = createEmptyScene(sceneName ?? skill.name);
  if (skill.viewport) scene.viewport = skill.viewport;
  if (skill.gravity) scene.gravity = skill.gravity;
  if (skill.inputMap) scene.inputMap = skill.inputMap;
  if (skill.orientation) {
    scene.responsive.orientation = skill.orientation;
    scene.responsive.referenceWidth = scene.viewport.width;
    scene.responsive.referenceHeight = scene.viewport.height;
  }

  const idMap = new Map<string, string>();
  for (const se of skill.entities ?? []) {
    const entity = createEntity(se.name, { x: 0, y: 0 });
    // Prefer skill-provided components (includes Transform)
    entity.components = structuredClone(se.components) as GameKitComponent[];
    idMap.set(se.name, entity.id);
    scene.entities.push(entity);
  }
  for (const entity of scene.entities) {
    for (const comp of entity.components) {
      if (comp.type === "CameraFollow" && typeof (comp as { targetId?: string }).targetId === "string") {
        const resolved = idMap.get((comp as { targetId: string }).targetId);
        if (resolved) (comp as { targetId: string }).targetId = resolved;
      }
    }
  }

  const filename = `${slugify(sceneName ?? skill.name) || skillId}.scene.json`;
  await writeScene(root, scene, filename);

  const project = await readProject(root);
  if (!project.scenes.includes(filename)) {
    project.scenes.push(filename);
  }
  project.activeScene = filename;
  await writeProject(root, project);

  return { filename, sceneId: scene.id, entityCount: scene.entities.length };
}

export async function removePrefab(root: string, prefabId: string): Promise<string> {
  const file = prefabId.endsWith(".prefab.json")
    ? prefabId
    : `${slugify(prefabId)}.prefab.json`;
  const path = join(getPrefabsRoot(root), basename(file));
  try {
    await unlink(path);
    return basename(file);
  } catch {
    // try by id match
    const all = await listPrefabs(root);
    const match = all.find((p) => p.id === prefabId || p.name === prefabId);
    if (!match) throw new Error(`Prefab not found: ${prefabId}`);
    await unlink(join(getPrefabsRoot(root), match.file));
    return match.file;
  }
}

export async function exportProject(root: string, outputDir: string, platform: "mobile" | "web" = "mobile"): Promise<string> {
  const { project, scenes, assets } = await getProjectSnapshot(root);
  const gamekitRoot = getGameKitRoot(root);
  const outputGamekit = join(outputDir, "gamekit");
  const playroomRoot = fileURLToPath(new URL("../../..", import.meta.url));
  const pkgJson = JSON.parse(await readFile(join(playroomRoot, "package.json"), "utf8")) as Record<string, unknown>;

  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputGamekit, "scenes"), { recursive: true });
  await mkdir(join(outputGamekit, "assets"), { recursive: true });
  await mkdir(join(outputGamekit, "generated"), { recursive: true });

  if (platform === "web") {
    const templateDir = join(playroomRoot, "templates", "web-game");
    const filesToCopy = [
      { src: join(templateDir, "index.html"), dest: join(outputDir, "index.html") },
      { src: join(templateDir, "vite.config.ts"), dest: join(outputDir, "vite.config.ts") },
      { src: join(templateDir, "tsconfig.json"), dest: join(outputDir, "tsconfig.json") },
    ];

    for (const { src, dest } of filesToCopy) {
      if (await exists(src)) {
        await writeFile(dest, await readFile(src, "utf8"));
      }
    }

    await mkdir(join(outputDir, "src"), { recursive: true });
    const mainSrc = join(templateDir, "src", "main.ts");
    if (await exists(mainSrc)) {
      await writeFile(join(outputDir, "src", "main.ts"), await readFile(mainSrc, "utf8"));
    }

    const templatePkg = { ...JSON.parse(await readFile(join(templateDir, "package.json"), "utf8")) as Record<string, unknown> };
    templatePkg.name = project.name.toLowerCase().replace(/\s+/g, "-");
    const deps = templatePkg.dependencies as Record<string, string>;
    deps["@gamekit/runtime-web"] = (pkgJson.version as string) ?? "0.1.0";
    deps["phaser"] = "^3.87.0";
    await writeFile(join(outputDir, "package.json"), JSON.stringify(templatePkg, null, 2) + "\n");
  } else {
    const templateDir = join(playroomRoot, "templates", "expo-game");
    const filesToCopy = [
      { src: join(templateDir, "App.tsx"), dest: join(outputDir, "App.tsx") },
      { src: join(templateDir, "app.json"), dest: join(outputDir, "app.json") },
      { src: join(templateDir, "babel.config.js"), dest: join(outputDir, "babel.config.js") },
      { src: join(templateDir, "tsconfig.json"), dest: join(outputDir, "tsconfig.json") },
    ];

    for (const { src, dest } of filesToCopy) {
      if (await exists(src)) {
        await writeFile(dest, await readFile(src, "utf8"));
      }
    }

    const templatePkg = { ...JSON.parse(await readFile(join(templateDir, "package.json"), "utf8")) as Record<string, unknown> };
    templatePkg.name = project.name.toLowerCase().replace(/\s+/g, "-");
    (templatePkg.dependencies as Record<string, string>)["@gamekit/runtime"] = (pkgJson.version as string) ?? "0.1.0";
    await writeFile(join(outputDir, "package.json"), JSON.stringify(templatePkg, null, 2) + "\n");
  }

  for (const sceneFile of scenes) {
    const scenePath = join(gamekitRoot, "scenes", sceneFile);
    await writeFile(join(outputGamekit, "scenes", sceneFile), await readFile(scenePath, "utf8"));
  }

  for (const asset of assets) {
    const assetSrc = join(gamekitRoot, "assets", asset.file);
    if (await exists(assetSrc)) {
      await writeFile(join(outputGamekit, "assets", asset.file), await readFile(assetSrc));
    }
  }

  await writeProject(outputDir, project);
  await generateAssetRegistry(outputDir, platform);

  return outputDir;
}

export async function saveGameState(root: string, slotName: string): Promise<void> {
  const gamekitRoot = getGameKitRoot(root);
  const project = await readProject(root);
  const savesDir = join(gamekitRoot, "saves");
  await mkdir(savesDir, { recursive: true });

  let persistentState: Record<string, unknown> = {};
  try {
    persistentState = JSON.parse(await readFile(join(gamekitRoot, "state.json"), "utf-8"));
  } catch {}

  const payload: GameSavePayload = {
    version: 1,
    persistentState,
    levels: project.levels.map((l) => ({ id: l.id, unlocked: l.unlocked })),
    currentSceneId: project.activeScene ?? null,
    currentLevelId: null,
  };

  await writeFile(join(savesDir, `${slotName}.json`), JSON.stringify(payload, null, 2));
}

export async function loadGameState(root: string, slotName: string): Promise<void> {
  const gamekitRoot = getGameKitRoot(root);
  const slotPath = join(gamekitRoot, "saves", `${slotName}.json`);
  const content = await readFile(slotPath, "utf-8");
  const payload = JSON.parse(content) as GameSavePayload;

  const project = await readProject(root);
  for (const level of project.levels) {
    const saved = payload.levels.find((l) => l.id === level.id);
    if (saved) level.unlocked = saved.unlocked;
  }
  if (payload.currentSceneId) project.activeScene = payload.currentSceneId;
  await writeProject(root, project);

  await writeFile(join(gamekitRoot, "state.json"), JSON.stringify(payload.persistentState, null, 2));
}

export type SaveSlotInfo = {
  slotName: string;
  levelsUnlocked: number;
  totalLevels: number;
  currentScene: string | null;
  savedAt: string;
};

export async function listSaveSlots(root: string): Promise<SaveSlotInfo[]> {
  const gamekitRoot = getGameKitRoot(root);
  const savesDir = join(gamekitRoot, "saves");
  let files: string[];
  try {
    files = await readdir(savesDir);
  } catch {
    return [];
  }
  const slots: SaveSlotInfo[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const content = JSON.parse(await readFile(join(savesDir, file), "utf-8")) as GameSavePayload;
      slots.push({
        slotName: file.replace(".json", ""),
        levelsUnlocked: content.levels.filter((l) => l.unlocked).length,
        totalLevels: content.levels.length,
        currentScene: content.currentSceneId,
        savedAt: "",
      });
    } catch {}
  }
  return slots;
}

function createStarterScene(): GameKitScene {
  const scene = createEmptyScene("Main Scene");
  scene.entities = [
    {
      id: "player",
      name: "Player",
      components: [
        {
          type: "Transform",
          position: { x: 120, y: 360 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        },
        {
          type: "Sprite",
          assetId: "player",
          width: 48,
          height: 64,
          anchor: { x: 0.5, y: 1 }
        },
        {
          type: "AabbCollider",
          offset: { x: -24, y: -64 },
          size: { x: 48, y: 64 },
          isStatic: false
        },
        {
          type: "PlayerController",
          speed: 240,
          jumpVelocity: 620,
          gravity: 1800
        }
      ]
    },
    {
      id: "ground",
      name: "Ground",
      components: [
        {
          type: "Transform",
          position: { x: 0, y: 520 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        },
        {
          type: "AabbCollider",
          offset: { x: 0, y: 0 },
          size: { x: 900, y: 48 },
          isStatic: true
        }
      ]
    },
    {
      id: "camera",
      name: "Camera",
      components: [
        {
          type: "Transform",
          position: { x: 0, y: 0 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        },
        {
          type: "CameraFollow",
          targetId: "player",
          smoothing: 0.18
        }
      ]
    }
  ];
  return scene;
}

function sanitizeSceneFile(file: string): string {
  if (!/^[a-zA-Z0-9._-]+\.scene\.json$/.test(file)) {
    throw new Error(`Invalid scene file name: ${file}`);
  }
  return file;
}

function uniqueAssetFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
