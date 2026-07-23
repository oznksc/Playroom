import { createReadStream, createWriteStream, existsSync } from "node:fs";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import {
  type GameKitAsset,
  type GameKitComponent,
  type GameKitPrefab,
  type GameKitProject,
  type GameKitScene,
  type ScriptComponent,
  type TransformComponent,
  createEmptyScene,
  createEntity,
  createId,
  createMenuScene,
  createPrefab,
  createProject,
  createSettingsScene,
  createStarterGameplayScene,
  prefabToJson,
  projectToJson,
  sceneToJson,
  slugify,
  validatePrefab,
  validateProject,
  validateScene,
  findLevelForScene,
  resolveGameRules,
  DEFAULT_GAME_RULES,
  GUI_MENU_EVENTS,
  type GameSavePayload,
} from "@gamekit/schema";
import {
  bareSceneName,
  generateMobileApp,
  generateWebMain,
  orderSceneFiles,
  resolveTransitionMs,
  sceneFileToImportVar,
  type BootstrapInput,
  type BootstrapScene,
} from "./export-bootstrap.js";
import { getSkillPack } from "./skill-packs.js";

export type InitResult = {
  projectPath: string;
  scenePath: string;
  /** Primary entry scene for the editor (menu when present). */
  activeScenePath: string;
};

export async function initProject(root: string, options: { name?: string } = {}): Promise<InitResult> {
  const gamekitRoot = getGameKitRoot(root);
  const scenesRoot = join(gamekitRoot, "scenes");
  const assetsRoot = join(gamekitRoot, "assets");
  const generatedRoot = join(gamekitRoot, "generated");

  await mkdir(scenesRoot, { recursive: true });
  await mkdir(assetsRoot, { recursive: true });
  await mkdir(generatedRoot, { recursive: true });

  const projectName = options.name ?? "Playroom Game";
  const projectPath = join(gamekitRoot, "project.json");
  const menuPath = join(scenesRoot, "menu.scene.json");
  const settingsPath = join(scenesRoot, "settings.scene.json");
  const scenePath = join(scenesRoot, "main.scene.json");

  if (!await exists(projectPath)) {
    await writeFile(projectPath, projectToJson(createProject(projectName)));
  }

  // Starter shell: menu + settings + gameplay (idempotent — never overwrite).
  // Skip creating default main when the project already lists other scene files
  // (custom samples / multi-scene exports must not grow a phantom main.scene.json).
  if (!await exists(menuPath)) {
    await writeFile(menuPath, sceneToJson(createMenuScene(projectName)));
  }
  if (!await exists(settingsPath)) {
    await writeFile(settingsPath, sceneToJson(createSettingsScene()));
  }
  let projectSceneList: string[] = [];
  try {
    if (await exists(projectPath)) {
      const existing = JSON.parse(await readFile(projectPath, "utf8")) as { scenes?: string[] };
      projectSceneList = existing.scenes ?? [];
    }
  } catch {
    projectSceneList = [];
  }
  const hasCustomGameplay = projectSceneList.some(
    (f) => f !== "menu.scene.json" && f !== "settings.scene.json" && f !== "main.scene.json",
  );
  if (!await exists(scenePath) && !hasCustomGameplay) {
    await writeFile(scenePath, sceneToJson(createStarterGameplayScene()));
  }

  await generateAssetRegistry(root);

  let activeScenePath = scenePath;
  try {
    const project = await readProject(root);
    const active = project.activeScene ?? project.scenes[0] ?? "main.scene.json";
    activeScenePath = join(scenesRoot, sanitizeSceneFile(active));
  } catch {
    // project may be mid-write or legacy; fall back to main
  }

  return { projectPath, scenePath, activeScenePath };
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

// ── Recipes (effects / mechanics / scripts / animations / gestures) ──────────

export type RecipeSummary = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  targets: string;
  paramKeys: string[];
};

export async function listRecipes(options?: {
  category?: string;
  tags?: string[];
  query?: string;
}): Promise<RecipeSummary[]> {
  const { listRecipes: list } = await import("@gamekit/mcp/recipes");
  return list({
    category: options?.category as
      | "effect"
      | "mechanic"
      | "script"
      | "animation"
      | "gesture"
      | undefined,
    tags: options?.tags,
    query: options?.query,
  });
}

export async function describeRecipe(recipeId: string) {
  const { loadRecipe } = await import("@gamekit/mcp/recipes");
  const recipe = await loadRecipe(recipeId);
  if (!recipe) {
    throw new Error(`Recipe not found: ${recipeId}`);
  }
  return recipe;
}

export async function applyRecipe(
  root: string,
  recipeId: string,
  options: {
    scenePath: string;
    entityId?: string;
    params?: Record<string, string | number | boolean>;
  },
): Promise<{
  recipeId: string;
  scenePath: string;
  entityId?: string;
  appliedComponents: string[];
  appliedInputActions: string[];
  skippedComponents: string[];
  warnings: string[];
}> {
  const { loadRecipe, applyRecipeToScene } = await import("@gamekit/mcp/recipes");
  const recipe = await loadRecipe(recipeId);
  if (!recipe) {
    throw new Error(`Recipe not found: ${recipeId}`);
  }
  if (recipe.targets === "entity" && !options.entityId) {
    throw new Error(`Recipe "${recipeId}" targets an entity — provide --entity <id>`);
  }

  const sceneFile = options.scenePath.endsWith(".scene.json")
    ? options.scenePath
    : `${options.scenePath}.scene.json`;
  const scene = await readScene(root, sceneFile);
  const result = applyRecipeToScene(scene, recipe, {
    entityId: options.entityId,
    params: options.params,
  });
  result.scenePath = sceneFile;
  await writeScene(root, scene, sceneFile);
  return result;
}

export type ApplySkillResult = {
  filename: string;
  sceneId: string;
  entityCount: number;
  assetsCopied: string[];
  skillName: string;
};

type SkillTemplateFile = {
  name: string;
  description?: string;
  orientation?: "landscape" | "portrait";
  viewport?: GameKitScene["viewport"];
  gravity?: GameKitScene["gravity"];
  inputMap?: GameKitScene["inputMap"];
  entities: Array<{ name: string; components: GameKitComponent[]; tags?: string[] }>;
  requiredAssets?: Array<{ id: string; file: string; sourceFile?: string }>;
};

export async function applySkill(
  root: string,
  skillId: string,
  sceneName?: string,
): Promise<ApplySkillResult> {
  await initProject(root);
  const skillsDir = getSkillsDir();
  const skillPath = join(skillsDir, `${skillId}.json`);
  let skill: SkillTemplateFile;
  try {
    skill = JSON.parse(await readFile(skillPath, "utf8")) as SkillTemplateFile;
  } catch {
    throw new Error(`Skill not found: ${skillId}. Run \`gamekit skills list\`.`);
  }

  const displayName = sceneName ?? skill.name;
  const scene = createEmptyScene(displayName);
  // Stable id for switchScene / levels (skill file id).
  scene.id = skillId;
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
    entity.components = structuredClone(se.components) as GameKitComponent[];
    if (se.tags?.length) entity.tags = [...se.tags];
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

  // Pack tags (coins / goals / hazards)
  const pack = getSkillPack(skillId);
  for (const rule of pack.tagEntities ?? []) {
    for (const entity of scene.entities) {
      if (rule.nameMatch.test(entity.name)) {
        const tags = new Set([...(entity.tags ?? []), ...rule.tags]);
        entity.tags = [...tags];
      }
    }
  }

  // Game controller for pause/menu GUI actions
  ensureGameController(scene, skillId);

  // HUD instance
  if (!scene.gui.componentInstances?.length) {
    scene.gui.componentInstances = [
      { id: "inst-hud", componentId: "hud", x: 0, y: 0, visible: true },
    ];
  }

  // Baseline rules (recipes may extend).
  scene.gameRules = resolveGameRules({
    ...DEFAULT_GAME_RULES,
    fallDeathEnabled: pack.fallDeathEnabled ?? true,
    lives: pack.lives ?? 3,
    onFall: (pack.lives ?? 3) > 0 ? "respawn" : "gameOver",
    hazards: [],
    objectives: [],
    onWin: [{ type: "completeLevel" }],
    onLose: [],
  });

  const filename = `${skillId}.scene.json`;
  await writeScene(root, scene, filename);

  const project = await readProject(root);
  if (!project.scenes.includes(filename)) {
    project.scenes.push(filename);
  }

  const assetsCopied: string[] = [];
  const assetsRoot = join(getGameKitRoot(root), "assets");
  await mkdir(assetsRoot, { recursive: true });
  for (const asset of skill.requiredAssets ?? []) {
    if (!project.assets.find((a) => a.id === asset.id)) {
      project.assets.push({ id: asset.id, file: asset.file, kind: "image" });
    }
    const sourceName = asset.sourceFile ?? asset.file;
    const sourcePath = join(skillsDir, "assets", sourceName);
    const destPath = join(assetsRoot, asset.file);
    try {
      await access(sourcePath);
      await copyFile(sourcePath, destPath);
      assetsCopied.push(asset.id);
    } catch {
      // Asset may already exist or be missing from skill bundle
    }
  }
  project.assets.sort((a, b) => a.id.localeCompare(b.id));
  await writeProject(root, project);

  return {
    filename,
    sceneId: scene.id,
    entityCount: scene.entities.length,
    assetsCopied,
    skillName: skill.name,
  };
}

function ensureGameController(scene: GameKitScene, gameplaySceneId: string): void {
  if (scene.entities.some((e) => e.id === "game-controller")) return;
  scene.entities.push({
    id: "game-controller",
    name: "Game Controller",
    components: [
      {
        type: "Transform",
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      {
        type: "Script",
        handlers: [
          {
            event: GUI_MENU_EVENTS.backToMenu,
            actions: [{ type: "switchScene", sceneId: "menu" }],
          },
          {
            event: GUI_MENU_EVENTS.restartLevel,
            actions: [{ type: "switchScene", sceneId: gameplaySceneId }],
          },
          {
            event: GUI_MENU_EVENTS.retryGame,
            actions: [{ type: "switchScene", sceneId: gameplaySceneId }],
          },
          {
            event: GUI_MENU_EVENTS.nextLevel,
            actions: [{ type: "nextLevel" }],
          },
          { event: GUI_MENU_EVENTS.resumeGame, actions: [] },
        ],
      },
    ],
  });
}

/**
 * Point menu shell + project levels/transitions at a gameplay scene id.
 * Drops the starter main.scene.json when a skill gameplay scene replaces it.
 */
export async function wireShellToGameplay(
  root: string,
  gameplaySceneId: string,
  gameplayFile: string,
): Promise<void> {
  const menu = await readScene(root, "menu.scene.json");
  for (const entity of menu.entities) {
    for (const comp of entity.components) {
      if (comp.type !== "Script") continue;
      const script = comp as ScriptComponent;
      for (const handler of script.handlers) {
        for (const action of handler.actions) {
          if (action.type === "switchScene" && action.sceneId === "main") {
            action.sceneId = gameplaySceneId;
          }
        }
      }
    }
  }
  await writeScene(root, menu, "menu.scene.json");

  const project = await readProject(root);
  project.activeScene = "menu.scene.json";
  project.levels = [
    {
      id: "level-1",
      name: "Level 1",
      order: 1,
      sceneIds: [gameplaySceneId],
      unlocked: true,
    },
  ];
  project.transitions = [
    {
      id: "to-game",
      name: "Menu → Game",
      fromSceneId: "menu",
      toSceneId: gameplaySceneId,
      type: "fade",
      duration: 0.35,
    },
    {
      id: "to-menu",
      name: "Back to Menu",
      toSceneId: "menu",
      type: "fade",
      duration: 0.25,
    },
    {
      id: "to-settings",
      name: "Open Settings",
      fromSceneId: "menu",
      toSceneId: "settings",
      type: "fade",
      duration: 0.25,
    },
  ];
  // Prefer skill gameplay over starter main
  project.scenes = project.scenes.filter((s) => s !== "main.scene.json");
  if (!project.scenes.includes(gameplayFile)) {
    project.scenes.push(gameplayFile);
  }
  // Ensure menu/settings listed first for clarity
  const ordered = ["menu.scene.json", "settings.scene.json", gameplayFile];
  for (const f of project.scenes) {
    if (!ordered.includes(f)) ordered.push(f);
  }
  project.scenes = ordered;
  await writeProject(root, project);

  try {
    await unlink(join(getGameKitRoot(root), "scenes", "main.scene.json"));
  } catch {
    // no starter main
  }
}

/**
 * Apply genre recipe pack (input map, win rules, hazards) onto a scene.
 */
export async function applySkillPackRecipes(
  root: string,
  skillId: string,
  sceneFile: string,
): Promise<{ applied: string[]; warnings: string[] }> {
  const pack = getSkillPack(skillId);
  const applied: string[] = [];
  const warnings: string[] = [];
  const scene = await readScene(root, sceneFile);

  for (const step of pack.recipes) {
    try {
      let entityId: string | undefined;
      if (step.entityName) {
        const ent = scene.entities.find(
          (e) => e.name.toLowerCase() === step.entityName!.toLowerCase(),
        );
        if (!ent) {
          warnings.push(`Recipe ${step.id}: entity "${step.entityName}" not found — skipped`);
          continue;
        }
        entityId = ent.id;
      }
      const result = await applyRecipe(root, step.id, {
        scenePath: sceneFile,
        entityId,
        params: step.params,
      });
      applied.push(step.id);
      warnings.push(...result.warnings);
    } catch (err) {
      warnings.push(
        `Recipe ${step.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Ensure pack lives / fall defaults survive recipe merges
  if (pack.lives !== undefined || pack.fallDeathEnabled !== undefined) {
    const after = await readScene(root, sceneFile);
    const rules = resolveGameRules(after.gameRules);
    after.gameRules = resolveGameRules({
      ...rules,
      lives: pack.lives ?? rules.lives,
      fallDeathEnabled: pack.fallDeathEnabled ?? rules.fallDeathEnabled,
      onFall:
        (pack.lives ?? rules.lives) > 0
          ? rules.onFall === "gameOver" && (pack.lives ?? 0) > 0
            ? "respawn"
            : rules.onFall
          : rules.onFall,
    });
    await writeScene(root, after, sceneFile);
  }

  return { applied, warnings };
}

export type CreateGameFromSkillResult = {
  skillId: string;
  skillName: string;
  projectPath: string;
  gameplayFile: string;
  sceneId: string;
  entityCount: number;
  assetsCopied: string[];
  recipesApplied: string[];
  warnings: string[];
  registryPath: string;
};

/**
 * One-command playable project:
 * init shell → skill scene + assets → menu/level wire → recipes → asset registry.
 */
export async function createGameFromSkill(
  root: string,
  skillId: string,
  options: {
    name?: string;
    platform?: "web" | "mobile";
  } = {},
): Promise<CreateGameFromSkillResult> {
  const skills = await listSkills();
  if (!skills.some((s) => s.id === skillId)) {
    throw new Error(
      `Unknown skill "${skillId}". Available: ${skills.map((s) => s.id).join(", ")}`,
    );
  }

  const projectName = options.name ?? getSkillPack(skillId).label ?? skillId;
  await initProject(root, { name: projectName });

  // Prefer named project
  const project = await readProject(root);
  project.name = projectName;
  await writeProject(root, project);

  const skillResult = await applySkill(root, skillId);
  await wireShellToGameplay(root, skillResult.sceneId, skillResult.filename);
  const packResult = await applySkillPackRecipes(root, skillId, skillResult.filename);
  const registryPath = await generateAssetRegistry(
    root,
    options.platform ?? "mobile",
  );

  return {
    skillId,
    skillName: skillResult.skillName,
    projectPath: join(getGameKitRoot(root), "project.json"),
    gameplayFile: skillResult.filename,
    sceneId: skillResult.sceneId,
    entityCount: skillResult.entityCount,
    assetsCopied: skillResult.assetsCopied,
    recipesApplied: packResult.applied,
    warnings: packResult.warnings,
    registryPath,
  };
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

/**
 * Build multi-scene bootstrap input for web/mobile entry generation.
 * Prefer `project.scenes` order; include any extra scene files on disk.
 */
export async function buildExportBootstrapInput(root: string): Promise<BootstrapInput> {
  const { project, scenes: diskScenes } = await getProjectSnapshot(root);
  const ordered = orderSceneFiles(project.scenes ?? [], diskScenes);
  if (ordered.length === 0) {
    throw new Error("Cannot export: project has no scene files under gamekit/scenes/");
  }

  const bootstrapScenes: BootstrapScene[] = [];
  for (const file of ordered) {
    let sceneId: string | undefined;
    let hasPlayerController = false;
    try {
      const scene = await readScene(root, file);
      sceneId = scene.id;
      hasPlayerController = scene.entities.some((entity) =>
        entity.components.some((c) => c.type === "PlayerController"),
      );
    } catch {
      // Still register the file; validation already ran on valid scenes at editor time.
    }
    bootstrapScenes.push({
      file,
      bare: bareSceneName(file),
      importVar: sceneFileToImportVar(file),
      sceneId,
      hasPlayerController,
    });
  }

  return {
    scenes: bootstrapScenes,
    activeScene: project.activeScene,
    transition: resolveTransitionMs(project.transitions),
  };
}

export async function exportProject(root: string, outputDir: string, platform: "mobile" | "web" = "mobile"): Promise<string> {
  const { project, scenes, assets } = await getProjectSnapshot(root);
  const gamekitRoot = getGameKitRoot(root);
  const outputGamekit = join(outputDir, "gamekit");
  const playroomRoot = fileURLToPath(new URL("../../..", import.meta.url));
  const pkgJson = JSON.parse(await readFile(join(playroomRoot, "package.json"), "utf8")) as Record<string, unknown>;
  const bootstrap = await buildExportBootstrapInput(root);

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
    await writeFile(join(outputDir, "src", "main.ts"), generateWebMain(bootstrap));

    const templatePkg = { ...JSON.parse(await readFile(join(templateDir, "package.json"), "utf8")) as Record<string, unknown> };
    templatePkg.name = project.name.toLowerCase().replace(/\s+/g, "-");
    const deps = templatePkg.dependencies as Record<string, string>;
    deps["@gamekit/runtime-web"] = (pkgJson.version as string) ?? "0.1.0";
    deps["phaser"] = "^3.87.0";
    await writeFile(join(outputDir, "package.json"), JSON.stringify(templatePkg, null, 2) + "\n");
  } else {
    const templateDir = join(playroomRoot, "templates", "expo-game");
    const filesToCopy = [
      { src: join(templateDir, "app.json"), dest: join(outputDir, "app.json") },
      { src: join(templateDir, "babel.config.js"), dest: join(outputDir, "babel.config.js") },
      { src: join(templateDir, "tsconfig.json"), dest: join(outputDir, "tsconfig.json") },
    ];

    for (const { src, dest } of filesToCopy) {
      if (await exists(src)) {
        await writeFile(dest, await readFile(src, "utf8"));
      }
    }

    await writeFile(join(outputDir, "App.tsx"), generateMobileApp(bootstrap));

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

  // Prefabs (optional) — keep export self-contained for runtime instantiate flows.
  const prefabsRoot = join(gamekitRoot, "prefabs");
  if (await exists(prefabsRoot)) {
    await mkdir(join(outputGamekit, "prefabs"), { recursive: true });
    try {
      const prefabFiles = (await readdir(prefabsRoot)).filter((f) => f.endsWith(".prefab.json"));
      for (const file of prefabFiles) {
        await writeFile(join(outputGamekit, "prefabs", file), await readFile(join(prefabsRoot, file)));
      }
    } catch {
      // ignore empty / unreadable prefabs dir
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

  const activeScene = project.activeScene ?? null;
  const currentLevel = findLevelForScene(project.levels ?? [], activeScene);

  const payload: GameSavePayload = {
    version: 1,
    persistentState,
    levels: project.levels.map((l) => ({ id: l.id, unlocked: l.unlocked })),
    currentSceneId: activeScene,
    currentLevelId: currentLevel?.id ?? null,
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
  // currentLevelId is derived on save from activeScene; unlock flags carry progress.
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
