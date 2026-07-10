import type { GameKitScene, GameKitLevel, GameKitAsset, GameKitEntity, TransformComponent, PlayerControllerComponent, GuiNode, GuiComponent, AnimationComponent, AabbColliderComponent, CircleColliderComponent, PolygonColliderComponent, RigidBodyComponent, TilemapComponent } from "@gamekit/schema";
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
import { AgentPanel } from "./components/AgentPanel.js";
import { AgentSettings } from "./components/AgentSettings.js";
import { PrefabPanel } from "./components/PrefabPanel.js";
import { ProjectWizard } from "./components/ProjectWizard.js";
import { GuiInspector } from "./components/GuiInspector.js";
import { GuiComponentPanel } from "./components/GuiComponentPanel.js";
import { GuiInstanceInspector } from "./components/GuiInstanceInspector.js";
import type { ProjectSnapshot, SaveState } from "./types.js";
import { findComponent } from "./lib/components.js";
import { useUndo } from "./hooks/useUndo.js";
import { getApiUrl } from "./lib/api.js";
import logoUrl from "../../../logo.png";

// GameKit Runtime physics & logic imports
import { createPlayerController } from "@gamekit/runtime/player";
import { createRigidBody } from "@gamekit/runtime/rigid-body";
import {
  applyAabbCollisions,
  applyCircleCollisions,
  applyPolygonCollisions,
  getEntityAabb,
  getEntityCircle,
  getEntityPolygon,
  updateCollisionEvents,
  updateTriggerEvents
} from "@gamekit/runtime/collision";
import type { CollisionEvent, TriggerState, CollisionState, CollisionSolid, TriggerEvent } from "@gamekit/runtime/collision";
import { updateAnimation } from "@gamekit/runtime/animate";
import { playTimeline } from "@gamekit/runtime/timeline";
import type { TimelineState } from "@gamekit/runtime/timeline";
import { createAudioController, type AudioController } from "@gamekit/runtime/audio";
import { playerInputFromPressedKeys } from "@gamekit/runtime/input-map";

const AUTO_SAVE_DELAY_MS = 1500;
const MVP_SHOW_GUI_TOOLS = false;
const MVP_SHOW_LEVELS = true;
const MVP_SHOW_TIMELINE = false;
const MVP_SHOW_CONSOLE = false;

type SidebarTab = "entities" | "scenes" | "prefabs" | "agent" | "levels" | "guis" | "components";
type BottomTab = "assets" | "timeline" | "console";

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
  const [activeTab, setActiveTab] = useState<SidebarTab>("entities");
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

  // Experimental play-in-editor state is preserved, but hidden for MVP.
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>("assets");
  const isDesktop = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
    []
  );
  const [activeTool, setActiveTool] = useState<"select" | "translate" | "rotate" | "scale" | "paint" | "erase">("translate");
  const [paintTileId, setPaintTileId] = useState(1);
  const [playFps, setPlayFps] = useState(0);
  const [playFrameMs, setPlayFrameMs] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showColliders, setShowColliders] = useState(true);
  const sceneMtimeRef = useRef<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [inspectorOpen, setInspectorOpen] = useState(isDesktop);
  const [bottomDrawerCollapsed, setBottomDrawerCollapsed] = useState(false);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [snapSize, setSnapSize] = useState(32);
  const [logs, setLogs] = useState<ConsoleLog[]>([
    { type: "system", message: "Playroom editor initialized.", timestamp: new Date() },
    { type: "system", message: "Ready to edit scenes and image assets.", timestamp: new Date() }
  ]);

  const preSimulationSceneRef = useRef<GameKitScene | undefined>(undefined);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // GameKit physics loop refs
  const controllersRef = useRef<Map<string, ReturnType<typeof createPlayerController>>>(new Map());
  const rigidBodyRefs = useRef<Map<string, ReturnType<typeof createRigidBody>>>(new Map());
  const animationStatesRef = useRef<Map<string, { currentFrame: number; elapsed: number }>>(new Map());
  const timelineRef = useRef<TimelineState>({ elapsed: 0, playing: false });
  const triggerStateRef = useRef<TriggerState>(new Set());
  const collisionStateRef = useRef<CollisionState>(new Set());
  const audioControllerRef = useRef<AudioController | null>(null);

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
    const projectResponse = await fetch(getApiUrl("/api/project"));
    const rawSnapshot = await projectResponse.json() as {
      project?: { activeScene?: string };
      scenes: string[];
      assets: GameKitAsset[];
      levels?: GameKitLevel[];
      guiComponents?: import("@gamekit/schema").GuiComponent[];
    };
    const nextSnapshot: ProjectSnapshot = {
      scenes: rawSnapshot.scenes ?? [],
      assets: rawSnapshot.assets ?? [],
      levels: rawSnapshot.levels ?? [],
      guiComponents: rawSnapshot.guiComponents ?? []
    };

    // Honor agent/editor load_scene activations
    const activeFromProject = rawSnapshot.project?.activeScene;
    const sceneFile =
      activeFromProject && nextSnapshot.scenes.includes(activeFromProject)
        ? activeFromProject
        : currentSceneFile;

    if (sceneFile !== currentSceneFile) {
      setCurrentSceneFile(sceneFile);
    }

    const sceneResponse = await fetch(getApiUrl(`/api/scene?file=${sceneFile}`));
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

      // Arrow keys entity nudging
      if (!isInput && !isPlaying && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        const ids = selectedEntityIdsRef.current;
        if (ids.size > 0) {
          event.preventDefault();
          const amount = event.shiftKey ? 10 : 1;
          push((draft) => {
            if (!draft) return;
            for (const id of ids) {
              const entity = draft.entities.find((candidate) => candidate.id === id);
              const transform = entity?.components.find((component): component is TransformComponent => component.type === "Transform");
              if (transform) {
                if (event.key === "ArrowUp") transform.position.y -= amount;
                if (event.key === "ArrowDown") transform.position.y += amount;
                if (event.key === "ArrowLeft") transform.position.x -= amount;
                if (event.key === "ArrowRight") transform.position.x += amount;
              }
            }
          });
          setIsDirty(true);
          triggerAutoSave();
          return;
        }
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

  // Hot-reload scene when file changes on disk (agent / external edits)
  useEffect(() => {
    if (isPlaying || isDirty) return;
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
  }, [currentSceneFile, isPlaying, isDirty, addConsoleLog]);

  // Reset mtime baseline when scene file changes via UI
  useEffect(() => {
    sceneMtimeRef.current = null;
  }, [currentSceneFile]);

  // Real-time physics engine loop for playmode
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    let frameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedDt = 1 / 60;
    const maxSteps = 10;
    let fpsFrames = 0;
    let fpsWindowStart = performance.now();

    const tick = (timestamp: number) => {
      const frameDt = Math.min((timestamp - lastTime) / 1000, 0.25);
      lastTime = timestamp;
      setPlayFrameMs(Math.round(frameDt * 1000 * 10) / 10);
      fpsFrames += 1;
      if (timestamp - fpsWindowStart >= 500) {
        const fps = Math.round((fpsFrames * 1000) / (timestamp - fpsWindowStart));
        setPlayFps(fps);
        fpsFrames = 0;
        fpsWindowStart = timestamp;
      }

      accumulator += frameDt;

      let steps = 0;
      if (!sceneRef.current) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      let workingScene: GameKitScene = sceneRef.current;

      const input = playerInputFromPressedKeys(
        pressedKeysRef.current,
        sceneRef.current?.inputMap,
      );

      let changed = false;

      while (accumulator >= fixedDt && steps < maxSteps) {
        const dt = fixedDt;
        const solids: CollisionSolid[] = [];
        const collisionContacts: CollisionEvent[] = [];

        // 1. Gather all static non-trigger colliders
        for (const entity of workingScene.entities) {
          const aabbCollider = entity.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
          if (aabbCollider && aabbCollider.isStatic && !aabbCollider.isTrigger) {
            const aabb = getEntityAabb(entity);
            if (aabb) solids.push({ ...aabb, layer: aabbCollider.layer ?? 1, entityId: entity.id });
          }
          const circleCollider = entity.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
          if (circleCollider && circleCollider.isStatic && !circleCollider.isTrigger) {
            const circle = getEntityCircle(entity);
            if (circle) solids.push({ ...circle, layer: circleCollider.layer ?? 1, entityId: entity.id });
          }
          const polygonCollider = entity.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");
          if (polygonCollider && polygonCollider.isStatic && !polygonCollider.isTrigger) {
            const polygon = getEntityPolygon(entity);
            if (polygon) solids.push({ ...polygon, layer: polygonCollider.layer ?? 1, entityId: entity.id });
          }
        }

        // 2. Map and update entities
        const nextEntities: GameKitEntity[] = workingScene.entities.map((entity) => {
          const ent = structuredClone(entity);
          const transform = ent.components.find((c): c is TransformComponent => c.type === "Transform");
          if (!transform) return ent;

          const rb = rigidBodyRefs.current.get(ent.id);
          const controller = controllersRef.current.get(ent.id);

          if (rb) {
            if (controller && (input.left || input.right || input.jump)) rb.wake();
            if (rb.state.sleeping) return ent;

            if (controller) {
              controller.update(input, dt);
              rb.state.velocity.x = controller.state.velocity.x;
              rb.state.velocity.y = controller.state.velocity.y;
              controller.state.velocity = rb.state.velocity;
              controller.setGrounded(false);
            }

            rb.integrateForces(dt, workingScene.gravity || { x: 0, y: 9.8 * 60 });

            transform.rotation = (transform.rotation ?? 0) + rb.state.angularVelocity * dt;

            const aabbCollider = ent.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
            const circleCollider = ent.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
            const polygonCollider = ent.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

            if (aabbCollider) {
              const movingAabb = getEntityAabb(ent);
              if (movingAabb) {
                const mask = aabbCollider.mask;
                const result = applyAabbCollisions(movingAabb, rb.state.velocity, solids, mask);
                transform.position.x = result.position.x - aabbCollider.offset.x;
                transform.position.y = result.position.y - aabbCollider.offset.y;
                rb.state.velocity = result.velocity;
                rb.updateSleep(dt, result.grounded);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                if (controller && result.grounded) {
                  controller.setGrounded(true);
                }
              }
            } else if (circleCollider) {
              const circle = getEntityCircle(ent);
              if (circle) {
                const mask = circleCollider.mask;
                const result = applyCircleCollisions(circle, rb.state.velocity, solids, mask);
                transform.position.x = result.position.x - circleCollider.offset.x;
                transform.position.y = result.position.y - circleCollider.offset.y;
                rb.state.velocity = result.velocity;
                rb.updateSleep(dt, result.grounded);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                if (controller && result.grounded) {
                  controller.setGrounded(true);
                }
              }
            } else if (polygonCollider) {
              const polygon = getEntityPolygon(ent);
              if (polygon) {
                const result = applyPolygonCollisions(polygon, rb.state.velocity, solids, polygonCollider.mask);
                transform.position.x = result.position.x - polygonCollider.offset.x;
                transform.position.y = result.position.y - polygonCollider.offset.y;
                rb.state.velocity = result.velocity;
                rb.updateSleep(dt, result.grounded);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                if (controller && result.grounded) {
                  controller.setGrounded(true);
                }
              }
            } else {
              transform.position.x += rb.state.velocity.x * dt;
              transform.position.y += rb.state.velocity.y * dt;
              rb.updateSleep(dt, false);
            }

            // Sync RigidBody state back to component
            const rbComp = ent.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
            if (rbComp) {
              rbComp.velocity = { ...rb.state.velocity };
              rbComp.angularVelocity = rb.state.angularVelocity;
            }
          } else if (controller) {
            controller.update(input, dt);

            const collider = ent.components.find((c): c is AabbColliderComponent => c.type === "AabbCollider");
            const circleCollider = ent.components.find((c): c is CircleColliderComponent => c.type === "CircleCollider");
            const polygonCollider = ent.components.find((c): c is PolygonColliderComponent => c.type === "PolygonCollider");

            if (collider) {
              const movingAabb = getEntityAabb(ent);
              if (movingAabb) {
                const result = applyAabbCollisions(movingAabb, controller.state.velocity, solids, collider.mask);
                transform.position.x = result.position.x - collider.offset.x;
                transform.position.y = result.position.y - collider.offset.y;
                controller.state.velocity = result.velocity;
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else if (circleCollider) {
              const circle = getEntityCircle(ent);
              if (circle) {
                const result = applyCircleCollisions(circle, controller.state.velocity, solids, circleCollider.mask);
                transform.position.x = result.position.x - circleCollider.offset.x;
                transform.position.y = result.position.y - circleCollider.offset.y;
                controller.state.velocity = result.velocity;
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else if (polygonCollider) {
              const polygon = getEntityPolygon(ent);
              if (polygon) {
                const result = applyPolygonCollisions(polygon, controller.state.velocity, solids, polygonCollider.mask);
                transform.position.x = result.position.x - polygonCollider.offset.x;
                transform.position.y = result.position.y - polygonCollider.offset.y;
                controller.state.velocity = result.velocity;
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else {
              transform.position.x += controller.state.velocity.x * dt;
              transform.position.y += controller.state.velocity.y * dt;
            }
          }

          // Update animations
          const anim = ent.components.find((c): c is AnimationComponent => c.type === "Animation");
          if (anim) {
            let state = animationStatesRef.current.get(ent.id);
            if (!state) {
              state = { currentFrame: anim.currentFrame ?? 0, elapsed: 0 };
              animationStatesRef.current.set(ent.id, state);
            }
            anim.currentFrame = updateAnimation(anim, state, dt);
          }

          return ent;
        });

        // Trigger enter/exit
        const triggerUpdate = updateTriggerEvents(nextEntities, triggerStateRef.current);
        triggerStateRef.current = triggerUpdate.active;
        for (const event of triggerUpdate.events) {
          addConsoleLog("physics", `Trigger ${event.type}: ${event.triggerEntityId} with ${event.otherEntityId}`);
        }

        // Collision enter/exit
        const collisionUpdate = updateCollisionEvents(collisionContacts, collisionStateRef.current);
        collisionStateRef.current = collisionUpdate.active;
        for (const event of collisionUpdate.events) {
          addConsoleLog("physics", `Collision contact: ${event.entityId} with ${event.otherEntityId}`);
        }

        workingScene = { ...workingScene, entities: nextEntities };
        playTimeline(workingScene, timelineRef.current, dt);

        accumulator -= fixedDt;
        steps++;
        changed = true;
      }

      if (steps >= maxSteps) {
        accumulator = 0;
      }

      if (changed && workingScene) {
        setScene(workingScene);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
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

      // Initialize all simulation states
      controllersRef.current.clear();
      rigidBodyRefs.current.clear();
      animationStatesRef.current.clear();
      timelineRef.current = { elapsed: 0, playing: scene?.timeline?.playing ?? true };
      triggerStateRef.current.clear();
      collisionStateRef.current.clear();

      if (scene) {
        for (const entity of scene.entities) {
          const pc = entity.components.find((c): c is PlayerControllerComponent => c.type === "PlayerController");
          if (pc) {
            controllersRef.current.set(entity.id, createPlayerController(pc));
          }
          const rb = entity.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
          if (rb) {
            rigidBodyRefs.current.set(entity.id, createRigidBody(rb));
          }
        }
      }

      audioControllerRef.current?.dispose();
      audioControllerRef.current = createAudioController(scene?.entities ?? [], (assetId) => {
        const asset = snapshot.assets.find((a) => a.id === assetId);
        if (!asset) return undefined;
        return getApiUrl(`/gamekit/assets/${asset.file}`);
      });

      setIsPlaying(true);
      setIsPaused(false);
      setPlayFps(0);
      setPlayFrameMs(0);
      addConsoleLog("system", "IGNITE SIMULATOR: Sandboxed execution mode started.");
      addConsoleLog("physics", "Real-time physics engine loop initialized.");
      if ((audioControllerRef.current?.sources.length ?? 0) > 0) {
        addConsoleLog("system", `Audio: ${audioControllerRef.current!.sources.length} source(s) armed.`);
      }
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
      controllersRef.current.clear();
      rigidBodyRefs.current.clear();
      animationStatesRef.current.clear();
      triggerStateRef.current.clear();
      collisionStateRef.current.clear();
      audioControllerRef.current?.dispose();
      audioControllerRef.current = null;
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
      <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-bg-base text-text-primary">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(0,240,255,0.08) 0%, transparent 55%), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.06) 0%, transparent 45%)",
          }}
        />
        <div className="relative z-10 w-[min(440px,calc(100vw-32px))] rounded-lg border border-border-default bg-bg-surface/95 p-8 shadow-lg backdrop-blur-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={logoUrl} alt="Playroom" className="mb-3 size-14 object-contain" />
            <h1 className="type-display m-0 tracking-[0.12em]">PLAYROOM</h1>
            <p className="type-body mt-1.5">Local 2D scene editor for Expo projects</p>
          </div>

          <button
            type="button"
            onClick={handleOpenProject}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/15 px-4 py-3 text-md font-semibold tracking-[-0.015em] text-accent transition-colors hover:bg-accent/25"
          >
            <FolderOpen size={16} />
            Open Project Folder
          </button>
          <p className="type-body mt-3 text-center">
            After opening a project, use <span className="text-accent">New from template</span> in the top bar to apply a genre skill.
          </p>

          {recentProjects.length > 0 && (
            <div className="mt-6 border-t border-border-default pt-4">
              <h3 className="type-label m-0 mb-2">Recent Projects</h3>
              <div className="flex max-h-40 flex-col gap-1 overflow-auto">
                {recentProjects.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="list-row cursor-pointer"
                    onClick={() => loadProjectFolder(p)}
                  >
                    <FolderOpen size={13} className="shrink-0 text-accent" />
                    <span className="type-mono min-w-0 flex-1 truncate" title={p}>
                      {p}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="type-micro mt-6 text-center text-text-muted">Powered by Tauri v2 & Rust</div>
        </div>
      </div>
    );
  }

  return (
    <main className={`shell${bottomDrawerCollapsed ? " drawer-collapsed" : ""}`}>
        <Topbar
          sceneName={scene?.name ?? currentSceneFile}
          isDirty={isDirty}
          saveState={saveState}
          status={status}
          lastSaved={lastSaved}
          isPlaying={isPlaying}
          isPaused={isPaused}
          playFps={playFps}
          playFrameMs={playFrameMs}
          entityCount={scene?.entities.length ?? 0}
          sidebarOpen={sidebarOpen}
          inspectorOpen={inspectorOpen}
          onPlayToggle={handlePlayToggle}
          onPauseToggle={handlePlayToggle}
          onStop={handleStop}
          onRefresh={refresh}
          onImport={importAsset}
          onSave={saveScene}
          onAddEntity={addEntity}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleInspector={() => setInspectorOpen((v) => !v)}
          onOpenAgent={() => {
            setSidebarOpen(true);
            setActiveTab("agent");
          }}
          onOpenWizard={() => setWizardOpen(true)}
          formatLastSaved={formatLastSaved}
          projectPath={isTauri ? projectPath : null}
          onCloseProject={isTauri ? () => setProjectPath(null) : undefined}

        />

      <section className={`workspace${!sidebarOpen ? " sidebar-collapsed" : ""}${!inspectorOpen ? " inspector-collapsed" : ""}`}>
        <div className={`panel sidebar-tabs${sidebarOpen ? " panel-open" : ""}`}>
          <div className="flex shrink-0 flex-wrap items-stretch border-b border-border-default bg-bg-base">
            {(
              [
                ["entities", "Hierarchy"],
                ["scenes", "Scenes"],
                ["prefabs", "Prefabs"],
                ["agent", "Agent"],
                ...(MVP_SHOW_LEVELS ? [["levels", "Levels"] as const] : []),
                ...(MVP_SHOW_GUI_TOOLS
                  ? ([["guis", "GUIs"], ["components", "Comps"]] as const)
                  : []),
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as SidebarTab)}
                className={
                  activeTab === id
                    ? "relative h-8 px-2.5 text-2xs font-semibold uppercase tracking-[0.1em] text-accent after:absolute after:inset-x-2 after:top-0 after:h-0.5 after:rounded-b after:bg-accent after:content-['']"
                    : "h-8 px-2.5 text-2xs font-semibold uppercase tracking-[0.1em] text-text-muted hover:text-text-secondary"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="sidebar-content min-h-0 flex-1 overflow-hidden">
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
          {activeTab === "prefabs" && (
            <PrefabPanel
              sceneFile={currentSceneFile}
              selectedEntityId={selectedEntityId}
              onInstantiated={() => {
                refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
              }}
              onStatus={(message) => {
                setStatus(message);
                addConsoleLog("system", message);
              }}
            />
          )}
          {activeTab === "agent" && (
            <AgentPanel
              sceneId={currentSceneFile}
              isPlaying={isPlaying}
              onSettings={() => setAgentSettingsOpen(true)}
              onSceneMutated={() => {
                if (!isPlaying) {
                  refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
                }
              }}
            />
          )}
          {MVP_SHOW_LEVELS && activeTab === "levels" && (
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
          {MVP_SHOW_GUI_TOOLS && activeTab === "guis" && (
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
          {MVP_SHOW_GUI_TOOLS && activeTab === "components" && (
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
        </div>

        <SceneCanvas
          scene={scene}
          assets={snapshot.assets}
          selectedEntityIds={selectedEntityIds}
          selectedGuiNodeId={selectedGuiNodeId}
          guiComponents={snapshot.guiComponents}
          selectedComponentInstanceId={selectedComponentInstanceId}
          showGuiTools={MVP_SHOW_GUI_TOOLS}
          zoom={zoom}
          snap={snap}
          hasClipboard={clipboardRef.current !== null}
          activeTool={activeTool}
          showGrid={showGrid}
          showColliders={showColliders}
          snapSize={snapSize}
          isPlaying={isPlaying}
          paintTileId={paintTileId}
          onVirtualInput={(action, pressed) => {
            const key = action === "left" ? "ArrowLeft" : action === "right" ? "ArrowRight" : " ";
            if (pressed) pressedKeysRef.current.add(key);
            else pressedKeysRef.current.delete(key);
          }}
          onZoomChange={setZoom}
          onSnapToggle={setSnap}
          onSnapSizeChange={setSnapSize}
          onActiveToolChange={setActiveTool}
          onToggleGrid={setShowGrid}
          onToggleColliders={setShowColliders}
          onPaintTile={(entityId, gridX, gridY, tileId) => {
            updateScene((draft) => {
              const entity = draft.entities.find((e) => e.id === entityId);
              if (!entity) return;
              const tm = entity.components.find((c): c is TilemapComponent => c.type === "Tilemap");
              if (!tm) return;
              const idx = gridY * tm.gridWidth + gridX;
              if (idx < 0 || idx >= tm.tiles.length) return;
              if (tm.tiles[idx] === tileId) return;
              tm.tiles[idx] = tileId;
            });
          }}
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

        {(activeTool === "paint" || activeTool === "erase") && (
          <div className="tile-palette" role="toolbar" aria-label="Tile palette">
            <span className="tile-palette-label">
              {activeTool === "erase" ? "Erase" : "Brush"} · tile
            </span>
            <div className="tile-palette-swatches">
              {Array.from({ length: 16 }, (_, i) => i).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`tile-swatch${paintTileId === id && activeTool === "paint" ? " active" : ""}${id === 0 ? " empty" : ""}`}
                  onClick={() => {
                    setPaintTileId(id);
                    if (id === 0) setActiveTool("erase");
                    else setActiveTool("paint");
                  }}
                  title={id === 0 ? "Empty (erase)" : `Tile ${id}`}
                >
                  {id === 0 ? "·" : id}
                </button>
              ))}
            </div>
          </div>
        )}

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
          <div className="flex h-8 shrink-0 items-end gap-1 border-b border-border-default bg-bg-base px-3">
            {(
              [
                ["assets", "Content Browser"],
                ...(MVP_SHOW_TIMELINE ? [["timeline", "Sequencer Timeline"] as const] : []),
                ...(MVP_SHOW_CONSOLE ? [["console", "Developer Console"] as const] : []),
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveBottomTab(id as BottomTab)}
                className={
                  activeBottomTab === id
                    ? "flex h-7 items-center rounded-t border border-b-0 border-border-default bg-bg-surface px-3 text-xs font-semibold tracking-[-0.01em] text-accent shadow-[inset_0_2px_0_var(--accent)]"
                    : "flex h-7 items-center rounded-t px-3 text-xs font-semibold tracking-[-0.01em] text-text-muted hover:text-text-secondary"
                }
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="ml-auto mb-0.5 flex size-7 items-center justify-center rounded-sm text-text-muted hover:bg-bg-hover hover:text-text-primary"
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
            {MVP_SHOW_TIMELINE && activeBottomTab === "timeline" && (
              <TimelinePanel
                scene={scene}
                onChange={updateScene}
              />
            )}
            {MVP_SHOW_CONSOLE && activeBottomTab === "console" && (
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

      <AgentSettings open={agentSettingsOpen} onClose={() => setAgentSettingsOpen(false)} />
      <ProjectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onApplied={(sceneFile) => {
          setCurrentSceneFile(sceneFile);
          refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
        }}
        onStatus={(message) => {
          setStatus(message);
          addConsoleLog("system", message);
        }}
      />
    </main>
  );
}
