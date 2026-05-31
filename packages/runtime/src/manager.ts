import type { GameKitLevel, GameKitScene, GameKitProject } from "@gamekit/schema";
import type { AssetRegistry, LoadedScene } from "./scene.js";
import { loadScene } from "./scene.js";

export type SceneTransition = {
  type: "none" | "fade" | "slide";
  duration: number;
};

export type SceneManagerConfig = {
  scenes: Record<string, LoadedScene>;
  transition: SceneTransition;
};

export type SceneManagerState = {
  currentSceneId: string | null;
  currentLevelId: string | null;
  currentLevelIndex: number;
  scenes: Record<string, LoadedScene>;
  levels: GameKitLevel[];
  transition: SceneTransition;
  isTransitioning: boolean;
};

type SceneManagerListener = (state: SceneManagerState) => void;

export class SceneManager {
  private state: SceneManagerState;
  private listeners: Set<SceneManagerListener> = new Set();

  constructor(config: SceneManagerConfig, levels: GameKitLevel[] = []) {
    const sceneIds = Object.keys(config.scenes);
    const sortedLevels = [...levels].sort((a, b) => a.order - b.order);

    this.state = {
      currentSceneId: sceneIds[0] ?? null,
      currentLevelId: sortedLevels[0]?.id ?? null,
      currentLevelIndex: 0,
      scenes: config.scenes,
      levels: sortedLevels,
      transition: config.transition,
      isTransitioning: false
    };
  }

  getState(): SceneManagerState {
    return { ...this.state };
  }

  getCurrentScene(): LoadedScene | null {
    if (!this.state.currentSceneId) return null;
    return this.state.scenes[this.state.currentSceneId] ?? null;
  }

  getCurrentLevel(): GameKitLevel | null {
    if (!this.state.currentLevelId) return null;
    return this.state.levels.find((l) => l.id === this.state.currentLevelId) ?? null;
  }

  getScene(id: string): LoadedScene | null {
    return this.state.scenes[id] ?? null;
  }

  getLevels(): GameKitLevel[] {
    return [...this.state.levels];
  }

  getLevelScenes(levelId: string): LoadedScene[] {
    const level = this.state.levels.find((l) => l.id === levelId);
    if (!level) return [];
    return level.sceneIds
      .map((id) => this.state.scenes[id])
      .filter((s): s is LoadedScene => s !== null && s !== undefined);
  }

  loadProject(project: GameKitProject, sceneJsonLoader: (file: string) => unknown, assets: AssetRegistry = {}): void {
    const scenes: Record<string, LoadedScene> = {};

    for (const file of project.scenes) {
      try {
        const json = sceneJsonLoader(file);
        scenes[file] = loadScene(json, assets);
      } catch {
        // Skip invalid scenes
      }
    }

    const sortedLevels = [...project.levels].sort((a, b) => a.order - b.order);
    const firstSceneId = sortedLevels[0]?.sceneIds[0] ?? Object.keys(scenes)[0] ?? null;

    this.state = {
      ...this.state,
      scenes,
      levels: sortedLevels,
      currentSceneId: firstSceneId,
      currentLevelId: sortedLevels[0]?.id ?? null,
      currentLevelIndex: 0
    };

    this.notify();
  }

  switchScene(sceneId: string): boolean {
    if (!this.state.scenes[sceneId]) return false;
    if (this.state.currentSceneId === sceneId) return false;

    this.state = {
      ...this.state,
      currentSceneId: sceneId,
      isTransitioning: this.state.transition.type !== "none"
    };

    if (this.state.transition.type === "none") {
      this.notify();
    } else {
      setTimeout(() => {
        this.state = { ...this.state, isTransitioning: false };
        this.notify();
      }, this.state.transition.duration);
      this.notify();
    }

    return true;
  }

  switchLevel(levelId: string): boolean {
    const level = this.state.levels.find((l) => l.id === levelId);
    if (!level) return false;

    const firstSceneId = level.sceneIds[0] ?? null;
    if (!firstSceneId || !this.state.scenes[firstSceneId]) return false;

    this.state = {
      ...this.state,
      currentLevelId: levelId,
      currentLevelIndex: this.state.levels.indexOf(level),
      currentSceneId: firstSceneId,
      isTransitioning: this.state.transition.type !== "none"
    };

    if (this.state.transition.type === "none") {
      this.notify();
    } else {
      setTimeout(() => {
        this.state = { ...this.state, isTransitioning: false };
        this.notify();
      }, this.state.transition.duration);
      this.notify();
    }

    return true;
  }

  nextScene(): boolean {
    const currentLevel = this.getCurrentLevel();
    if (!currentLevel) return false;

    const currentIndex = currentLevel.sceneIds.indexOf(this.state.currentSceneId ?? "");
    if (currentIndex === -1) return false;

    const nextSceneId = currentLevel.sceneIds[currentIndex + 1];
    if (nextSceneId && this.state.scenes[nextSceneId]) {
      return this.switchScene(nextSceneId);
    }

    return this.nextLevel();
  }

  nextLevel(): boolean {
    const nextIndex = this.state.currentLevelIndex + 1;
    const nextLevel = this.state.levels[nextIndex];
    if (!nextLevel) return false;

    return this.switchLevel(nextLevel.id);
  }

  previousScene(): boolean {
    const currentLevel = this.getCurrentLevel();
    if (!currentLevel) return false;

    const currentIndex = currentLevel.sceneIds.indexOf(this.state.currentSceneId ?? "");
    if (currentIndex <= 0) return false;

    const prevSceneId = currentLevel.sceneIds[currentIndex - 1];
    if (prevSceneId && this.state.scenes[prevSceneId]) {
      return this.switchScene(prevSceneId);
    }

    return false;
  }

  previousLevel(): boolean {
    const prevIndex = this.state.currentLevelIndex - 1;
    const prevLevel = this.state.levels[prevIndex];
    if (!prevLevel) return false;

    return this.switchLevel(prevLevel.id);
  }

  unlockLevel(levelId: string): boolean {
    const level = this.state.levels.find((l) => l.id === levelId);
    if (!level || level.unlocked) return false;

    this.state = {
      ...this.state,
      levels: this.state.levels.map((l) =>
        l.id === levelId ? { ...l, unlocked: true } : l
      )
    };

    this.notify();
    return true;
  }

  subscribe(listener: SceneManagerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
