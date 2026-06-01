import type { GameKitScene, GameKitLevel, GameKitAsset, GameKitEntity, TransformComponent, PlayerControllerComponent, GuiNode, GuiComponent } from "@gamekit/schema";
import { createEntity, createEmptyScene, createId, createGuiComponent, createGuiComponentInstance } from "@gamekit/schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Gamepad2, FolderOpen, PanelLeft, PanelRight, X } from "lucide-react";
import { Topbar } from "./components/Topbar.js";
import { Sidebar } from "./components/Sidebar.js";
import { SceneCanvas } from "./components/SceneCanvas.js";
import { Inspector } from "./components/Inspector.js";
import { Footer } from "./components/Footer.js";
import { ScenePanel } from "./components/ScenePanel.js";
import { LevelPanel } from "./components/LevelPanel.js";
import { SceneSettings } from "./components/SceneSettings.js";
import { TimelinePanel } from "./components/TimelinePanel.js";
import { AssetsPanel } from "./components/AssetsPanel.js";
import { ConsolePanel, type ConsoleLog } from "./components/ConsolePanel.js";
import { GuiPanel } from "./components/GuiPanel.js";
import { GuiInspector } from "./components/GuiInspector.js";
import { GuiComponentPanel } from "./components/GuiComponentPanel.js";
import { GuiInstanceInspector } from "./components/GuiInstanceInspector.js";
import type { ProjectSnapshot, SaveState } from "./types.js";
import { findComponent } from "./lib/components.js";
import { useUndo } from "./hooks/useUndo.js";
import { getApiUrl } from "./lib/api.js";

const AUTO_SAVE_DELAY_MS = 1500;

export function App() {
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
  const [currentSceneFile, setCurrentSceneFile] = useState<string>("main.scene.json");
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
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const selectedEntityId = [...selectedEntityIds][0]; // first selected for single-entity operations
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [selectedGuiNodeId, setSelectedGuiNodeId] = useState<string | null>(null);
  const [selectedComponentInstanceId, setSelectedComponentInstanceId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading");
  const [zoom, setZoom] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeTab, setActiveTab] = useState<"entities" | "scenes" | "levels" | "guis" | "components">("entities");
  const [snap, setSnap] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const clipboardRef = useRef<GameKitEntity | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const selectedEntityIdsRef = useRef(selectedEntityIds);
  selectedEntityIdsRef.current = selectedEntityIds;
  const selectedGuiNodeIdRef = useRef(selectedGuiNodeId);
  selectedGuiNodeIdRef.current = selectedGuiNodeId;
  const selectedComponentInstanceIdRef = useRef(selectedComponentInstanceId);
  selectedComponentInstanceIdRef.current = selectedComponentInstanceId;

  // Premium Simulator State Hooks
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<"assets" | "timeline" | "console">("assets");
  const isDesktop = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
    []
  );
  const [activeTool, setActiveTool] = useState<"select" | "translate" | "rotate" | "scale">("translate");
  const [showGrid, setShowGrid] = useState(true);
  const [showColliders, setShowColliders] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [inspectorOpen, setInspectorOpen] = useState(isDesktop);
  const [bottomDrawerCollapsed, setBottomDrawerCollapsed] = useState(false);
  const [snapSize, setSnapSize] = useState(32);
  const [logs, setLogs] = useState<ConsoleLog[]>([
    { type: "system", message: "Ignite Engine debugger initialized.", timestamp: new Date() },
    { type: "system", message: "Ready to test collision dynamics and input scripts.", timestamp: new Date() }
  ]);

  const preSimulationSceneRef = useRef<GameKitScene | undefined>(undefined);
  const velocitiesRef = useRef<Record<string, { x: number; y: number }>>({});
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const addConsoleLog = useCallback((type: ConsoleLog["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveScene(sceneRef.current);
    }, AUTO_SAVE_DELAY_MS);
  }, []);

  const handleOpenProject = async () => {
    try {
      setStatus("Opening dialog...");
      const { invoke } = await import("@tauri-apps/api/core");
      const selected = await invoke<string | null>("select_directory");
      if (selected) {
        await loadProjectFolder(selected);
      } else {
        setStatus("Select a project folder to get started.");
      }
    } catch (e) {
      console.error(e);
      setStatus(e instanceof Error ? e.message : "Failed to open project");
    }
  };

  const loadProjectFolder = async (path: string) => {
    try {
      setStatus("Starting server...");
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("start_server", { projectPath: path });
      setProjectPath(path);
      addToRecentProjects(path);
      setStatus("Initializing project files...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await refresh();
      addConsoleLog("system", `Loaded project directory: ${path}`);
    } catch (e) {
      console.error(e);
      setStatus(e instanceof Error ? e.message : "Failed to start server");
    }
  };

  const handleCloseProject = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("stop_server");
      setProjectPath(null);
      setStatus("Select a project folder to get started.");
      addConsoleLog("system", "Closed project folder.");
    } catch (e) {
      console.error(e);
    }
  };

  const addToRecentProjects = (path: string) => {
    setRecentProjects((prev) => {
      const filtered = prev.filter((p) => p !== path);
      const updated = [path, ...filtered].slice(0, 5);
      localStorage.setItem("gamekit_recent_projects", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); }, []);

  async function refresh() {
    const [projectResponse, sceneResponse] = await Promise.all([
      fetch(getApiUrl("/api/project")),
      fetch(getApiUrl(`/api/scene?file=${currentSceneFile}`))
    ]);
    const rawSnapshot = await projectResponse.json() as { project?: unknown; scenes: string[]; assets: GameKitAsset[]; levels?: GameKitLevel[]; guiComponents?: import("@gamekit/schema").GuiComponent[] };
    const nextSnapshot: ProjectSnapshot = {
      scenes: rawSnapshot.scenes ?? [],
      assets: rawSnapshot.assets ?? [],
      levels: rawSnapshot.levels ?? [],
      guiComponents: rawSnapshot.guiComponents ?? []
    };
    const nextScene = await sceneResponse.json() as GameKitScene;
    setSnapshot(nextSnapshot);
    reset(nextScene);
    setSelectedEntityIds(new Set(nextScene.entities[0]?.id ? [nextScene.entities[0].id] : []));
    setSelectedAssetId(nextSnapshot.assets[0]?.id);
    setIsDirty(false);
    setLastSaved(new Date());
    setStatus("Ready");
  }

  useEffect(() => {
    if (!isTauri) {
      refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Load failed"));
    } else {
      setStatus("Select a project folder to get started.");
    }
  }, []);

  useEffect(() => {
    if (isTauri && !projectPath) return;

    fetch(getApiUrl(`/api/scene?file=${currentSceneFile}`))
      .then((r) => r.json())
      .then((nextScene: GameKitScene) => {
        reset(nextScene);
        setSelectedEntityIds(new Set(nextScene.entities[0]?.id ? [nextScene.entities[0].id] : []));
        setSelectedGuiNodeId(null);
        setSelectedComponentInstanceId(null);
        setIsDirty(false);
        setLastSaved(new Date());
        setStatus("Ready");
      })
      .catch((e) => setStatus(e instanceof Error ? e.message : "Load failed"));
  }, [currentSceneFile, projectPath]);

  // Global Keyboard listener for editor tools & keyframes
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const ctrl = event.metaKey || event.ctrlKey;
      const isInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement;

      // Listen to Arrow states for active play mode movements
      if (isPlaying && !isPaused) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(event.key)) {
          pressedKeysRef.current.add(event.key);
          if (["ArrowUp", " "].includes(event.key)) {
            event.preventDefault(); // Stop page scrolling
          }
          return;
        }
      }

      if (ctrl && !event.shiftKey && event.key === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (ctrl && (event.shiftKey && event.key === "z") || (ctrl && event.key === "y")) {
        event.preventDefault();
        redo();
        return;
      }
      if (ctrl && !event.shiftKey && event.key === "s") {
        event.preventDefault();
        saveScene(sceneRef.current);
        return;
      }

      // Viewport Gizmo shortcuts
      if (!isInput && !isPlaying) {
        if (event.key === "q" || event.key === "Q") { setActiveTool("select"); return; }
        if (event.key === "w" || event.key === "W") { setActiveTool("translate"); return; }
        if (event.key === "e" || event.key === "E") { setActiveTool("rotate"); return; }
        if (event.key === "r" || event.key === "R") { setActiveTool("scale"); return; }
      }

      if (!isInput && (event.key === "Delete" || event.key === "Backspace")) {
        const ids = selectedEntityIdsRef.current;
        if (ids.size > 0) {
          event.preventDefault();
          ids.forEach((id) => deleteEntity(id));
        }
        return;
      }
      if (ctrl && event.key === "d") {
        const ids = selectedEntityIdsRef.current;
        if (ids.size > 0) {
          event.preventDefault();
          ids.forEach((id) => duplicateEntity(id));
        }
        return;
      }
      if (ctrl && event.key === "c") {
        const ids = selectedEntityIdsRef.current;
        if (ids.size > 0) {
          event.preventDefault();
          const s = sceneRef.current;
          if (!s) return;
          const entity = s.entities.find((e) => e.id === [...ids][0]);
          if (entity) clipboardRef.current = structuredClone(entity) as GameKitEntity;
        }
        return;
      }
      if (ctrl && event.key === "v") {
        const entity = clipboardRef.current;
        if (!entity) return;
        event.preventDefault();
        pasteEntity(entity);
        return;
      }
      if (event.key === "Escape") {
        if (selectedEntityIdsRef.current.size > 0 || selectedGuiNodeIdRef.current || selectedComponentInstanceIdRef.current) {
          event.preventDefault();
          setSelectedEntityIds(new Set());
          setSelectedGuiNodeId(null);
          setSelectedComponentInstanceId(null);
        }
        return;
      }
      if (!isInput && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        const ids = [...selectedEntityIdsRef.current];
        if (ids.length === 0) return;
        event.preventDefault();
        const moveMap: Record<string, { x: number; y: number }> = {
          ArrowUp: { x: 0, y: -1 },
          ArrowDown: { x: 0, y: 1 },
          ArrowLeft: { x: -1, y: 0 },
          ArrowRight: { x: 1, y: 0 },
        };
        const delta = event.shiftKey ? 10 : 1;
        const move = moveMap[event.key];
        if (!move) return;
        const shouldSnap = snap;
        push((draft) => {
          if (!draft) return;
          for (const eid of ids) {
            const ent = draft.entities.find((e) => e.id === eid);
            if (!ent) continue;
            const t = findComponent<TransformComponent>(ent, "Transform");
            if (!t) continue;
            if (shouldSnap) {
              const rounded = { x: Math.round(t.position.x / snapSize) * snapSize, y: Math.round(t.position.y / snapSize) * snapSize };
              t.position.x = rounded.x + move.x * snapSize;
              t.position.y = rounded.y + move.y * snapSize;
            } else {
              t.position.x = Math.round((t.position.x + move.x * delta) * 10) / 10;
              t.position.y = Math.round((t.position.y + move.y * delta) * 10) / 10;
            }
          }
        });
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (isPlaying && !isPaused) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(event.key)) {
          pressedKeysRef.current.delete(event.key);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo, redo, push, snap, snapSize, isPlaying, isPaused]);

  // Real-time physics engine loop for playmode
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    let frameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1); // cap lag
      lastTime = time;

      let modified = false;

      setScene((currentScene) => {
        if (!currentScene) return currentScene;

        const nextEntities = currentScene.entities.map((ent) => {
          const player = findComponent<PlayerControllerComponent>(ent, "PlayerController");
          const transform = findComponent<TransformComponent>(ent, "Transform");

          if (transform && player) {
            const currentVelocity = velocitiesRef.current[ent.id] || { x: 0, y: 0 };
            
            // Gravity effect
            currentVelocity.y += player.gravity * delta;

            // X directional key mapping
            let hInput = 0;
            if (pressedKeysRef.current.has("ArrowLeft")) hInput = -1;
            if (pressedKeysRef.current.has("ArrowRight")) hInput = 1;
            currentVelocity.x = hInput * player.speed;

            // Jump mapping
            const isGrounded = transform.position.y >= 300; // Mock floor boundary
            if ((pressedKeysRef.current.has("ArrowUp") || pressedKeysRef.current.has(" ")) && isGrounded) {
              currentVelocity.y = -player.jumpVelocity;
              addConsoleLog("physics", `Rigid body impulse: jumpVelocity = ${player.jumpVelocity}`);
            }

            // Target positioning
            const newPos = {
              x: transform.position.x + currentVelocity.x * delta,
              y: Math.min(transform.position.y + currentVelocity.y * delta, 300)
            };

            if (newPos.y === 300 && transform.position.y < 300) {
              addConsoleLog("physics", `Grounded object ${ent.name} hit floor collision limit.`);
            }

            if (newPos.y === 300) {
              currentVelocity.y = 0;
            }

            velocitiesRef.current[ent.id] = currentVelocity;
            modified = true;

            return {
              ...ent,
              components: ent.components.map((c) =>
                c.type === "Transform" ? { ...c, position: newPos } : c
              )
            };
          }
          return ent;
        });

        if (modified) {
          return {
            ...currentScene,
            entities: nextEntities
          };
        }
        return currentScene;
      });

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, isPaused, setScene, addConsoleLog]);

  async function saveScene(nextScene = scene) {
    if (!nextScene) return;
    setSaveState("saving");
    try {
      const response = await fetch(getApiUrl(`/api/scene?file=${currentSceneFile}`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextScene)
      });
      if (!response.ok) {
        const body = await response.json() as { error?: string; errors?: string[] };
        throw new Error(body.error ?? body.errors?.join(", ") ?? "Save failed");
      }
      setSaveState("saved");
      setIsDirty(false);
      setLastSaved(new Date());
      setStatus("Saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setStatus("Save failed");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  async function deleteAsset(assetId: string) {
    const usingSprites = scene?.entities.filter((e) =>
      e.components.some((c) => c.type === "Sprite" && c.assetId === assetId)
    );
    if (usingSprites && usingSprites.length > 0) {
      if (!confirm(`Asset "${assetId}" is used by ${usingSprites.length} entity(s). Delete anyway?`)) return;
    }
    setStatus("Deleting");
    const response = await fetch(getApiUrl(`/api/assets?id=${encodeURIComponent(assetId)}`), { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json() as { error?: string };
      throw new Error(body.error ?? "Delete failed");
    }
    await refresh();
    addConsoleLog("system", `Deleted asset ${assetId}`);
  }

  async function importAsset(file: File) {
    setStatus("Importing");
    const response = await fetch(getApiUrl(`/api/assets?filename=${encodeURIComponent(file.name)}`), { method: "POST", body: await file.arrayBuffer() });
    if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Import failed");
    await refresh();
    addConsoleLog("system", `Imported asset from file: ${file.name}`);
  }

  function updateScene(mutator: (draft: GameKitScene) => void) {
    push((draft) => {
      if (draft) mutator(draft);
    });
    setIsDirty(true);
    triggerAutoSave();
  }

  function addEntity() {
    updateScene((draft) => {
      const entity = createEntity("Entity", { x: 180, y: 240 });
      const assetId = selectedAssetId ?? snapshot.assets[0]?.id;
      if (assetId) {
        entity.components.push({ type: "Sprite", assetId, width: 64, height: 64, anchor: { x: 0.5, y: 0.5 } });
      }
      entity.components.push({ type: "AabbCollider", offset: { x: -32, y: -32 }, size: { x: 64, y: 64 }, isStatic: false });
      draft.entities.push(entity);
      setSelectedEntityIds(new Set([entity.id]));
      addConsoleLog("system", `Created standard entity ${entity.name}`);
    });
  }

  function addTemplateEntity(templateType: "empty" | "sprite" | "collider" | "player" | "camera") {
    updateScene((draft) => {
      const entity = createEntity(templateType.charAt(0).toUpperCase() + templateType.slice(1), { x: 180, y: 240 });
      if (templateType === "sprite" || templateType === "player") {
        const assetId = selectedAssetId ?? snapshot.assets[0]?.id;
        if (assetId) {
          entity.components.push({ type: "Sprite", assetId, width: 64, height: 64, anchor: { x: 0.5, y: 0.5 } });
        }
      }
      if (templateType === "collider" || templateType === "player") {
        entity.components.push({ type: "AabbCollider", offset: { x: -32, y: -32 }, size: { x: 64, y: 64 }, isStatic: templateType === "collider" });
      }
      if (templateType === "player") {
        entity.components.push({ type: "PlayerController", speed: 320, jumpVelocity: 600, gravity: 1800 });
      }
      if (templateType === "camera") {
        entity.components.push({ type: "CameraFollow", targetId: entity.id, smoothing: 0.15 });
      }
      draft.entities.push(entity);
      setSelectedEntityIds(new Set([entity.id]));
      addConsoleLog("system", `Added template entity: [${templateType.toUpperCase()}] ${entity.name}`);
    });
  }

  function deleteEntity(id: string) {
    updateScene((draft) => {
      const index = draft.entities.findIndex((e) => e.id === id);
      if (index === -1) return;
      const name = draft.entities[index].name;
      draft.entities.splice(index, 1);
      setSelectedEntityIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        if (next.size === 0) {
          const fallback = draft.entities[Math.min(index, draft.entities.length - 1)]?.id;
          if (fallback) next.add(fallback);
        }
        return next;
      });
      addConsoleLog("system", `Deleted entity ${name}`);
    });
  }

  function duplicateEntity(id: string) {
    const current = scene;
    if (!current) return;
    const source = current.entities.find((e) => e.id === id);
    if (!source) return;
    pasteEntity(source);
  }

  function pasteEntity(source: GameKitEntity) {
    updateScene((draft) => {
      const clone = structuredClone(source) as GameKitEntity;
      clone.id = crypto.randomUUID();
      clone.name = `${source.name} (copy)`;
      const transform = findComponent<TransformComponent>(clone, "Transform");
      if (transform) {
        transform.position.x += 32;
        transform.position.y += 32;
      }
      const sourceIndex = draft.entities.findIndex((e) => e.id === source.id);
      draft.entities.splice(sourceIndex + 1, 0, clone);
      clipboardRef.current = structuredClone(clone) as GameKitEntity;
      setSelectedEntityIds(new Set([clone.id]));
      addConsoleLog("system", `Duplicated entity to ${clone.name}`);
    });
  }

  function handleCreateScene(name: string) {
    const newScene = createEmptyScene(name);
    const fileName = `${newScene.id}.scene.json`;
    fetch(getApiUrl(`/api/scene?file=${fileName}`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newScene)
    }).then(() => {
      setSnapshot((prev) => ({ ...prev, scenes: [...prev.scenes, fileName] }));
      setCurrentSceneFile(fileName);
      refresh();
      addConsoleLog("system", `Created new scene configuration file: ${fileName}`);
    });
  }

  function handleDeleteScene(sceneId: string) {
    if (snapshot.scenes.length <= 1) { alert("Cannot delete the last scene"); return; }
    fetch(getApiUrl(`/api/scene?file=${sceneId}`), { method: "DELETE" }).then(() => {
      const remaining = snapshot.scenes.filter((s) => s !== sceneId);
      setSnapshot((prev) => ({ ...prev, scenes: remaining }));
      if (currentSceneFile === sceneId) setCurrentSceneFile(remaining[0]);
      refresh();
      addConsoleLog("system", `Deleted scene configuration file ${sceneId}`);
    });
  }

  function handleCreateLevel(name: string) {
    const newLevel: GameKitLevel = {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      order: snapshot.levels.length + 1,
      sceneIds: [],
      unlocked: snapshot.levels.length === 0
    };
    setSnapshot((prev) => ({ ...prev, levels: [...prev.levels, newLevel] }));
    setIsDirty(true);
    triggerAutoSave();
    addConsoleLog("system", `Created new game level ${name}`);
  }

  function handleDeleteLevel(levelId: string) {
    setSnapshot((prev) => ({ ...prev, levels: prev.levels.filter((l) => l.id !== levelId) }));
    setIsDirty(true);
    triggerAutoSave();
    addConsoleLog("system", `Deleted game level ID: ${levelId}`);
  }

  function handleToggleUnlockLevel(levelId: string) {
    setSnapshot((prev) => ({
      ...prev,
      levels: prev.levels.map((l) => l.id === levelId ? { ...l, unlocked: !l.unlocked } : l)
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleReorderLevels(levels: GameKitLevel[]) {
    setSnapshot((prev) => ({ ...prev, levels }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleAssignSceneToLevel(levelId: string, sceneId: string) {
    setSnapshot((prev) => ({
      ...prev,
      levels: prev.levels.map((l) => l.id === levelId ? { ...l, sceneIds: [...l.sceneIds, sceneId] } : l)
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleRemoveSceneFromLevel(levelId: string, sceneId: string) {
    setSnapshot((prev) => ({
      ...prev,
      levels: prev.levels.map((l) => l.id === levelId ? { ...l, sceneIds: l.sceneIds.filter((s) => s !== sceneId) } : l)
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  // GUI node management
  function addGuiNode(type: GuiNode["type"]) {
    updateScene((draft) => {
      const base = {
        id: createId(type),
        x: 20,
        y: 20,
        width: 200,
        height: 40,
        visible: true,
        interactive: false
      };
      let node: GuiNode;
      switch (type) {
        case "Text":
          node = { ...base, type: "Text", text: "Text", fontSize: 16, color: "#ffffff", align: "left" };
          break;
        case "Button":
          node = { ...base, type: "Button", text: "Button", action: "", fontSize: 14, color: "#ffffff", backgroundColor: "#333333" };
          break;
        case "Image":
          node = { ...base, type: "Image", assetId: snapshot.assets[0]?.id ?? "" };
          break;
      }
      draft.gui.nodes.push(node);
      setSelectedGuiNodeId(node.id);
      addConsoleLog("system", `Created GUI ${type} node: ${node.id}`);
    });
  }

  function deleteGuiNode(id: string) {
    updateScene((draft) => {
      const index = draft.gui.nodes.findIndex((n) => n.id === id);
      if (index === -1) return;
      draft.gui.nodes.splice(index, 1);
      if (selectedGuiNodeId === id) {
        setSelectedGuiNodeId(null);
      }
      addConsoleLog("system", `Deleted GUI node: ${id}`);
    });
  }

  function updateGuiNode(mutator: (node: GuiNode) => void) {
    if (!selectedGuiNodeId) return;
    updateScene((draft) => {
      const node = draft.gui.nodes.find((n) => n.id === selectedGuiNodeId);
      if (node) mutator(node);
    });
  }

  // GUI Component definition management
  function addGuiComponent(name: string) {
    const component = createGuiComponent(name);
    const newComponents = [...snapshot.guiComponents, component];
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    setEditingComponentId(component.id);
    persistProject({ guiComponents: newComponents });
    addConsoleLog("system", `Created GUI component: ${name}`);
  }

  function deleteGuiComponent(componentId: string) {
    const newComponents = snapshot.guiComponents.filter((c) => c.id !== componentId);
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    updateScene((draft) => {
      draft.gui.componentInstances = (draft.gui.componentInstances ?? []).filter(
        (inst) => inst.componentId !== componentId
      );
    });
    if (editingComponentId === componentId) setEditingComponentId(null);
    persistProject({ guiComponents: newComponents });
    addConsoleLog("system", `Deleted GUI component`);
  }

  function addNodeToEditingComponent(type: GuiNode["type"]) {
    if (!editingComponentId) return;
    const base = { id: createId(type), x: 10, y: 10, width: 200, height: 40, visible: true, interactive: false };
    let node: GuiNode;
    switch (type) {
      case "Text": node = { ...base, type: "Text", text: "Text", fontSize: 16, color: "#ffffff" }; break;
      case "Button": node = { ...base, type: "Button", text: "Button", fontSize: 14, color: "#ffffff", backgroundColor: "#333333" }; break;
      case "Image": node = { ...base, type: "Image", assetId: snapshot.assets[0]?.id ?? "" }; break;
    }
    const newComponents = snapshot.guiComponents.map((c) =>
      c.id === editingComponentId ? { ...c, nodes: [...c.nodes, node] } : c
    );
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    persistProject({ guiComponents: newComponents });
  }

  function deleteNodeFromEditingComponent(nodeId: string) {
    if (!editingComponentId) return;
    const newComponents = snapshot.guiComponents.map((c) =>
      c.id === editingComponentId ? { ...c, nodes: c.nodes.filter((n) => n.id !== nodeId) } : c
    );
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    persistProject({ guiComponents: newComponents });
  }

  // GUI Component instance management
  function addGuiComponentInstance(componentId: string) {
    updateScene((draft) => {
      if (!draft.gui.componentInstances) draft.gui.componentInstances = [];
      const instance = createGuiComponentInstance(componentId, { x: 20, y: 20 });
      draft.gui.componentInstances.push(instance);
      setSelectedComponentInstanceId(instance.id);
      setSelectedEntityIds(new Set());
      setSelectedGuiNodeId(null);
    });
    addConsoleLog("system", `Placed component instance`);
  }

  function deleteGuiComponentInstance(instanceId: string) {
    updateScene((draft) => {
      draft.gui.componentInstances = (draft.gui.componentInstances ?? []).filter(
        (i) => i.id !== instanceId
      );
    });
    if (selectedComponentInstanceId === instanceId) setSelectedComponentInstanceId(null);
  }

  function updateGuiComponentInstance(mutator: (inst: import("@gamekit/schema").GuiComponentInstance) => void) {
    if (!selectedComponentInstanceId) return;
    updateScene((draft) => {
      const inst = (draft.gui.componentInstances ?? []).find((i) => i.id === selectedComponentInstanceId);
      if (inst) mutator(inst);
    });
  }

  async function persistProject(partial: Partial<import("@gamekit/schema").GameKitProject>) {
    await fetch(getApiUrl("/api/project"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(partial),
    });
  }

  // Play controls
  function handlePlayToggle() {
    if (!isPlaying) {
      preSimulationSceneRef.current = structuredClone(scene) as GameKitScene;
      setIsPlaying(true);
      setIsPaused(false);
      addConsoleLog("system", "IGNITE SIMULATOR: Sandboxed execution mode started.");
      addConsoleLog("physics", "Gravity loop initialized. Static colliders resolved.");
      addConsoleLog("script", "Keyboard arrow movement active. Test jumping using Space or ArrowUp!");
    } else {
      setIsPaused((p) => {
        const next = !p;
        addConsoleLog("system", next ? "Simulation paused." : "Simulation resumed.");
        return next;
      });
    }
  }

  function handleStop() {
    if (isPlaying) {
      setIsPlaying(false);
      setIsPaused(false);
      reset(preSimulationSceneRef.current);
      addConsoleLog("system", "IGNITE SIMULATOR: Sandbox execution stopped. Viewport reverted.");
      velocitiesRef.current = {};
    }
  }

  // Terminal slash commands
  function executeConsoleCommand(cmdStr: string) {
    const tokens = cmdStr.trim().split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    if (cmd === "/clear") {
      setLogs([]);
      return;
    }

    addConsoleLog("system", `Executing command: ${cmdStr}`);

    if (cmd === "/help") {
      addConsoleLog("system", "Engine Command Console Reference:");
      addConsoleLog("system", "  /spawn                - Spawns randomized solid obstacle Box.");
      addConsoleLog("system", "  /gravity [number]     - Adjusts simulated gravity force (e.g. 1800).");
      addConsoleLog("system", "  /speed [number]       - Overrides speed px/s on active Player.");
      addConsoleLog("system", "  /clear                - Empties terminal logs history.");
      return;
    }

    if (cmd === "/spawn") {
      updateScene((draft) => {
        const randX = Math.round(80 + Math.random() * 230);
        const randY = Math.round(100 + Math.random() * 120);
        const obstacle = createEntity(`Obstacle_${Math.round(Math.random() * 100)}`, { x: randX, y: randY });
        
        obstacle.components.push({
          type: "AabbCollider",
          offset: { x: -20, y: -20 },
          size: { x: 40, y: 40 },
          isStatic: true
        });

        const assetId = selectedAssetId ?? snapshot.assets[0]?.id;
        if (assetId) {
          obstacle.components.push({
            type: "Sprite",
            assetId,
            width: 40,
            height: 40,
            anchor: { x: 0.5, y: 0.5 }
          });
        }
        draft.entities.push(obstacle);
        setSelectedEntityIds(new Set([obstacle.id]));
      });
      addConsoleLog("system", "Successfully spawned dynamic physics obstacle inside canvas.");
      return;
    }

    if (cmd === "/gravity") {
      const val = Number(tokens[1]);
      if (isNaN(val)) {
        addConsoleLog("error", "Failed to parse value. Usage: /gravity <number>");
        return;
      }
      // Update local player entities
      updateScene((draft) => {
        draft.gravity.y = val;
        draft.entities.forEach((ent) => {
          const p = findComponent<PlayerControllerComponent>(ent, "PlayerController");
          if (p) p.gravity = val;
        });
      });
      addConsoleLog("physics", `Global gravity force coefficients updated to ${val} y-accel.`);
      return;
    }

    if (cmd === "/speed") {
      const val = Number(tokens[1]);
      if (isNaN(val)) {
        addConsoleLog("error", "Failed to parse value. Usage: /speed <number>");
        return;
      }
      if (!selectedEntityId) {
        addConsoleLog("warn", "No entity selected to apply character controller speed updates.");
        return;
      }
      let found = false;
      updateScene((draft) => {
        const ent = draft.entities.find((e) => e.id === selectedEntityId);
        if (ent) {
          const player = findComponent<PlayerControllerComponent>(ent, "PlayerController");
          if (player) {
            player.speed = val;
            found = true;
          }
        }
      });
      if (found) {
        addConsoleLog("system", `Modified active PlayerController speed constants to ${val}px/s.`);
      } else {
        addConsoleLog("warn", "Selected entity lacks an active PlayerController script.");
      }
      return;
    }

    addConsoleLog("error", `Engine command '${cmd}' unrecognized. Enter '/help' to inspect command catalog.`);
  }

  const selectedEntity = scene?.entities.find((entity) => entity.id === selectedEntityId);
  const statusClass = status === "Loading" ? "loading" : status.startsWith("Load") || status.includes("failed") || saveState === "error" ? "error" : "";

  function formatLastSaved(): string {
    if (!lastSaved) return "";
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    if (diff < 5000) return "just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSaved.toLocaleTimeString();
  }

  function setError(error: unknown) {
    setStatus(error instanceof Error ? error.message : "Operation failed");
    addConsoleLog("error", error instanceof Error ? error.message : "Operation execution failed.");
  }

  if (isTauri && !projectPath) {
    return (
      <div className="tauri-dashboard">
        <div className="tauri-dashboard-card">
          <div className="glow-effect"></div>
          <div className="logo-section">
            <Gamepad2 size={48} className="dashboard-logo" />
            <h1>GAMEKIT</h1>
            <p className="subtitle">High-fidelity 2D Engine & Visual Editor</p>
          </div>
          
          <div className="action-section">
            <button type="button" className="btn-dashboard-primary" onClick={handleOpenProject}>
              <FolderOpen size={18} />
              <span>Open Project Folder</span>
            </button>
          </div>

          {recentProjects.length > 0 && (
            <div className="recent-projects-section">
              <h3>Recent Projects</h3>
              <div className="recent-list">
                {recentProjects.map((p) => (
                  <button 
                    key={p} 
                    type="button" 
                    className="recent-item" 
                    onClick={() => loadProjectFolder(p)}
                  >
                    <FolderOpen size={13} />
                    <span className="recent-path" title={p}>{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="dashboard-footer">
            <span>Powered by Tauri v2 & Rust</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className={`shell${bottomDrawerCollapsed ? " drawer-collapsed" : ""}`}>
      <Topbar
        sceneName={scene?.name ?? "Scene"}
        isDirty={isDirty}
        saveState={saveState}
        status={status}
        lastSaved={lastSaved}
        isPlaying={isPlaying}
        isPaused={isPaused}
        sidebarOpen={sidebarOpen}
        inspectorOpen={inspectorOpen}
        onPlayToggle={handlePlayToggle}
        onPauseToggle={() => setIsPaused((p) => !p)}
        onStop={handleStop}
        onRefresh={() => refresh().catch(setError)}
        onImport={(file) => importAsset(file).catch(setError)}
        onSave={() => saveScene().catch(setError)}
        onAddEntity={addEntity}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
        formatLastSaved={formatLastSaved}
        projectPath={projectPath}
        onCloseProject={handleCloseProject}
      />

      <section className={`workspace${!sidebarOpen ? " sidebar-collapsed" : ""}${!inspectorOpen ? " inspector-collapsed" : ""}`}>
        <div className={`panel sidebar-tabs${sidebarOpen ? " panel-open" : ""}`}>
          <div className="tab-bar">
            <button type="button" className={activeTab === "entities" ? "active" : ""} onClick={() => setActiveTab("entities")}>Hierarchy</button>
            <button type="button" className={activeTab === "scenes" ? "active" : ""} onClick={() => setActiveTab("scenes")}>Scenes</button>
            <button type="button" className={activeTab === "levels" ? "active" : ""} onClick={() => setActiveTab("levels")}>Levels</button>
            <button type="button" className={activeTab === "guis" ? "active" : ""} onClick={() => setActiveTab("guis")}>GUIs</button>
            <button type="button" className={activeTab === "components" ? "active" : ""} onClick={() => setActiveTab("components")}>Comps</button>
          </div>
          {activeTab === "entities" && (
            <Sidebar
              entities={scene?.entities ?? []}
              selectedEntityIds={selectedEntityIds}
              onSelectEntity={(id, shift) => {
                setSelectedEntityIds((prev) => {
                  const next = new Set(shift ? prev : undefined);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onDeleteEntity={(id) => deleteEntity(id)}
              onCopyEntity={(id) => {
                const entity = scene?.entities.find((e) => e.id === id);
                if (entity) clipboardRef.current = structuredClone(entity) as GameKitEntity;
              }}
              onCutEntity={(id) => {
                const entity = scene?.entities.find((e) => e.id === id);
                if (entity) {
                  clipboardRef.current = structuredClone(entity) as GameKitEntity;
                  deleteEntity(id);
                }
              }}
              onPasteEntity={() => {
                const entity = clipboardRef.current;
                if (entity) pasteEntity(entity);
              }}
              onDuplicateEntity={(id) => duplicateEntity(id)}
              onAddEntity={addEntity}
              onAddTemplate={addTemplateEntity}
            />
          )}
          {activeTab === "scenes" && (
            <ScenePanel
              scenes={snapshot.scenes}
              currentSceneId={currentSceneFile}
              onSelectScene={setCurrentSceneFile}
              onCreateScene={handleCreateScene}
              onDeleteScene={handleDeleteScene}
            />
          )}
          {activeTab === "levels" && (
            <LevelPanel
              levels={snapshot.levels}
              scenes={snapshot.scenes}
              currentLevelId={snapshot.levels.find((l) => l.sceneIds.includes(currentSceneFile))?.id ?? null}
              onSelectLevel={(levelId) => {
                const level = snapshot.levels.find((l) => l.id === levelId);
                if (level && level.sceneIds.length > 0) setCurrentSceneFile(level.sceneIds[0]);
              }}
              onCreateLevel={handleCreateLevel}
              onDeleteLevel={handleDeleteLevel}
              onToggleUnlock={handleToggleUnlockLevel}
              onReorderLevels={handleReorderLevels}
              onAssignScene={handleAssignSceneToLevel}
              onRemoveScene={handleRemoveSceneFromLevel}
            />
          )}
          {activeTab === "guis" && (
            <GuiPanel
              nodes={scene?.gui?.nodes ?? []}
              selectedGuiNodeId={selectedGuiNodeId}
              onSelectNode={(id) => {
                setSelectedGuiNodeId(id);
                setSelectedEntityIds(new Set());
                setSelectedComponentInstanceId(null);
              }}
              onAddNode={addGuiNode}
              onDeleteNode={deleteGuiNode}
            />
          )}
          {activeTab === "components" && (
            <GuiComponentPanel
              components={snapshot.guiComponents}
              editingComponentId={editingComponentId}
              onAddComponent={addGuiComponent}
              onDeleteComponent={deleteGuiComponent}
              onStartEdit={setEditingComponentId}
              onStopEdit={() => setEditingComponentId(null)}
              onAddNodeToComponent={addNodeToEditingComponent}
              onDeleteNodeFromComponent={deleteNodeFromEditingComponent}
              onPlaceInstance={addGuiComponentInstance}
            />
          )}
        </div>

        <SceneCanvas
          scene={scene}
          assets={snapshot.assets}
          selectedEntityIds={selectedEntityIds}
          selectedGuiNodeId={selectedGuiNodeId}
          guiComponents={snapshot.guiComponents}
          selectedComponentInstanceId={selectedComponentInstanceId}
          zoom={zoom}
          snap={snap}
          hasClipboard={clipboardRef.current !== null}
          activeTool={activeTool}
          showGrid={showGrid}
          showColliders={showColliders}
          snapSize={snapSize}
          isPlaying={isPlaying}
          onZoomChange={setZoom}
          onSnapToggle={setSnap}
          onSnapSizeChange={setSnapSize}
          onActiveToolChange={setActiveTool}
          onToggleGrid={setShowGrid}
          onToggleColliders={setShowColliders}
          onSelect={(id, shift) => {
            setSelectedGuiNodeId(null);
            setSelectedComponentInstanceId(null);
            if (!id) {
              setSelectedEntityIds(new Set());
              return;
            }
            setSelectedEntityIds((prev) => {
              const next = new Set(shift ? prev : undefined);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectGuiNode={(id) => {
            setSelectedEntityIds(new Set());
            setSelectedComponentInstanceId(null);
            setSelectedGuiNodeId(id);
          }}
          onSelectComponentInstance={(id) => {
            setSelectedEntityIds(new Set());
            setSelectedGuiNodeId(null);
            setSelectedComponentInstanceId(id);
          }}
          onTransform={(id, updates) => {
            push((draft) => {
              if (!draft) return;
              const entity = draft.entities.find((candidate) => candidate.id === id);
              const transform = entity?.components.find((component): component is TransformComponent => component.type === "Transform");
              if (transform) {
                if (updates.position) transform.position = updates.position;
                if (updates.rotation !== undefined) transform.rotation = updates.rotation;
                if (updates.scale) transform.scale = updates.scale;
              }
            });
            setIsDirty(true);
            triggerAutoSave();
          }}
          onAddEntity={addEntity}
          onPasteEntity={() => {
            const entity = clipboardRef.current;
            if (entity) pasteEntity(entity);
          }}
          onSelectAll={() => {
            if (!scene) return;
            setSelectedEntityIds(new Set(scene.entities.map((e) => e.id)));
          }}
          onCopyEntity={(id) => {
            const entity = scene?.entities.find((e) => e.id === id);
            if (entity) clipboardRef.current = structuredClone(entity) as GameKitEntity;
          }}
          onCutEntity={(id) => {
            const entity = scene?.entities.find((e) => e.id === id);
            if (entity) {
              clipboardRef.current = structuredClone(entity) as GameKitEntity;
              deleteEntity(id);
            }
          }}
          onDuplicateEntity={(id) => duplicateEntity(id)}
          onDeleteEntity={(id) => deleteEntity(id)}
        />

        <div
          className={`panel-backdrop${sidebarOpen || inspectorOpen ? " visible" : ""}`}
          onClick={() => { setSidebarOpen(false); setInspectorOpen(false); }}
        />

        <div className={`inspector-column${inspectorOpen ? " panel-open" : ""}`}>
          {scene && <SceneSettings scene={scene} onChange={updateScene} />}
          {selectedComponentInstanceId && scene ? (
            <GuiInstanceInspector
              instance={scene.gui.componentInstances?.find((i) => i.id === selectedComponentInstanceId)!}
              component={snapshot.guiComponents.find((c) => c.id === scene.gui.componentInstances?.find((i) => i.id === selectedComponentInstanceId)?.componentId)}
              assets={snapshot.assets}
              onChange={updateGuiComponentInstance}
              onDelete={() => deleteGuiComponentInstance(selectedComponentInstanceId)}
            />
          ) : selectedGuiNodeId && scene ? (
            <GuiInspector
              node={scene.gui.nodes.find((n) => n.id === selectedGuiNodeId)}
              assets={snapshot.assets}
              onChange={updateGuiNode}
              onDelete={() => deleteGuiNode(selectedGuiNodeId)}
            />
          ) : (
            <Inspector
              entity={selectedEntity}
              assets={snapshot.assets}
              entityIds={scene?.entities.map((e) => e.id) ?? []}
              multiCount={selectedEntityIds.size}
              onChange={(mutator) => updateScene((draft) => {
                const entity = draft.entities.find((candidate) => candidate.id === selectedEntityId);
                if (entity) mutator(entity);
              })}
              onDelete={selectedEntityIds.size > 0 ? () => selectedEntityIds.forEach((id) => deleteEntity(id)) : undefined}
            />
          )}
        </div>
      </section>

      {scene && (
        <section className={`bottom-drawer-panel${bottomDrawerCollapsed ? " collapsed" : ""}`}>
          <div className="drawer-tabs-bar">
            <button
              type="button"
              className={activeBottomTab === "assets" ? "drawer-tab active" : "drawer-tab"}
              onClick={() => setActiveBottomTab("assets")}
            >
              Content Browser
            </button>
            <button
              type="button"
              className={activeBottomTab === "timeline" ? "drawer-tab active" : "drawer-tab"}
              onClick={() => setActiveBottomTab("timeline")}
            >
              Sequencer Timeline
            </button>
            <button
              type="button"
              className={activeBottomTab === "console" ? "drawer-tab active" : "drawer-tab"}
              onClick={() => setActiveBottomTab("console")}
            >
              Developer Console
            </button>
            <button
              type="button"
              className="drawer-collapse-btn"
              onClick={() => setBottomDrawerCollapsed((v) => !v)}
              title={bottomDrawerCollapsed ? "Expand drawer" : "Collapse drawer"}
            >
              {bottomDrawerCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          <div className="drawer-content-box">
            {activeBottomTab === "assets" && (
              <AssetsPanel
                assets={snapshot.assets}
                selectedAssetId={selectedAssetId}
                onSelectAsset={setSelectedAssetId}
                onDeleteAsset={(id) => deleteAsset(id).catch(setError)}
                onImport={(file) => importAsset(file).catch(setError)}
              />
            )}
            {activeBottomTab === "timeline" && (
              <TimelinePanel
                scene={scene}
                onChange={updateScene}
              />
            )}
            {activeBottomTab === "console" && (
              <ConsolePanel
                logs={logs}
                onExecuteCommand={executeConsoleCommand}
                onClearLogs={() => setLogs([])}
              />
            )}
          </div>
        </section>
      )}

      <Footer
        scene={scene}
        assetCount={snapshot.assets.length}
        status={status}
        saveState={saveState}
        isDirty={isDirty}
        statusClass={statusClass}
      />
    </main>
  );
}