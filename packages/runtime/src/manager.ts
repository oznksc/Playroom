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

export interface StorageProvider {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

export class InMemoryStorage implements StorageProvider {
  private data: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
}

export class LocalStorageProvider implements StorageProvider {
  getItem(key: string): string | null {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  }
  setItem(key: string, value: string): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  }
}

export class SceneManager {
  private state: SceneManagerState;
  private listeners: Set<SceneManagerListener> = new Set();
  private persistentState: Record<string, unknown> = {};
  private storageProvider: StorageProvider;

  constructor(
    config: SceneManagerConfig,
    levels: GameKitLevel[] = [],
    storageProvider?: StorageProvider
  ) {
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

    this.storageProvider = storageProvider ?? 
      (typeof localStorage !== "undefined" ? new LocalStorageProvider() : new InMemoryStorage());
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
    if (!level.unlocked) return false;

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

  /** Unlock the next level after the given one (by order). Returns unlocked id or null. */
  completeLevel(levelId: string): string | null {
    const sorted = [...this.state.levels].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((l) => l.id === levelId);
    if (index === -1) return null;
    const next = sorted[index + 1];
    if (!next) return null;
    this.unlockLevel(next.id);
    return next.id;
  }

  isLevelUnlocked(levelId: string): boolean {
    return this.state.levels.find((l) => l.id === levelId)?.unlocked === true;
  }

  listUnlockedLevels(): GameKitLevel[] {
    return this.state.levels.filter((l) => l.unlocked);
  }

  subscribe(listener: SceneManagerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getPersistentVar(key: string, defaultValue?: unknown): unknown {
    return this.persistentState[key] ?? defaultValue;
  }

  setPersistentVar(key: string, value: unknown): void {
    this.persistentState[key] = value;
  }

  async saveGame(slotName: string): Promise<void> {
    const key = `playroom_save_${slotName}`;
    const payload: GameSavePayload = {
      version: 1,
      persistentState: this.persistentState,
      levels: this.state.levels.map((l) => ({ id: l.id, unlocked: l.unlocked })),
      currentSceneId: this.state.currentSceneId,
      currentLevelId: this.state.currentLevelId,
    };
    const value = JSON.stringify(payload);
    await this.storageProvider.setItem(key, value);
  }

  async loadGame(slotName: string): Promise<boolean> {
    const key = `playroom_save_${slotName}`;
    try {
      const value = await this.storageProvider.getItem(key);
      if (value === null) return false;
      const parsed = JSON.parse(value) as GameSavePayload | Record<string, unknown>;

      // Backward compatible: old saves were bare persistentState objects
      if (!parsed || typeof parsed !== "object") return false;
      if (!("version" in parsed)) {
        this.persistentState = parsed as Record<string, unknown>;
        this.notify();
        return true;
      }

      const payload = parsed as GameSavePayload;
      this.persistentState = payload.persistentState ?? {};

      if (Array.isArray(payload.levels)) {
        const unlockMap = new Map(payload.levels.map((l) => [l.id, l.unlocked]));
        this.state = {
          ...this.state,
          levels: this.state.levels.map((l) => ({
            ...l,
            unlocked: unlockMap.has(l.id) ? !!unlockMap.get(l.id) : l.unlocked,
          })),
        };
      }

      if (payload.currentLevelId && this.isLevelUnlocked(payload.currentLevelId)) {
        const level = this.state.levels.find((l) => l.id === payload.currentLevelId);
        if (level) {
          this.state = {
            ...this.state,
            currentLevelId: level.id,
            currentLevelIndex: this.state.levels.indexOf(level),
          };
        }
      }

      if (payload.currentSceneId && this.state.scenes[payload.currentSceneId]) {
        this.state = {
          ...this.state,
          currentSceneId: payload.currentSceneId,
          isTransitioning: false,
        };
      }

      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  clearPersistentState(): void {
    this.persistentState = {};
  }

  /** Snapshot for tests / agent tooling */
  exportSaveSnapshot(): GameSavePayload {
    return {
      version: 1,
      persistentState: { ...this.persistentState },
      levels: this.state.levels.map((l) => ({ id: l.id, unlocked: l.unlocked })),
      currentSceneId: this.state.currentSceneId,
      currentLevelId: this.state.currentLevelId,
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export type GameSavePayload = {
  version: 1;
  persistentState: Record<string, unknown>;
  levels: Array<{ id: string; unlocked: boolean }>;
  currentSceneId: string | null;
  currentLevelId: string | null;
};
