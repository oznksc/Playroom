import { useState, useRef, useEffect, useCallback } from "react";
import { z } from "zod";
import type { GameKitScene, GameKitAsset, GameKitLevel, GuiComponent, GameKitProject } from "@gamekit/schema";
import { parseScene, createEmptyScene } from "@gamekit/schema";
import { useUndo } from "./useUndo.js";
import { getApiUrl } from "../lib/api.js";
import { executeEditorConsoleCommand } from "../lib/editor-console.js";
import {
  closeSceneTab,
  createSceneWorkspace,
  focusedSceneFile,
  focusScenePane,
  openSceneTab,
  setSceneSplit,
  syncWorkspaceScenes,
  type ScenePaneId,
  type SceneWorkspaceState,
  type SplitMode,
} from "../lib/scene-workspace.js";
import type { ProjectSnapshot, SaveState } from "../types.js";
import type { ConsoleLog } from "../components/ConsolePanel.js";

const AUTO_SAVE_DELAY_MS = 1500;
const ApiErrorSchema = z.object({ error: z.string().optional() });
const SaveErrorSchema = z.object({ error: z.string().optional(), errors: z.array(z.string()).optional() });

export interface ExampleProject {
  id: string;
  name: string;
  description: string;
  path: string;
}

export function useProjectState() {
  const isTauri = typeof window !== "undefined" && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("gamekit_recent_projects");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [snapshot, setSnapshot] = useState<ProjectSnapshot>({ scenes: [], assets: [], levels: [], guiComponents: [] });
  const [currentSceneFile, setCurrentSceneFile] = useState<string>("");
  const {
    current: scene,
    setCurrent: setScene,
    push,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    bypassRef: undoBypassRef,
  } = useUndo<GameKitScene | undefined>(undefined);

  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [status, setStatus] = useState("Loading");
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(() => new Set());
  const [paneScenes, setPaneScenes] = useState<Record<string, GameKitScene>>({});
  const [workspace, setWorkspace] = useState<SceneWorkspaceState>(() => createSceneWorkspace(""));

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const sceneCacheRef = useRef<Map<string, GameKitScene>>(new Map());
  const skipNextSceneLoadRef = useRef(false);
  const sceneMtimeRef = useRef<number | null>(null);

  const [exampleProjects, setExampleProjects] = useState<ExampleProject[]>([]);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const [logs, setLogs] = useState<ConsoleLog[]>([
    { type: "system", message: "Playroom editor initialized.", timestamp: new Date() },
    { type: "system", message: "Ready to edit scenes and image assets.", timestamp: new Date() },
  ]);

  const addConsoleLog = useCallback((type: ConsoleLog["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  const addToRecentProjects = useCallback((path: string) => {
    setRecentProjects((prev) => {
      const filtered = prev.filter((p) => p !== path);
      const updated = [path, ...filtered].slice(0, 5);
      localStorage.setItem("gamekit_recent_projects", JSON.stringify(updated));
      return updated;
    });
  }, []);

  async function waitForEditorApi(timeoutMs = 10_000): Promise<void> {
    const start = Date.now();
    let lastError = "Editor API not reachable";
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(getApiUrl("/api/project"), { cache: "no-store" });
        if (res.ok) {
          await res.json();
          return;
        }
        lastError = `API returned ${res.status}`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Connection failed";
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`${lastError}. Is the CLI built? Run \`pnpm build\` then retry.`);
  }

  const refresh = useCallback(async () => {
    const projectResponse = await fetch(getApiUrl("/api/project"));
    const rawSnapshot = (await projectResponse.json()) as {
      project?: { activeScene?: string };
      scenes: string[];
      assets: GameKitAsset[];
      levels?: GameKitLevel[];
      guiComponents?: GuiComponent[];
    };
    const nextSnapshot: ProjectSnapshot = {
      scenes: rawSnapshot.scenes ?? [],
      assets: rawSnapshot.assets ?? [],
      levels: rawSnapshot.levels ?? [],
      guiComponents: rawSnapshot.guiComponents ?? [],
    };

    const activeFromProject = rawSnapshot.project?.activeScene;
    const sceneFile =
      (activeFromProject && nextSnapshot.scenes.includes(activeFromProject)
        ? activeFromProject
        : null) ??
      (currentSceneFile && nextSnapshot.scenes.includes(currentSceneFile)
        ? currentSceneFile
        : null) ??
      nextSnapshot.scenes[0] ??
      "menu.scene.json";

    setCurrentSceneFile(sceneFile);

    const sceneResponse = await fetch(getApiUrl(`/api/scene?file=${encodeURIComponent(sceneFile)}`));
    if (!sceneResponse.ok) {
      throw new Error(`Failed to load scene ${sceneFile} (${sceneResponse.status})`);
    }
    const nextScene = parseScene(await sceneResponse.json());
    setSnapshot(nextSnapshot);
    reset(nextScene);
    setSelectedAssetId(nextSnapshot.assets[0]?.id);
    setIsDirty(false);
    setLastSaved(new Date());
    setStatus("Ready");
  }, [currentSceneFile, reset]);

  const loadProjectFolder = useCallback(async (path: string) => {
    setIsLoadingProject(true);
    setProjectLoadError(null);
    try {
      if (isTauri) {
        setStatus("Starting server…");
        const { invoke } = await import("@tauri-apps/api/core");
        const resolved = await invoke<string>("start_server", { projectPath: path });
        setStatus("Waiting for editor API…");
        await waitForEditorApi();
        setStatus("Loading project…");
        await refresh();
        setProjectPath(resolved);
        addToRecentProjects(resolved);
        addConsoleLog("system", `Loaded project: ${resolved}`);
      } else {
        setStatus("Loading project…");
        await refresh();
        setProjectPath(path);
        addToRecentProjects(path);
        addConsoleLog("system", `Loaded project: ${path}`);
      }
    } catch (e) {
      console.error(e);
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
            ? e.message
            : "Failed to load project";
      setStatus(msg);
      setProjectLoadError(msg);
      if (isTauri) {
        setProjectPath(null);
      }
    } finally {
      setIsLoadingProject(false);
    }
  }, [isTauri, refresh, addToRecentProjects, addConsoleLog]);

  const handleOpenProject = useCallback(async () => {
    try {
      setProjectLoadError(null);
      setStatus("Opening dialog...");
      if (isTauri) {
        const { invoke } = await import("@tauri-apps/api/core");
        const selected = await invoke<string | null>("select_directory");
        if (selected) {
          await loadProjectFolder(selected);
        } else {
          setStatus("Select a project folder to get started.");
        }
      } else {
        const res = await fetch(getApiUrl("/api/system/pick-directory"), { method: "POST" });
        if (res.ok) {
          const data = (await res.json()) as { path?: string | null };
          if (data.path) {
            await loadProjectFolder(data.path);
            return;
          }
        }
        setStatus("Select a project folder to get started.");
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
      setProjectLoadError(msg);
    }
  }, [isTauri, loadProjectFolder]);

  const handleCloseProject = useCallback(async () => {
    try {
      if (isTauri) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("stop_server");
      }
      setProjectPath(null);
      setStatus("Select a project folder to get started.");
      addConsoleLog("system", "Closed project folder.");
    } catch (e) {
      console.error(e);
    }
  }, [isTauri, addConsoleLog]);

  const saveScene = useCallback(async (nextScene = sceneRef.current) => {
    if (!nextScene || !currentSceneFile) return;
    setSaveState("saving");
    try {
      const response = await fetch(getApiUrl(`/api/scene?file=${currentSceneFile}`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextScene),
      });
      if (!response.ok) {
        const body = SaveErrorSchema.parse(await response.json());
        throw new Error(body.error ?? body.errors?.join(", ") ?? "Save failed");
      }
      setSaveState("saved");
      setIsDirty(false);
      if (currentSceneFile) {
        setDirtyFiles((prev) => {
          if (!prev.has(currentSceneFile)) return prev;
          const next = new Set(prev);
          next.delete(currentSceneFile);
          return next;
        });
      }
      setLastSaved(new Date());
      setStatus("Saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setStatus("Save failed");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [currentSceneFile]);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveScene(sceneRef.current);
    }, AUTO_SAVE_DELAY_MS);
  }, [saveScene]);

  const updateScene = useCallback((mutator: (draft: GameKitScene) => void) => {
    push((draft) => {
      if (draft) mutator(draft);
    });
    setIsDirty(true);
    if (currentSceneFile) {
      setDirtyFiles((prev) => {
        if (prev.has(currentSceneFile)) return prev;
        const next = new Set(prev);
        next.add(currentSceneFile);
        return next;
      });
    }
    triggerAutoSave();
  }, [push, currentSceneFile, triggerAutoSave]);

  const persistProject = useCallback(async (partial: Partial<GameKitProject>) => {
    await fetch(getApiUrl("/api/project"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(partial),
    });
  }, []);

  const activateScene = useCallback((file: string, pane?: ScenePaneId) => {
    if (!file) return;
    if (sceneRef.current && currentSceneFile && currentSceneFile !== file) {
      sceneCacheRef.current.set(currentSceneFile, structuredClone(sceneRef.current));
      setPaneScenes((prev) => ({ ...prev, [currentSceneFile]: sceneRef.current! }));
    }
    setWorkspace((ws) => {
      const opened = openSceneTab(ws, file);
      return pane ? focusScenePane(opened, pane) : opened;
    });
    if (file === currentSceneFile) return;
    const cached = sceneCacheRef.current.get(file);
    if (cached) {
      skipNextSceneLoadRef.current = true;
      reset(cached);
      setIsDirty(dirtyFiles.has(file));
      setCurrentSceneFile(file);
      return;
    }
    setCurrentSceneFile(file);
  }, [currentSceneFile, dirtyFiles, reset]);

  const handleCloseSceneTab = useCallback((file: string) => {
    setWorkspace((ws) => {
      const next = closeSceneTab(ws, file);
      const focused = focusedSceneFile(next);
      if (focused && focused !== currentSceneFile) activateScene(focused, next.focused);
      return next;
    });
  }, [currentSceneFile, activateScene]);

  const handleSplitChange = useCallback((split: SplitMode) => {
    setWorkspace((ws) => setSceneSplit(ws, split, snapshot.scenes));
  }, [snapshot.scenes]);

  const handleCreateScene = useCallback((name: string) => {
    const newScene = createEmptyScene(name);
    const fileName = `${newScene.id}.scene.json`;
    fetch(getApiUrl(`/api/scene?file=${fileName}`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newScene),
    }).then(() => {
      setSnapshot((prev) => ({ ...prev, scenes: [...prev.scenes, fileName] }));
      setCurrentSceneFile(fileName);
      refresh();
      addConsoleLog("system", `Created new scene configuration file: ${fileName}`);
    });
  }, [refresh, addConsoleLog]);

  const handleDeleteScene = useCallback((sceneId: string) => {
    if (snapshot.scenes.length <= 1) {
      alert("Cannot delete the last scene");
      return;
    }
    fetch(getApiUrl(`/api/scene?file=${sceneId}`), { method: "DELETE" }).then(() => {
      const remaining = snapshot.scenes.filter((s) => s !== sceneId);
      setSnapshot((prev) => ({ ...prev, scenes: remaining }));
      setWorkspace((ws) => closeSceneTab(ws, sceneId));
      if (currentSceneFile === sceneId) setCurrentSceneFile(remaining[0]);
      refresh();
      addConsoleLog("system", `Deleted scene configuration file ${sceneId}`);
    });
  }, [snapshot.scenes, currentSceneFile, refresh, addConsoleLog]);

  const deleteAsset = useCallback(async (assetId: string) => {
    const usingSprites = sceneRef.current?.entities.filter((e) =>
      e.components.some((c) => c.type === "Sprite" && (c as any).assetId === assetId)
    );
    if (usingSprites && usingSprites.length > 0) {
      if (!confirm(`Asset "${assetId}" is used by ${usingSprites.length} entity(s). Delete anyway?`)) return;
    }
    setStatus("Deleting");
    const response = await fetch(getApiUrl(`/api/assets?id=${encodeURIComponent(assetId)}`), { method: "DELETE" });
    if (!response.ok) {
      const body = ApiErrorSchema.parse(await response.json());
      throw new Error(body.error ?? "Delete failed");
    }
    await refresh();
    addConsoleLog("system", `Deleted asset ${assetId}`);
  }, [refresh, addConsoleLog]);

  const importAsset = useCallback(async (file: File) => {
    setStatus("Importing");
    const response = await fetch(getApiUrl(`/api/assets?filename=${encodeURIComponent(file.name)}`), {
      method: "POST",
      body: await file.arrayBuffer(),
    });
    if (!response.ok) throw new Error(ApiErrorSchema.parse(await response.json()).error ?? "Import failed");
    await refresh();
    addConsoleLog("system", `Imported asset from file: ${file.name}`);
  }, [refresh, addConsoleLog]);

  function normalizeSceneFile(id: string): string {
    if (!id) return id;
    return id.endsWith(".scene.json") ? id : `${id}.scene.json`;
  }

  function sceneFileMatches(a: string, b: string): boolean {
    return normalizeSceneFile(a) === normalizeSceneFile(b);
  }

  const executeConsoleCommand = useCallback(
    (
      cmdStr: string,
      selectedEntityId: string | null = null,
      setSelectedEntityIds: (ids: Set<string>) => void = () => {}
    ) => {
      if (cmdStr.trim().toLowerCase() === "/clear") {
        setLogs([]);
        return;
      }
      executeEditorConsoleCommand({
        command: cmdStr,
        selectedAssetId,
        fallbackAssetId: snapshot.assets[0]?.id,
        selectedEntityId,
        updateScene,
        setSelectedEntityIds,
        addConsoleLog,
      });
    },
    [selectedAssetId, snapshot.assets, updateScene, addConsoleLog]
  );

  // Example projects for Tauri
  useEffect(() => {
    if (!isTauri) return;
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<ExampleProject[]>("list_example_projects"))
      .then((list) => setExampleProjects(list ?? []))
      .catch(() => setExampleProjects([]));
  }, [isTauri]);

  // Initial load
  useEffect(() => {
    if (!isTauri) {
      refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Load failed"));
    } else {
      setStatus("Select a project folder to get started.");
    }
  }, []);

  // Update scene cache & pane scenes
  useEffect(() => {
    if (scene && currentSceneFile) {
      sceneCacheRef.current.set(currentSceneFile, scene);
      setPaneScenes((prev) =>
        prev[currentSceneFile] === scene ? prev : { ...prev, [currentSceneFile]: scene },
      );
    }
  }, [scene, currentSceneFile]);

  // Sync workspace tabs
  useEffect(() => {
    if (!currentSceneFile) return;
    setWorkspace((ws) => {
      const next = ws.openTabs.length === 0 ? createSceneWorkspace(currentSceneFile) : openSceneTab(ws, currentSceneFile);
      return next.paneA === ws.paneA && next.openTabs.join() === ws.openTabs.join() && next.focused === ws.focused
        ? ws
        : next;
    });
  }, [currentSceneFile]);

  useEffect(() => {
    if (snapshot.scenes.length === 0) return;
    setWorkspace((ws) => syncWorkspaceScenes(ws, snapshot.scenes, currentSceneFile || snapshot.scenes[0]));
  }, [snapshot.scenes, currentSceneFile]);

  // Load current scene file when changed
  useEffect(() => {
    if (isTauri && !projectPath) return;
    if (!currentSceneFile) return;
    if (skipNextSceneLoadRef.current) {
      skipNextSceneLoadRef.current = false;
      return;
    }

    let cancelled = false;
    fetch(getApiUrl(`/api/scene?file=${encodeURIComponent(currentSceneFile)}`))
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(
            typeof (body as { error?: string }).error === "string"
              ? (body as { error: string }).error
              : `Failed to load ${currentSceneFile}`,
          );
        }
        return r.json() as Promise<GameKitScene>;
      })
      .then((nextScene) => {
        if (cancelled) return;
        reset(nextScene);
        setIsDirty(false);
        setLastSaved(new Date());
        setStatus("Ready");
      })
      .catch((e) => {
        if (!cancelled) setStatus(e instanceof Error ? e.message : "Load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [currentSceneFile, projectPath, isTauri, reset]);

  // Hot-reload scene when file changes on disk
  const startHotReload = useCallback((isPlaying: boolean) => {
    if (isPlaying || isDirty || !currentSceneFile) return () => {};
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/scene/meta?file=${encodeURIComponent(currentSceneFile)}`));
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { mtimeMs?: number };
        if (typeof data.mtimeMs !== "number") return;
        if (sceneMtimeRef.current === null) {
          sceneMtimeRef.current = data.mtimeMs;
          return;
        }
        if (data.mtimeMs > sceneMtimeRef.current + 1) {
          sceneMtimeRef.current = data.mtimeMs;
          addConsoleLog("system", `Hot-reload: ${currentSceneFile} changed on disk`);
          await refresh();
        }
      } catch {
        // ignore
      }
    };
    const id = window.setInterval(() => void poll(), 1500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [currentSceneFile, isDirty, addConsoleLog, refresh]);

  // Reset mtime baseline when currentSceneFile changes
  useEffect(() => {
    sceneMtimeRef.current = null;
  }, [currentSceneFile]);

  // Lazy fetch second pane scene
  useEffect(() => {
    const other =
      workspace.split === "none"
        ? null
        : workspace.focused === "b"
          ? workspace.paneA
          : workspace.paneB;
    if (!other || sceneCacheRef.current.has(other) || paneScenes[other]) return;
    let cancelled = false;
    fetch(getApiUrl(`/api/scene?file=${encodeURIComponent(other)}`))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        const parsed = parseScene(data);
        sceneCacheRef.current.set(other, parsed);
        setPaneScenes((prev) => ({ ...prev, [other]: parsed }));
      })
      .catch(() => {
        // secondary pane can stay empty until fetch succeeds
      });
    return () => {
      cancelled = true;
    };
  }, [workspace.split, workspace.paneA, workspace.paneB, workspace.focused, paneScenes]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

  return {
    isTauri,
    projectPath,
    setProjectPath,
    recentProjects,
    setRecentProjects,
    exampleProjects,
    isLoadingProject,
    projectLoadError,
    setProjectLoadError,
    snapshot,
    setSnapshot,
    currentSceneFile,
    setCurrentSceneFile,
    scene,
    setScene,
    sceneRef,
    push,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    undoBypassRef,
    selectedAssetId,
    setSelectedAssetId,
    status,
    setStatus,
    isDirty,
    setIsDirty,
    lastSaved,
    saveState,
    dirtyFiles,
    paneScenes,
    workspace,
    setWorkspace,
    logs,
    setLogs,
    addConsoleLog,
    refresh,
    loadProjectFolder,
    handleOpenProject,
    handleCloseProject,
    saveScene,
    triggerAutoSave,
    updateScene,
    persistProject,
    activateScene,
    handleCloseSceneTab,
    handleSplitChange,
    handleCreateScene,
    handleDeleteScene,
    deleteAsset,
    importAsset,
    normalizeSceneFile,
    sceneFileMatches,
    executeConsoleCommand,
    startHotReload,
  };
}
