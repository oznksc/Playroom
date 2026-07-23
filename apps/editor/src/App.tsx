import type { GameKitScene, GameKitLevel, GameKitAsset, GameKitEntity, TransformComponent, PlayerControllerComponent, CameraFollowComponent, GuiNode, GuiComponent, AnimationComponent, AabbColliderComponent, CircleColliderComponent, PolygonColliderComponent, RigidBodyComponent, TilemapComponent, Vector2, TweenComponent, FollowPathComponent, ScriptComponent, StateMachineComponent } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";
import { createEntity, createEmptyScene, createId, createGuiComponent, createGuiComponentInstance, resolveGameRules, resolveFallDeathY, parseScene, GameKitSceneSchema, GameKitEntitySchema, GameKitComponentSchema } from "@gamekit/schema";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FolderOpen,
  Folder,
  Clock3,
  Terminal,
  X,
  Layers,
  Sparkles,
  Save,
  RefreshCw,
  Plus,
  LayoutTemplate,
  Settings,
  LogOut,
  MousePointer,
  Move,
  RefreshCcw,
  Maximize,
  Paintbrush,
  Eraser,
  Magnet,
  Grid3x3,
  Eye,
  EyeOff,
  Focus,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Play,
  Square,
  Box,
  FileText,
  Command,
  Route,
} from "lucide-react";
import { BrandCorner } from "./components/BrandCorner.js";
import { AppTabBar } from "./components/AppTabBar.js";
import { PlayControls } from "./components/PlayControls.js";
import { CommandPalette, type CommandItem } from "./components/CommandPalette.js";
import { Sidebar } from "./components/Sidebar.js";
import type { SidebarTabId } from "./components/SidebarRail.js";
import { SceneCanvas } from "./components/SceneCanvas.js";
import { Inspector } from "./components/Inspector.js";
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
import { RecipesPanel } from "./components/RecipesPanel.js";
import type { ProjectSnapshot, SaveState } from "./types.js";
import { findComponent } from "./lib/components.js";
import { useUndo } from "./hooks/useUndo.js";
import { getApiUrl } from "./lib/api.js";
import { executeEditorConsoleCommand } from "./lib/editor-console.js";
import { resetPlaySession } from "./lib/play-session.js";
import { createPlayPhysicsState } from "./lib/play-physics-state.js";
import { initializePlayCamera } from "./lib/play-camera.js";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.js";
import { displacementFromVelocity, velocityFromDisplacement, computeSceneWorldBounds, clampPlayCamera } from "./lib/physics.js";
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
import {
  resolveActionKeys,
  extendedInputFromPressedKeys,
  mergeGamepadIntoInput,
} from "@gamekit/runtime/input-map";
import { pollGamepad } from "@gamekit/runtime";
import { updateTween } from "@gamekit/runtime";
import { updateFollowPath } from "@gamekit/runtime";
import { evaluateScriptEvent, transitionFsm } from "@gamekit/runtime/script";
import { createCameraFollow } from "@gamekit/runtime/camera";

const AUTO_SAVE_DELAY_MS = 1500;
const MVP_SHOW_GUI_TOOLS = true;
const MVP_SHOW_LEVELS = true;
const MVP_SHOW_TIMELINE = true;
const MVP_SHOW_CONSOLE = true;

type SidebarTab = SidebarTabId;
type BottomTab = "assets" | "timeline" | "console";

const ApiErrorSchema = z.object({ error: z.string().optional() });
const SaveErrorSchema = z.object({ error: z.string().optional(), errors: z.array(z.string()).optional() });

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
  const [viewResetKey, setViewResetKey] = useState(0);
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
  const [activeTool, setActiveTool] = useState<"select" | "translate" | "rotate" | "scale" | "paint" | "erase" | "polygon-edit">("translate");
  const [paintTileId, setPaintTileId] = useState(1);
  const [playFps, setPlayFps] = useState(0);
  const [playFrameMs, setPlayFrameMs] = useState(0);
  /**
   * Play-mode game camera (world top-left of the locked screen).
   * Scrolls only inside the design viewport frame — never the editor workspace pan.
   */
  const [playViewPan, setPlayViewPan] = useState<{ x: number; y: number } | null>(null);
  /** Play session end state (fall death / win). */
  const [playOutcome, setPlayOutcome] = useState<null | {
    kind: "gameOver" | "win";
    message: string;
    livesLeft?: number;
  }>(null);
  const [playLives, setPlayLives] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showColliders, setShowColliders] = useState(true);
  const sceneMtimeRef = useRef<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [bottomDrawerCollapsed, setBottomDrawerCollapsed] = useState(true);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const commandPaletteOpenRef = useRef(false);
  commandPaletteOpenRef.current = commandPaletteOpen;
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
  const cameraFollowRef = useRef<ReturnType<typeof createCameraFollow> | null>(null);
  const playViewPanRef = useRef<{ x: number; y: number } | null>(null);
  const playSpawnRef = useRef<Vector2>({ x: 80, y: 300 });
  const playLivesRef = useRef(3);
  const playOutcomeRef = useRef<"none" | "gameOver" | "win">("none");
  const fallCooldownRef = useRef(0);

  const addConsoleLog = useCallback((type: ConsoleLog["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveScene(sceneRef.current);
    }, AUTO_SAVE_DELAY_MS);
  }, []);

  type ExampleProject = {
    id: string;
    name: string;
    description: string;
    path: string;
  };

  const [exampleProjects, setExampleProjects] = useState<ExampleProject[]>([]);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<ExampleProject[]>("list_example_projects"))
      .then((list) => setExampleProjects(list ?? []))
      .catch(() => setExampleProjects([]));
  }, [isTauri]);

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

  const handleOpenProject = async () => {
    try {
      setProjectLoadError(null);
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
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(msg);
      setProjectLoadError(msg);
    }
  };

  const loadProjectFolder = async (path: string) => {
    setIsLoadingProject(true);
    setProjectLoadError(null);
    try {
      setStatus("Starting server…");
      const { invoke } = await import("@tauri-apps/api/core");
      const resolved = await invoke<string>("start_server", { projectPath: path });
      setStatus("Waiting for editor API…");
      await waitForEditorApi();
      setStatus("Loading project…");
      // Keep welcome screen until scene is loaded — avoids empty-shell crash/black frame
      await refresh();
      setProjectPath(resolved);
      addToRecentProjects(resolved);
      addConsoleLog("system", `Loaded project: ${resolved}`);
    } catch (e) {
      console.error(e);
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
            ? e.message
            : "Failed to start server";
      setStatus(msg);
      setProjectLoadError(msg);
      setProjectPath(null);
    } finally {
      setIsLoadingProject(false);
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
    const nextScene = parseScene(await sceneResponse.json());
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

  // Keyboard shortcuts — command palette hotkey & editor gizmo/nudge shortcuts
  useKeyboardShortcuts({
    commandPaletteOpenRef,
    isPlaying,
    isPaused,
    pressedKeysRef,
    undo,
    redo,
    push,
    saveScene,
    sceneRef,
    setActiveTool,
    selectedEntityIdsRef,
    setIsDirty,
    triggerAutoSave,
    deleteEntity,
    duplicateEntity,
    pasteEntity,
    clipboardRef,
    selectedGuiNodeIdRef,
    selectedComponentInstanceIdRef,
    setSelectedEntityIds,
    setSelectedGuiNodeId,
    setSelectedComponentInstanceId,
    snap,
    snapSize,
    setCommandPaletteOpen,
  });

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

      // Freeze simulation when the run has ended
      if (playOutcomeRef.current !== "none") {
        frameId = requestAnimationFrame(tick);
        return;
      }

      accumulator += frameDt;

      let steps = 0;
      if (!sceneRef.current) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      let workingScene: GameKitScene = sceneRef.current;

      const baseInput = extendedInputFromPressedKeys(
        pressedKeysRef.current,
        sceneRef.current?.inputMap,
      );
      const input = mergeGamepadIntoInput(
        baseInput,
        sceneRef.current?.inputMap,
        pollGamepad(),
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
                const disp = displacementFromVelocity(rb.state.velocity, dt);
                const result = applyAabbCollisions(movingAabb, disp, solids, mask);
                transform.position.x = result.position.x - aabbCollider.offset.x;
                transform.position.y = result.position.y - aabbCollider.offset.y;
                rb.state.velocity = velocityFromDisplacement(result.velocity, dt);
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
                const disp = displacementFromVelocity(rb.state.velocity, dt);
                const result = applyCircleCollisions(circle, disp, solids, mask);
                transform.position.x = result.position.x - circleCollider.offset.x;
                transform.position.y = result.position.y - circleCollider.offset.y;
                rb.state.velocity = velocityFromDisplacement(result.velocity, dt);
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
                const disp = displacementFromVelocity(rb.state.velocity, dt);
                const result = applyPolygonCollisions(polygon, disp, solids, polygonCollider.mask);
                transform.position.x = result.position.x - polygonCollider.offset.x;
                transform.position.y = result.position.y - polygonCollider.offset.y;
                rb.state.velocity = velocityFromDisplacement(result.velocity, dt);
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
                const disp = displacementFromVelocity(controller.state.velocity, dt);
                const result = applyAabbCollisions(movingAabb, disp, solids, collider.mask);
                transform.position.x = result.position.x - collider.offset.x;
                transform.position.y = result.position.y - collider.offset.y;
                controller.state.velocity = velocityFromDisplacement(result.velocity, dt);
                // Keep horizontal intent from controller next frame; restore speed magnitude when grounded air-control
                if (input.left || input.right) {
                  const dir = Number(input.right) - Number(input.left);
                  const pc = ent.components.find((c): c is PlayerControllerComponent => c.type === "PlayerController");
                  if (pc) controller.state.velocity.x = dir * pc.speed;
                }
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else if (circleCollider) {
              const circle = getEntityCircle(ent);
              if (circle) {
                const disp = displacementFromVelocity(controller.state.velocity, dt);
                const result = applyCircleCollisions(circle, disp, solids, circleCollider.mask);
                transform.position.x = result.position.x - circleCollider.offset.x;
                transform.position.y = result.position.y - circleCollider.offset.y;
                controller.state.velocity = velocityFromDisplacement(result.velocity, dt);
                for (const otherEntityId of result.collisionEntityIds) {
                  collisionContacts.push({ entityId: ent.id, otherEntityId });
                }
                controller.setGrounded(result.grounded);
              }
            } else if (polygonCollider) {
              const polygon = getEntityPolygon(ent);
              if (polygon) {
                const disp = displacementFromVelocity(controller.state.velocity, dt);
                const result = applyPolygonCollisions(polygon, disp, solids, polygonCollider.mask);
                transform.position.x = result.position.x - polygonCollider.offset.x;
                transform.position.y = result.position.y - polygonCollider.offset.y;
                controller.state.velocity = velocityFromDisplacement(result.velocity, dt);
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

          // Tweens + FollowPath (parity with mobile/web runtimes)
          const tweens = ent.components.filter((c): c is TweenComponent => c.type === "Tween");
          for (const tween of tweens) {
            updateTween(tween, transform, dt);
          }
          const followPath = ent.components.find((c): c is FollowPathComponent => c.type === "FollowPath");
          if (followPath) {
            updateFollowPath(followPath, transform, dt);
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

        // Trigger enter/exit + script/FSM parity
        const triggerUpdate = updateTriggerEvents(nextEntities, triggerStateRef.current);
        triggerStateRef.current = triggerUpdate.active;
        for (const event of triggerUpdate.events) {
          addConsoleLog("physics", `Trigger ${event.type}: ${event.triggerEntityId} with ${event.otherEntityId}`);
          if (event.type === "enter") {
            for (const entityId of [event.triggerEntityId, event.otherEntityId]) {
              const entity = nextEntities.find((e) => e.id === entityId);
              if (!entity) continue;
              const context = {
                entityId: entity.id,
                entities: nextEntities,
                rigidBodies: rigidBodyRefs.current,
                playSound: (assetId: string) => audioControllerRef.current?.playAsset?.(assetId),
                destroyEntity: (id: string) => {
                  const idx = nextEntities.findIndex((e) => e.id === id);
                  if (idx >= 0) nextEntities.splice(idx, 1);
                },
              };
              const sm = entity.components.find((c): c is StateMachineComponent => c.type === "StateMachine");
              if (sm) {
                if (!sm.currentState) sm.currentState = sm.initialState;
                const stateObj = sm.states.find((s) => s.name === sm.currentState);
                if (stateObj?.on?.["triggerEnter"]) {
                  transitionFsm(sm, stateObj.on["triggerEnter"], context);
                }
              }
              const script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
              if (script) {
                evaluateScriptEvent("onTriggerEnter", script, context);
                evaluateScriptEvent("triggerEnter", script, context);
              }
            }
          }
        }

        // Collision enter/exit
        const collisionUpdate = updateCollisionEvents(collisionContacts, collisionStateRef.current);
        collisionStateRef.current = collisionUpdate.active;
        for (const event of collisionUpdate.events) {
          addConsoleLog("physics", `Collision contact: ${event.entityId} with ${event.otherEntityId}`);
        }

        workingScene = { ...workingScene, entities: nextEntities };
        playTimeline(workingScene, timelineRef.current, dt);

        // Side-scroller camera: follow CameraFollow target (or first player)
        let followTargetId: string | undefined;
        let followSmoothing = 0.2;
        for (const entity of nextEntities) {
          const cf = entity.components.find((c): c is CameraFollowComponent => c.type === "CameraFollow");
          if (cf) {
            followTargetId = cf.targetId || entity.id;
            followSmoothing = cf.smoothing > 0 ? cf.smoothing : 0.2;
            break;
          }
        }
        if (!followTargetId) {
          const playerEnt = nextEntities.find((e) =>
            e.components.some((c) => c.type === "PlayerController"),
          );
          followTargetId = playerEnt?.id;
        }
        if (followTargetId) {
          const target = nextEntities.find((e) => e.id === followTargetId);
          const targetTransform = target?.components.find(
            (c): c is TransformComponent => c.type === "Transform",
          );
          if (targetTransform) {
            if (!cameraFollowRef.current) {
              const initX = targetTransform.position.x - workingScene.viewport.width / 2;
              const initY = targetTransform.position.y - workingScene.viewport.height / 2;
              cameraFollowRef.current = createCameraFollow({
                viewport: {
                  x: workingScene.viewport.width,
                  y: workingScene.viewport.height,
                },
                // Snappier in play so long levels don't leave the character off-screen
                smoothing: Math.min(1, Math.max(0.18, followSmoothing)),
                initial: {
                  position: { x: initX, y: initY },
                  zoom: 1,
                },
              });
            }
            const camState = cameraFollowRef.current.update(targetTransform.position);
            const world = computeSceneWorldBounds(workingScene);
            const clamped = clampPlayCamera(camState.position, workingScene, world);
            cameraFollowRef.current.state.position = clamped;
            playViewPanRef.current = clamped;
          }
        }

        // Fall / void death from scene.gameRules
        const rules = resolveGameRules(workingScene.gameRules);
        if (rules.fallDeathEnabled && fallCooldownRef.current <= 0) {
          const fallY = resolveFallDeathY(workingScene, rules);
          for (const entity of nextEntities) {
            const hasPlayer = entity.components.some((c) => c.type === "PlayerController");
            if (!hasPlayer) continue;
            const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
            // Y increases downward — fallen when below the fall line
            if (!transform || transform.position.y < fallY) continue;

            if (rules.onFall === "respawn") {
              const unlimited = rules.lives <= 0;
              if (!unlimited) {
                playLivesRef.current = Math.max(0, playLivesRef.current - 1);
                setPlayLives(playLivesRef.current);
              }
              if (!unlimited && playLivesRef.current <= 0) {
                playOutcomeRef.current = "gameOver";
                setPlayOutcome({
                  kind: "gameOver",
                  message: rules.gameOverMessage,
                  livesLeft: 0,
                });
                setIsPaused(true);
                addConsoleLog("system", `GAME OVER — fell into the void (y=${Math.round(transform.position.y)}).`);
              } else {
                const spawn = rules.spawnPoint ?? playSpawnRef.current;
                transform.position.x = spawn.x;
                transform.position.y = spawn.y;
                const controller = controllersRef.current.get(entity.id);
                if (controller) {
                  controller.state.velocity = { x: 0, y: 0 };
                  controller.setGrounded(false);
                }
                const rb = rigidBodyRefs.current.get(entity.id);
                if (rb) {
                  rb.state.velocity = { x: 0, y: 0 };
                }
                const rbComp = entity.components.find((c): c is RigidBodyComponent => c.type === "RigidBody");
                if (rbComp) rbComp.velocity = { x: 0, y: 0 };
                fallCooldownRef.current = 0.4;
                addConsoleLog(
                  "physics",
                  `Fell into void — respawn at (${Math.round(spawn.x)}, ${Math.round(spawn.y)})` +
                    (unlimited ? "" : ` · lives ${playLivesRef.current}`),
                );
              }
            } else {
              playOutcomeRef.current = "gameOver";
              setPlayOutcome({
                kind: "gameOver",
                message: rules.gameOverMessage,
                livesLeft: playLivesRef.current,
              });
              setIsPaused(true);
              addConsoleLog("system", `GAME OVER — fell into the void (y=${Math.round(transform.position.y)}).`);
            }
            break;
          }
        }
        if (fallCooldownRef.current > 0) {
          fallCooldownRef.current = Math.max(0, fallCooldownRef.current - dt);
        }

        accumulator -= fixedDt;
        steps++;
        changed = true;
      }

      if (steps >= maxSteps) {
        accumulator = 0;
      }

      if (changed && workingScene) {
        setScene(workingScene);
        if (playViewPanRef.current) {
          setPlayViewPan({ ...playViewPanRef.current });
        }
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
        const body = SaveErrorSchema.parse(await response.json());
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
      const body = ApiErrorSchema.parse(await response.json());
      throw new Error(body.error ?? "Delete failed");
    }
    await refresh();
    addConsoleLog("system", `Deleted asset ${assetId}`);
  }

  async function importAsset(file: File) {
    setStatus("Importing");
    const response = await fetch(getApiUrl(`/api/assets?filename=${encodeURIComponent(file.name)}`), { method: "POST", body: await file.arrayBuffer() });
    if (!response.ok) throw new Error(ApiErrorSchema.parse(await response.json()).error ?? "Import failed");
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
          entity.components.push(GameKitComponentSchema.parse({ type: "Sprite", assetId, width: 64, height: 64, anchor: { x: 0.5, y: 0.5 } }));
        }
      }
      if (templateType === "collider" || templateType === "player") {
        entity.components.push(GameKitComponentSchema.parse({ type: "AabbCollider", offset: { x: -32, y: -32 }, size: { x: 64, y: 64 }, isStatic: templateType === "collider" }));
      }
      if (templateType === "player") {
        entity.components.push(GameKitComponentSchema.parse({ type: "PlayerController", speed: 320, jumpVelocity: 600, gravity: 1800 }));
      }
      if (templateType === "camera") {
        entity.components.push(GameKitComponentSchema.parse({ type: "CameraFollow", targetId: entity.id, smoothing: 0.15 }));
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
      const clone = GameKitEntitySchema.parse(structuredClone(source));
      clone.id = crypto.randomUUID();
      clone.name = `${source.name} (copy)`;
      const transform = findComponent<TransformComponent>(clone, "Transform");
      if (transform) {
        transform.position.x += 32;
        transform.position.y += 32;
      }
      const sourceIndex = draft.entities.findIndex((e) => e.id === source.id);
      draft.entities.splice(sourceIndex + 1, 0, clone);
      clipboardRef.current = GameKitEntitySchema.parse(structuredClone(clone));
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

  /** Scene files are stored as `*.scene.json`; levels may legacy-store bare ids like `main`. */
  function normalizeSceneFile(id: string): string {
    if (!id) return id;
    return id.endsWith(".scene.json") ? id : `${id}.scene.json`;
  }

  function sceneFileMatches(a: string, b: string): boolean {
    return normalizeSceneFile(a) === normalizeSceneFile(b);
  }

  function commitLevels(levels: GameKitLevel[]) {
    setSnapshot((prev) => ({ ...prev, levels }));
    persistProject({ levels }).catch((e) => {
      setStatus(e instanceof Error ? e.message : "Failed to save levels");
    });
  }

  function handleCreateLevel(name: string) {
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
  }

  function handleDeleteLevel(levelId: string) {
    commitLevels(snapshot.levels.filter((l) => l.id !== levelId));
    addConsoleLog("system", `Deleted game level ID: ${levelId}`);
  }

  function handleToggleUnlockLevel(levelId: string) {
    commitLevels(
      snapshot.levels.map((l) =>
        l.id === levelId ? { ...l, unlocked: !l.unlocked } : l
      )
    );
  }

  function handleReorderLevels(levels: GameKitLevel[]) {
    commitLevels(levels);
  }

  function handleAssignSceneToLevel(levelId: string, sceneId: string) {
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
  }

  function handleRemoveSceneFromLevel(levelId: string, sceneId: string) {
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
      preSimulationSceneRef.current = GameKitSceneSchema.parse(structuredClone(scene));

      // Initialize all simulation states
      controllersRef.current.clear();
      rigidBodyRefs.current.clear();
      animationStatesRef.current.clear();
      timelineRef.current = { elapsed: 0, playing: scene?.timeline?.playing ?? true };
      triggerStateRef.current.clear();
      collisionStateRef.current.clear();
      cameraFollowRef.current = null;
      playViewPanRef.current = null;
      setPlayViewPan(null);
      playOutcomeRef.current = "none";
      setPlayOutcome(null);
      fallCooldownRef.current = 0;

      if (scene) {
        const rules = resolveGameRules(scene.gameRules);
        playLivesRef.current = rules.lives > 0 ? rules.lives : 0;
        setPlayLives(rules.lives > 0 ? rules.lives : null);

        const physicsState = createPlayPhysicsState(scene);
        controllersRef.current = physicsState.controllers;
        rigidBodyRefs.current = physicsState.rigidBodies;

        const cameraState = initializePlayCamera(scene, rules);
        if (cameraState.spawnPoint) playSpawnRef.current = cameraState.spawnPoint;
        cameraFollowRef.current = cameraState.cameraFollow;
        playViewPanRef.current = cameraState.pan;
        setPlayViewPan(cameraState.pan);

        if (rules.fallDeathEnabled) {
          const fallY = resolveFallDeathY(scene, rules);
          addConsoleLog(
            "system",
            `Game rules: onFall=${rules.onFall}, fallY≈${Math.round(fallY)}` +
              (rules.onFall === "respawn" ? `, lives=${rules.lives || "∞"}` : ""),
          );
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
      addConsoleLog("system", "Camera follows player inside the game screen only (canvas pan locked).");
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
      resetPlaySession({ controllers: controllersRef.current, rigidBodies: rigidBodyRefs.current, animationStates: animationStatesRef.current, triggerState: triggerStateRef.current, collisionState: collisionStateRef.current, cameraFollowRef, playViewPanRef, playOutcomeRef, fallCooldownRef, audioControllerRef, setPlayViewPan, setPlayOutcome, setPlayLives, noneOutcome: "none" });
    }
  }

  function handlePlayRestart() {
    if (!preSimulationSceneRef.current) return;
    const snapshot = structuredClone(preSimulationSceneRef.current);
    setIsPlaying(false);
    setIsPaused(false);
    reset(snapshot);
    resetPlaySession({ controllers: controllersRef.current, rigidBodies: rigidBodyRefs.current, animationStates: animationStatesRef.current, triggerState: triggerStateRef.current, collisionState: collisionStateRef.current, cameraFollowRef, playViewPanRef, playOutcomeRef, fallCooldownRef, audioControllerRef, setPlayViewPan, setPlayOutcome, setPlayLives, noneOutcome: "none" });
    // Fresh play after state settles
    window.setTimeout(() => {
      preSimulationSceneRef.current = structuredClone(snapshot);
      handlePlayToggle();
    }, 0);
  }

  // Terminal slash commands
  function executeConsoleCommand(cmdStr: string) {
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
  }

  const selectedEntity = scene?.entities.find((entity) => entity.id === selectedEntityId);

  // Inspector is selection-driven only (not on the tab bar)
  useEffect(() => {
    const hasSelection =
      selectedEntityIds.size > 0 ||
      !!selectedGuiNodeId ||
      !!selectedComponentInstanceId;
    setInspectorOpen(hasSelection);
  }, [selectedEntityIds, selectedGuiNodeId, selectedComponentInstanceId]);


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

  const openLeftPanel = useCallback((tab: SidebarTab) => {
    setActiveTab(tab);
    setSidebarOpen(true);
    setBottomDrawerCollapsed(true);
  }, []);

  const openHierarchy = useCallback(() => openLeftPanel("entities"), [openLeftPanel]);
  const openScenes = useCallback(() => openLeftPanel("scenes"), [openLeftPanel]);
  const openPrefabs = useCallback(() => openLeftPanel("prefabs"), [openLeftPanel]);
  const openLevels = useCallback(() => openLeftPanel("levels"), [openLeftPanel]);
  const openAgent = useCallback(() => openLeftPanel("agent"), [openLeftPanel]);
  const openWorld = useCallback(() => openLeftPanel("world"), [openLeftPanel]);
  const openGuis = useCallback(() => openLeftPanel("guis"), [openLeftPanel]);
  const openGuiComponents = useCallback(() => openLeftPanel("components"), [openLeftPanel]);
  const openRecipes = useCallback(() => openLeftPanel("recipes"), [openLeftPanel]);

  const virtualTouchControls = useMemo(() => {
    const map = scene?.inputMap?.bindings?.length ? scene.inputMap : DEFAULT_INPUT_MAP;
    const set = new Set<"jump" | "fire" | "action">();
    for (const b of map.bindings) {
      if (b.touchControl === "jump" || b.touchControl === "fire" || b.touchControl === "action") {
        set.add(b.touchControl);
      }
    }
    if (set.size === 0) set.add("jump");
    return [...set];
  }, [scene?.inputMap]);

  const openContent = useCallback((tab: BottomTab = "assets") => {
    setActiveBottomTab(tab);
    setBottomDrawerCollapsed(false);
    setSidebarOpen(false);
  }, []);

  const saveEntityAsPrefab = useCallback(
    async (entityId: string) => {
      try {
        const entity = sceneRef.current?.entities.find((e) => e.id === entityId);
        const { createPrefabFromEntityApi } = await import("./components/PrefabPanel.js");
        const result = await createPrefabFromEntityApi({
          sceneFile: currentSceneFile,
          entityId,
          name: entity?.name,
        });
        setStatus(`Prefab saved: ${result.file}`);
        addConsoleLog("system", `Prefab saved: ${result.file}`);
        openPrefabs();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create prefab failed";
        setStatus(msg);
        addConsoleLog("error", msg);
      }
    },
    [currentSceneFile, addConsoleLog, openPrefabs]
  );

  const centerView = useCallback(() => {
    setZoom(1);
    setViewResetKey((k) => k + 1);
  }, []);

  const commandItems = useMemo((): CommandItem[] => {
    const ic = (node: ReactNode) => node;
    const items: CommandItem[] = [
      {
        id: "nav-hierarchy",
        label: "Open Hierarchy",
        section: "Navigate",
        keywords: ["entities", "panel", "sidebar"],
        icon: ic(<Layers size={14} strokeWidth={1.75} />),
        run: openHierarchy,
      },
      {
        id: "nav-content",
        label: "Open Content",
        section: "Navigate",
        keywords: ["assets", "drawer", "files"],
        icon: ic(<Folder size={14} strokeWidth={1.75} />),
        run: () => openContent("assets"),
      },
      {
        id: "nav-agent",
        label: "Open Agent",
        section: "Navigate",
        keywords: ["ai", "assistant"],
        icon: ic(<Sparkles size={14} strokeWidth={1.75} />),
        run: openAgent,
      },
      {
        id: "nav-scenes",
        label: "Open Scenes",
        section: "Navigate",
        keywords: ["files", "management"],
        icon: ic(<FileText size={14} strokeWidth={1.75} />),
        run: openScenes,
      },
      {
        id: "nav-prefabs",
        label: "Open Prefabs",
        section: "Navigate",
        keywords: ["templates", "instances", "reuse"],
        icon: ic(<Box size={14} strokeWidth={1.75} />),
        run: openPrefabs,
      },
      {
        id: "create-prefab",
        label: selectedEntity
          ? `Save “${selectedEntity.name || selectedEntity.id}” as Prefab`
          : "Save selection as Prefab",
        section: "Create",
        keywords: ["prefab", "template", "save"],
        icon: ic(<Box size={14} strokeWidth={1.75} />),
        disabled: !selectedEntity,
        run: () => {
          if (!selectedEntity) return;
          void saveEntityAsPrefab(selectedEntity.id);
        },
      },
      ...(MVP_SHOW_LEVELS
        ? [
            {
              id: "nav-levels",
              label: "Open Levels",
              section: "Navigate",
              keywords: ["levels", "order", "unlock"],
              icon: ic(<Layers size={14} strokeWidth={1.75} />),
              run: openLevels,
            } satisfies CommandItem,
          ]
        : []),
      {
        id: "nav-world",
        label: "Open World Settings",
        section: "Navigate",
        keywords: ["viewport", "gravity", "responsive", "scene", "input", "controls"],
        icon: ic(<Settings size={14} strokeWidth={1.75} />),
        run: openWorld,
      },
      ...(MVP_SHOW_GUI_TOOLS
        ? ([
            {
              id: "nav-guis",
              label: "Open GUI nodes",
              section: "Navigate",
              keywords: ["gui", "hud", "text", "button", "overlay"],
              icon: ic(<LayoutTemplate size={14} strokeWidth={1.75} />),
              run: openGuis,
            },
            {
              id: "nav-gui-components",
              label: "Open GUI components",
              section: "Navigate",
              keywords: ["gui", "component", "prefab", "widget"],
              icon: ic(<Box size={14} strokeWidth={1.75} />),
              run: openGuiComponents,
            },
          ] satisfies CommandItem[])
        : []),
      {
        id: "nav-recipes",
        label: "Open Recipes",
        section: "Navigate",
        keywords: ["recipe", "effect", "mechanic", "script", "animation", "gesture"],
        icon: ic(<Sparkles size={14} strokeWidth={1.75} />),
        run: openRecipes,
      },
      {
        id: "tool-select",
        label: "Select tool",
        section: "Tools",
        shortcut: "Q",
        icon: ic(<MousePointer size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("select"),
      },
      {
        id: "tool-move",
        label: "Move tool",
        section: "Tools",
        shortcut: "W",
        icon: ic(<Move size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("translate"),
      },
      {
        id: "tool-rotate",
        label: "Rotate tool",
        section: "Tools",
        shortcut: "E",
        icon: ic(<RefreshCcw size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("rotate"),
      },
      {
        id: "tool-scale",
        label: "Scale tool",
        section: "Tools",
        shortcut: "R",
        icon: ic(<Maximize size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("scale"),
      },
      {
        id: "tool-paint",
        label: "Paint tool",
        section: "Tools",
        keywords: ["tile", "brush"],
        icon: ic(<Paintbrush size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("paint"),
      },
      {
        id: "tool-erase",
        label: "Erase tool",
        section: "Tools",
        icon: ic(<Eraser size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("erase"),
      },
      {
        id: "tool-polygon-edit",
        label: "Polygon edit tool",
        section: "Tools",
        keywords: ["polygon", "collider", "points"],
        shortcut: "P",
        icon: ic(<Route size={14} strokeWidth={1.75} />),
        run: () => setActiveTool("polygon-edit"),
      },
      {
        id: "tool-snap",
        label: snap ? "Disable snap" : "Enable snap",
        section: "Tools",
        keywords: ["grid", "magnet"],
        icon: ic(<Magnet size={14} strokeWidth={1.75} />),
        run: () => setSnap((v) => !v),
      },
      {
        id: "view-grid",
        label: showGrid ? "Hide grid" : "Show grid",
        section: "View",
        icon: ic(<Grid3x3 size={14} strokeWidth={1.75} />),
        run: () => setShowGrid((v) => !v),
      },
      {
        id: "view-colliders",
        label: showColliders ? "Hide colliders" : "Show colliders",
        section: "View",
        icon: ic(
          showColliders ? (
            <EyeOff size={14} strokeWidth={1.75} />
          ) : (
            <Eye size={14} strokeWidth={1.75} />
          )
        ),
        run: () => setShowColliders((v) => !v),
      },
      {
        id: "view-center",
        label: "Center view",
        section: "View",
        keywords: ["reset", "camera", "fit"],
        icon: ic(<Focus size={14} strokeWidth={1.75} />),
        run: centerView,
      },
      {
        id: "view-zoom-in",
        label: "Zoom in",
        section: "View",
        icon: ic(<ZoomIn size={14} strokeWidth={1.75} />),
        run: () => setZoom((z) => Math.min(4, z + 0.1)),
      },
      {
        id: "view-zoom-out",
        label: "Zoom out",
        section: "View",
        icon: ic(<ZoomOut size={14} strokeWidth={1.75} />),
        run: () => setZoom((z) => Math.max(0.25, z - 0.1)),
      },
      {
        id: "view-zoom-100",
        label: "Zoom to 100%",
        section: "View",
        icon: ic(<Focus size={14} strokeWidth={1.75} />),
        run: () => setZoom(1),
      },
      {
        id: "create-entity",
        label: "Add entity",
        section: "Create",
        keywords: ["new", "object"],
        icon: ic(<Plus size={14} strokeWidth={1.75} />),
        run: addEntity,
      },
      {
        id: "create-template",
        label: "New from template…",
        section: "Create",
        keywords: ["wizard", "skill", "genre"],
        icon: ic(<LayoutTemplate size={14} strokeWidth={1.75} />),
        run: () => setWizardOpen(true),
      },
      {
        id: "edit-undo",
        label: "Undo",
        section: "Edit",
        shortcut: "⌘Z",
        icon: ic(<Undo2 size={14} strokeWidth={1.75} />),
        disabled: !canUndo,
        run: () => undo(),
      },
      {
        id: "edit-redo",
        label: "Redo",
        section: "Edit",
        shortcut: "⇧⌘Z",
        icon: ic(<Redo2 size={14} strokeWidth={1.75} />),
        disabled: !canRedo,
        run: () => redo(),
      },
      {
        id: "project-save",
        label: "Save scene",
        section: "Project",
        shortcut: "⌘S",
        icon: ic(<Save size={14} strokeWidth={1.75} />),
        run: () => saveScene(),
      },
      {
        id: "project-refresh",
        label: "Refresh project",
        section: "Project",
        icon: ic(<RefreshCw size={14} strokeWidth={1.75} />),
        run: () => {
          refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
        },
      },
      {
        id: "project-settings",
        label: "Agent settings",
        section: "Project",
        keywords: ["preferences", "config"],
        icon: ic(<Settings size={14} strokeWidth={1.75} />),
        run: () => setAgentSettingsOpen(true),
      },
      {
        id: "sim-play",
        label: isPlaying
          ? isPaused
            ? "Resume simulation"
            : "Pause simulation"
          : "Play simulation",
        section: "Simulation",
        keywords: ["run", "preview"],
        icon: ic(<Play size={14} strokeWidth={1.75} />),
        run: handlePlayToggle,
      },
      {
        id: "sim-stop",
        label: "Stop simulation",
        section: "Simulation",
        icon: ic(<Square size={14} strokeWidth={1.75} />),
        disabled: !isPlaying,
        run: handleStop,
      },
      {
        id: "cmd-palette-hint",
        label: "Command menu",
        section: "Help",
        shortcut: "⌘K",
        keywords: ["spotlight", "search", "palette"],
        icon: ic(<Command size={14} strokeWidth={1.75} />),
        run: () => setCommandPaletteOpen(true),
      },
    ];

    if (isTauri && projectPath) {
      items.push({
        id: "project-close",
        label: "Close project",
        section: "Project",
        icon: ic(<LogOut size={14} strokeWidth={1.75} />),
        run: handleCloseProject,
      });
    }

    for (const sceneFile of snapshot.scenes) {
      items.push({
        id: `scene-${sceneFile}`,
        label: `Open scene “${sceneFile.replace(/\.scene\.json$/, "")}”`,
        section: "Scenes",
        keywords: ["goto", "switch", sceneFile],
        icon: ic(<FileText size={14} strokeWidth={1.75} />),
        run: () => setCurrentSceneFile(sceneFile),
      });
    }

    for (const entity of scene?.entities ?? []) {
      items.push({
        id: `entity-${entity.id}`,
        label: entity.name || entity.id,
        section: "Entities",
        keywords: ["select", "goto", entity.id],
        icon: ic(<Box size={14} strokeWidth={1.75} />),
        run: () => {
          setSelectedEntityIds(new Set([entity.id]));
          setSelectedGuiNodeId(null);
          setSelectedComponentInstanceId(null);
          setInspectorOpen(true);
          setSidebarOpen(true);
          setActiveTab("entities");
          setBottomDrawerCollapsed(true);
        },
      });
    }

    return items;
  }, [
    snap,
    showGrid,
    showColliders,
    canUndo,
    canRedo,
    isPlaying,
    isPaused,
    isTauri,
    projectPath,
    snapshot.scenes,
    scene?.entities,
    openHierarchy,
    openContent,
    openAgent,
    openScenes,
    openPrefabs,
    openLevels,
    openWorld,
    centerView,
    undo,
    redo,
    selectedEntity,
    currentSceneFile,
    saveEntityAsPrefab,
  ]);

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
        <div className="relative z-10 w-[min(480px,calc(100vw-32px))] rounded-[18px] border border-white/[0.08] bg-[rgba(16,18,22,0.92)] p-8 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={logoUrl} alt="Playroom" className="mb-3 size-14 object-contain" />
            <h1 className="type-display m-0 tracking-[0.08em]">PLAYROOM</h1>
            <p className="type-body mt-1.5">Open a project folder that contains a gamekit/ directory</p>
          </div>

          <button
            type="button"
            disabled={isLoadingProject}
            onClick={handleOpenProject}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-accent/40 bg-accent/15 px-4 py-3 text-md font-semibold tracking-[-0.015em] text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
          >
            <FolderOpen size={16} />
            {isLoadingProject ? "Opening…" : "Open Project Folder"}
          </button>

          {exampleProjects.length > 0 && (
            <div className="mt-5">
              <h3 className="m-0 mb-2 text-[11px] font-semibold tracking-[-0.01em] text-[rgba(235,235,245,0.45)]">
                Example projects
              </h3>
              <div className="flex flex-col gap-1.5">
                {exampleProjects.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    disabled={isLoadingProject}
                    onClick={() => loadProjectFolder(ex.path)}
                    className="flex w-full flex-col items-start gap-0.5 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    <span className="text-[13px] font-semibold tracking-[-0.015em] text-[rgba(245,245,247,0.92)]">
                      {ex.name}
                    </span>
                    <span className="text-[11px] text-[rgba(235,235,245,0.4)]">{ex.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recentProjects.length > 0 && (
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <h3 className="m-0 mb-2 text-[11px] font-semibold tracking-[-0.01em] text-[rgba(235,235,245,0.45)]">
                Recent
              </h3>
              <div className="flex max-h-36 flex-col gap-1 overflow-auto">
                {recentProjects.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={isLoadingProject}
                    className="list-row cursor-pointer disabled:opacity-50"
                    onClick={() => loadProjectFolder(p)}
                  >
                    <Folder size={13} className="shrink-0 text-accent" />
                    <span className="type-mono min-w-0 flex-1 truncate" title={p}>
                      {p}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {projectLoadError && (
            <div className="mt-4 rounded-[12px] border border-error/30 bg-error/10 px-3 py-2 text-[11px] leading-relaxed text-error whitespace-pre-wrap">
              {projectLoadError}
            </div>
          )}

          <p className="type-micro mt-5 text-center text-text-muted">
            Tip: pick the project root (e.g. templates/expo-game), not only the gamekit folder.
            Requires <code className="text-accent">pnpm build</code> first.
          </p>
        </div>
      </div>
    );
  }



  return (
    <main
      className={`shell${bottomDrawerCollapsed ? " drawer-collapsed" : ""}${!bottomDrawerCollapsed ? " has-bottom-sheet" : ""}`}
    >
      {/* Full-bleed canvas — primary focus */}
      <div className="canvas-stage relative">
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
          playViewPan={playViewPan}
          paintTileId={paintTileId}
          viewResetKey={viewResetKey}
          virtualTouchControls={virtualTouchControls}
          onVirtualInput={(action, pressed) => {
            const keys = resolveActionKeys(sceneRef.current?.inputMap);
            const map: Record<typeof action, string[]> = {
              left: keys.left,
              right: keys.right,
              jump: keys.jump,
              fire: keys.fire.length ? keys.fire : ["__fire__"],
              action: keys.action.length ? keys.action : ["__action__"],
            };
            const list = map[action] ?? [];
            for (const key of list) {
              if (pressed) pressedKeysRef.current.add(key);
              else pressedKeysRef.current.delete(key);
            }
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
          onPolygonPointsChange={(id, points) => {
            push((draft) => {
              if (!draft) return;
              const entity = draft.entities.find((candidate) => candidate.id === id);
              const polygon = entity?.components.find((c): c is import("@gamekit/schema").PolygonColliderComponent => c.type === "PolygonCollider");
              if (polygon) {
                polygon.points = points;
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
            if (entity) clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
          }}
          onCutEntity={(id) => {
            const entity = scene?.entities.find((e) => e.id === id);
            if (entity) {
              clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
              deleteEntity(id);
            }
          }}
          onDuplicateEntity={(id) => duplicateEntity(id)}
          onDeleteEntity={(id) => deleteEntity(id)}
          onSaveAsPrefab={(id) => void saveEntityAsPrefab(id)}
        />

        {isPlaying && playLives !== null && !playOutcome && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-white/10 bg-black/55 px-2.5 py-1 font-mono text-[11px] text-accent backdrop-blur-sm">
            Lives {playLives}
          </div>
        )}

        {isPlaying && playOutcome && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
            <div className="w-[min(360px,calc(100%-32px))] rounded-2xl border border-white/10 bg-[rgba(10,14,20,0.95)] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <p
                className={`m-0 text-lg font-bold tracking-[0.06em] ${
                  playOutcome.kind === "win" ? "text-accent" : "text-[#ff6b8a]"
                }`}
              >
                {playOutcome.message}
              </p>
              <p className="mt-2 text-[12px] text-text-muted">
                {playOutcome.kind === "gameOver"
                  ? "You fell into the void. Adjust World → Game rules for respawn, lives, and fall line."
                  : "Level complete."}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-[12px] font-semibold text-accent hover:bg-accent/25"
                  onClick={handlePlayRestart}
                >
                  Restart
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-text-primary hover:bg-white/10"
                  onClick={handleStop}
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}

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
      </div>

      {/* Bottom-left logo, tab-bar level — every action is on the tab bar */}
      <BrandCorner isDirty={isDirty} />

      <PlayControls
        isPlaying={isPlaying}
        isPaused={isPaused}
        playFps={playFps}
        playFrameMs={playFrameMs}
        entityCount={scene?.entities.length ?? 0}
        onPlayToggle={handlePlayToggle}
        onStop={handleStop}
      />

      {/* Bottom tab bar — navigation, tools, project */}
      <AppTabBar
        active={
          !bottomDrawerCollapsed
            ? "content"
            : sidebarOpen && activeTab === "agent"
              ? "agent"
              : sidebarOpen && activeTab === "world"
                ? "world"
                : sidebarOpen && activeTab === "scenes"
                  ? "scenes"
                  : sidebarOpen && activeTab === "prefabs"
                    ? "prefabs"
                    : sidebarOpen && activeTab === "levels"
                      ? "levels"
                      : sidebarOpen && activeTab === "guis"
                        ? "guis"
                        : sidebarOpen && activeTab === "components"
                          ? "gui-components"
                          : sidebarOpen && activeTab === "recipes"
                            ? "recipes"
                            : sidebarOpen
                              ? "hierarchy"
                              : null
        }
        saveState={saveState}
        projectPath={isTauri ? projectPath : null}
        showLevels={MVP_SHOW_LEVELS}
        showGuiTools={MVP_SHOW_GUI_TOOLS}
        onHierarchy={() => {
          if (sidebarOpen && activeTab === "entities") setSidebarOpen(false);
          else openHierarchy();
        }}
        onScenes={() => {
          if (sidebarOpen && activeTab === "scenes") setSidebarOpen(false);
          else openScenes();
        }}
        onPrefabs={() => {
          if (sidebarOpen && activeTab === "prefabs") setSidebarOpen(false);
          else openPrefabs();
        }}
        onLevels={
          MVP_SHOW_LEVELS
            ? () => {
                if (sidebarOpen && activeTab === "levels") setSidebarOpen(false);
                else openLevels();
              }
            : undefined
        }
        onGuis={
          MVP_SHOW_GUI_TOOLS
            ? () => {
                if (sidebarOpen && activeTab === "guis") setSidebarOpen(false);
                else openGuis();
              }
            : undefined
        }
        onGuiComponents={
          MVP_SHOW_GUI_TOOLS
            ? () => {
                if (sidebarOpen && activeTab === "components") setSidebarOpen(false);
                else openGuiComponents();
              }
            : undefined
        }
        onRecipes={() => {
          if (sidebarOpen && activeTab === "recipes") setSidebarOpen(false);
          else openRecipes();
        }}
        onContent={() => {
          if (!bottomDrawerCollapsed && activeBottomTab === "assets") {
            setBottomDrawerCollapsed(true);
          } else {
            openContent("assets");
          }
        }}
        onAgent={() => {
          if (sidebarOpen && activeTab === "agent") setSidebarOpen(false);
          else openAgent();
        }}
        onWorld={() => {
          if (sidebarOpen && activeTab === "world") setSidebarOpen(false);
          else openWorld();
        }}
        onSave={saveScene}
        onRefresh={refresh}
        onImport={importAsset}
        onAddEntity={addEntity}
        onOpenWizard={() => setWizardOpen(true)}
        onSettings={() => setAgentSettingsOpen(true)}
        onCloseProject={isTauri ? handleCloseProject : undefined}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        activeTool={activeTool}
        snap={snap}
        snapSize={snapSize}
        showGrid={showGrid}
        showColliders={showColliders}
        zoom={zoom}
        onActiveToolChange={setActiveTool}
        onSnapToggle={setSnap}
        onSnapSizeChange={setSnapSize}
        onToggleGrid={setShowGrid}
        onToggleColliders={setShowColliders}
        onZoomChange={setZoom}
        onCenterView={() => {
          setZoom(1);
          setViewResetKey((k) => k + 1);
        }}
      />

      {/* Left floating sheet */}
      <div className={`float-sheet-left${sidebarOpen ? " open" : ""}`} role="dialog" aria-label="Workspace panel">
        <div className="sidebar-content">
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
                if (entity) clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
              }}
              onCutEntity={(id) => {
                const entity = scene?.entities.find((e) => e.id === id);
                if (entity) {
                  clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
                  deleteEntity(id);
                }
              }}
              onPasteEntity={() => {
                const entity = clipboardRef.current;
                if (entity) pasteEntity(entity);
              }}
              onDuplicateEntity={(id) => duplicateEntity(id)}
              onSaveAsPrefab={(id) => void saveEntityAsPrefab(id)}
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
              selectedEntityName={selectedEntity?.name}
              onInstantiated={() => {
                refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
              }}
              onStatus={(message) => {
                setStatus(message);
                addConsoleLog(
                  message.toLowerCase().includes("fail") || message.toLowerCase().includes("select")
                    ? message.toLowerCase().includes("fail")
                      ? "error"
                      : "warn"
                    : "system",
                  message
                );
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
          {activeTab === "world" && scene && (
            <SceneSettings scene={scene} onChange={updateScene} />
          )}
          {activeTab === "world" && !scene && (
            <div className="flex h-full items-center justify-center p-4 text-center text-[12px] text-text-muted">
              Load a scene to edit world settings.
            </div>
          )}
          {MVP_SHOW_LEVELS && activeTab === "levels" && (
            <LevelPanel
              levels={snapshot.levels}
              scenes={snapshot.scenes}
              currentLevelId={
                snapshot.levels.find((l) =>
                  l.sceneIds.some((s) => sceneFileMatches(s, currentSceneFile))
                )?.id ?? null
              }
              onSelectLevel={(levelId) => {
                const level = snapshot.levels.find((l) => l.id === levelId);
                if (!level) return;
                // Prefer first attached scene; normalize legacy bare ids ("main" → "main.scene.json")
                const raw = level.sceneIds[0];
                if (!raw) {
                  addConsoleLog("warn", `Level "${level.name}" has no scenes attached.`);
                  return;
                }
                const file = normalizeSceneFile(raw);
                if (!snapshot.scenes.some((s) => sceneFileMatches(s, file))) {
                  addConsoleLog(
                    "error",
                    `Level scene "${file}" not found. Attach a valid scene file first.`
                  );
                  setStatus(`Scene not found: ${file}`);
                  return;
                }
                setCurrentSceneFile(file);
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
          {activeTab === "recipes" && (
            <RecipesPanel
              scenePath={currentSceneFile}
              selectedEntityId={selectedEntityId}
              selectedEntityName={selectedEntity?.name}
              onApplied={() => {
                refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
              }}
              onStatus={(message) => {
                setStatus(message);
                addConsoleLog("system", message);
              }}
            />
          )}
        </div>
      </div>

      {/* Right floating inspector sheet — entity / GUI properties only */}
      <div className={`float-sheet-right${inspectorOpen ? " open" : ""}`} role="dialog" aria-label="Inspector">
        <div className="inspector-column" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
      </div>

      {/* Content drawer — docks just above the tab bar */}
      {scene && (
        <section
          className={`bottom-sheet${!bottomDrawerCollapsed ? " open" : ""}`}
          aria-hidden={bottomDrawerCollapsed}
          aria-label="Content browser"
        >
          <div className="bottom-sheet-handle" aria-hidden />
          <div className="bottom-sheet-header">
            {(MVP_SHOW_TIMELINE || MVP_SHOW_CONSOLE) ? (
              <div className="bottom-sheet-tabs">
                {(
                  [
                    ["assets", "Content", <Folder key="i" size={13} strokeWidth={1.75} />] as const,
                    ...(MVP_SHOW_TIMELINE
                      ? ([["timeline", "Timeline", <Clock3 key="i" size={13} strokeWidth={1.75} />]] as const)
                      : []),
                    ...(MVP_SHOW_CONSOLE
                      ? ([["console", "Console", <Terminal key="i" size={13} strokeWidth={1.75} />]] as const)
                      : []),
                  ] as const
                ).map(([id, label, icon]) => (
                  <button
                    key={id}
                    type="button"
                    className={activeBottomTab === id ? "bottom-sheet-tab active" : "bottom-sheet-tab"}
                    onClick={() => setActiveBottomTab(id as BottomTab)}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <h2 className="bottom-sheet-title">
                <Folder size={14} strokeWidth={1.75} />
                Content
                <span>{snapshot.assets.length} assets</span>
              </h2>
            )}
            <button
              type="button"
              className="bottom-sheet-close"
              title="Close"
              aria-label="Close content drawer"
              onClick={() => setBottomDrawerCollapsed(true)}
            >
              <X size={16} strokeWidth={1.75} />
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
              <TimelinePanel scene={scene} onChange={updateScene} />
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

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        commands={commandItems}
      />
    </main>
  );
}
