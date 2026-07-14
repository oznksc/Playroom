import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import {
  type GameKitProject,
  type GameKitScene,
  type GameKitPrefab,
  validateScene,
  validateProject,
  validatePrefab,
  sceneToJson,
  projectToJson,
  prefabToJson,
} from "@gamekit/schema";

export class FileIO {
  constructor(private basePath: string) {}

  get projectRoot(): string {
    return this.basePath;
  }

  private get gamekitDir(): string {
    return join(this.basePath, "gamekit");
  }

  private get scenesDir(): string {
    return join(this.gamekitDir, "scenes");
  }

  private get prefabsDir(): string {
    return join(this.gamekitDir, "prefabs");
  }

  get assetsDir(): string {
    return join(this.gamekitDir, "assets");
  }

  private get projectPath(): string {
    return join(this.gamekitDir, "project.json");
  }

  async readProject(): Promise<GameKitProject> {
    const content = await readFile(this.projectPath, "utf-8");
    const parsed = JSON.parse(content);
    const result = validateProject(parsed);
    if (!result.ok) {
      throw new Error(`Invalid project.json:\n${result.errors.join("\n")}`);
    }
    return result.value;
  }

  async writeProject(project: GameKitProject): Promise<void> {
    await writeFile(this.projectPath, projectToJson(project));
  }

  async listScenes(): Promise<string[]> {
    const files = await readdir(this.scenesDir);
    return files.filter((f) => f.endsWith(".scene.json"));
  }

  async readScene(filename: string): Promise<GameKitScene> {
    const path = join(this.scenesDir, filename);
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content);
    const result = validateScene(parsed);
    if (!result.ok) {
      throw new Error(`Invalid scene ${filename}:\n${result.errors.join("\n")}`);
    }
    return result.value;
  }

  async writeScene(filename: string, scene: GameKitScene): Promise<void> {
    const path = join(this.scenesDir, filename);
    await writeFile(path, sceneToJson(scene));
  }

  async deleteScene(filename: string): Promise<void> {
    const path = join(this.scenesDir, filename);
    await unlink(path);
  }

  resolveScenePath(scenePath: string): string {
    if (!scenePath.includes("/") && !scenePath.includes("\\")) {
      return scenePath;
    }
    return basename(scenePath);
  }

  async ensurePrefabsDir(): Promise<string> {
    await mkdir(this.prefabsDir, { recursive: true });
    return this.prefabsDir;
  }

  async listPrefabs(): Promise<string[]> {
    try {
      const files = await readdir(this.prefabsDir);
      return files.filter((f) => f.endsWith(".prefab.json"));
    } catch {
      return [];
    }
  }

  async readPrefab(filename: string): Promise<GameKitPrefab> {
    const path = join(this.prefabsDir, basename(filename));
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content);
    const result = validatePrefab(parsed);
    if (!result.ok) {
      throw new Error(`Invalid prefab ${filename}:\n${result.errors.join("\n")}`);
    }
    return result.value;
  }

  async writePrefab(filename: string, prefab: GameKitPrefab): Promise<void> {
    await this.ensurePrefabsDir();
    const path = join(this.prefabsDir, basename(filename));
    await writeFile(path, prefabToJson(prefab));
  }

  async deletePrefab(filename: string): Promise<void> {
    const path = join(this.prefabsDir, basename(filename));
    await unlink(path);
  }
}
