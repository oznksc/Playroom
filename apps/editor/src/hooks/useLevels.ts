import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { GameKitLevel, GameKitProject } from "@gamekit/schema";
import type { SceneManager } from "@gamekit/runtime/manager";
import type { ProjectSnapshot } from "../types.js";
import type { ConsoleLog } from "../components/ConsolePanel.js";

export interface UseLevelsOptions {
  snapshot: ProjectSnapshot;
  setSnapshot: Dispatch<SetStateAction<ProjectSnapshot>>;
  persistProject: (partial: Partial<GameKitProject>) => Promise<void>;
  setStatus: (status: string) => void;
  addConsoleLog: (type: ConsoleLog["type"], message: string) => void;
  normalizeSceneFile: (id: string) => string;
  sceneFileMatches: (a: string, b: string) => boolean;
  playSceneManagerRef: React.MutableRefObject<SceneManager | null>;
  playUnlockedLevelIdsRef: React.MutableRefObject<string[]>;
}

export function useLevels({
  snapshot,
  setSnapshot,
  persistProject,
  setStatus,
  addConsoleLog,
  normalizeSceneFile,
  sceneFileMatches,
  playSceneManagerRef,
  playUnlockedLevelIdsRef,
}: UseLevelsOptions) {
  const commitLevels = useCallback((levels: GameKitLevel[]) => {
    setSnapshot((prev) => ({ ...prev, levels }));
    persistProject({ levels }).catch((e) => {
      setStatus(e instanceof Error ? e.message : "Failed to save levels");
    });
  }, [setSnapshot, persistProject, setStatus]);

  const handleCreateLevel = useCallback((name: string) => {
    const baseId = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "") || "level";
    const existing = new Set(snapshot.levels.map((l) => l.id));
    let id = baseId;
    let n = 2;
    while (existing.has(id)) {
      id = `${baseId}-${n++}`;
    }
    const newLevel: GameKitLevel = {
      id,
      name,
      order: snapshot.levels.length + 1,
      sceneIds: [],
      unlocked: snapshot.levels.length === 0,
    };
    commitLevels([...snapshot.levels, newLevel]);
    addConsoleLog("system", `Created new game level ${name}`);
  }, [snapshot.levels, commitLevels, addConsoleLog]);

  const handleDeleteLevel = useCallback((levelId: string) => {
    commitLevels(snapshot.levels.filter((l) => l.id !== levelId));
    addConsoleLog("system", `Deleted game level ID: ${levelId}`);
  }, [snapshot.levels, commitLevels, addConsoleLog]);

  const handleToggleUnlockLevel = useCallback((levelId: string) => {
    commitLevels(
      snapshot.levels.map((l) =>
        l.id === levelId ? { ...l, unlocked: !l.unlocked } : l
      )
    );
  }, [snapshot.levels, commitLevels]);

  const handleReorderLevels = useCallback((levels: GameKitLevel[]) => {
    commitLevels(levels);
  }, [commitLevels]);

  const handleAssignSceneToLevel = useCallback((levelId: string, sceneId: string) => {
    const file = normalizeSceneFile(sceneId);
    commitLevels(
      snapshot.levels.map((l) =>
        l.id === levelId && !l.sceneIds.some((s) => sceneFileMatches(s, file))
          ? { ...l, sceneIds: [...l.sceneIds.map(normalizeSceneFile), file] }
          : l.id === levelId
            ? { ...l, sceneIds: l.sceneIds.map(normalizeSceneFile) }
            : l
      )
    );
  }, [snapshot.levels, normalizeSceneFile, sceneFileMatches, commitLevels]);

  const handleRemoveSceneFromLevel = useCallback((levelId: string, sceneId: string) => {
    commitLevels(
      snapshot.levels.map((l) =>
        l.id === levelId
          ? {
              ...l,
              sceneIds: l.sceneIds
                .map(normalizeSceneFile)
                .filter((s) => !sceneFileMatches(s, sceneId)),
            }
          : l
      )
    );
  }, [snapshot.levels, normalizeSceneFile, sceneFileMatches, commitLevels]);

  const handleUpdateLevel = useCallback((levelId: string, patch: Partial<GameKitLevel>) => {
    commitLevels(
      snapshot.levels.map((l) => (l.id === levelId ? { ...l, ...patch } : l)),
    );
  }, [snapshot.levels, commitLevels]);

  /** Sync unlock flags from play SceneManager back into the project. */
  const syncPlayLevelUnlocksFromManager = useCallback(() => {
    const manager = playSceneManagerRef.current;
    if (!manager) return;
    const live = manager.getLevels();
    const unlockedIds = live.filter((l) => l.unlocked).map((l) => l.id);
    const prev = playUnlockedLevelIdsRef.current;
    const newly = unlockedIds.filter((id) => !prev.includes(id));
    const lost = prev.filter((id) => !unlockedIds.includes(id));
    if (newly.length === 0 && lost.length === 0) return;
    playUnlockedLevelIdsRef.current = unlockedIds;
    setSnapshot((snap) => {
      const nextLevels = snap.levels.map((l) => {
        const liveLevel = live.find((x) => x.id === l.id);
        return liveLevel ? { ...l, unlocked: liveLevel.unlocked } : l;
      });
      void persistProject({ levels: nextLevels }).catch((e) => {
        setStatus(e instanceof Error ? e.message : "Failed to save levels");
      });
      return { ...snap, levels: nextLevels };
    });
    for (const id of newly) {
      const level = live.find((l) => l.id === id);
      addConsoleLog("system", `Unlocked level: ${level?.name ?? id}`);
    }
  }, [playSceneManagerRef, playUnlockedLevelIdsRef, setSnapshot, persistProject, setStatus, addConsoleLog]);

  return {
    commitLevels,
    handleCreateLevel,
    handleDeleteLevel,
    handleToggleUnlockLevel,
    handleReorderLevels,
    handleAssignSceneToLevel,
    handleRemoveSceneFromLevel,
    handleUpdateLevel,
    syncPlayLevelUnlocksFromManager,
  };
}
