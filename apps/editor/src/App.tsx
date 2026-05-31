import type { GameKitScene, GameKitLevel, GameKitAsset, TransformComponent } from "@gamekit/schema";
import { createEntity, createEmptyScene } from "@gamekit/schema";
import { useCallback, useEffect, useRef, useState } from "react";
import { Topbar } from "./components/Topbar.js";
import { Sidebar } from "./components/Sidebar.js";
import { SceneCanvas } from "./components/SceneCanvas.js";
import { Inspector } from "./components/Inspector.js";
import { Footer } from "./components/Footer.js";
import { ScenePanel } from "./components/ScenePanel.js";
import { LevelPanel } from "./components/LevelPanel.js";
import { SceneSettings } from "./components/SceneSettings.js";
import type { ProjectSnapshot, SaveState } from "./types.js";
import { findComponent } from "./lib/components.js";
import { useUndo } from "./hooks/useUndo.js";

const AUTO_SAVE_DELAY_MS = 1500;

const DEFAULT_SCENE: GameKitScene = {
  schemaVersion: 1,
  id: "",
  name: "",
  viewport: { width: 390, height: 844, background: "#101820" },
  gravity: { x: 0, y: 0 },
  assets: [],
  entities: [],
  responsive: { mode: "scale", referenceWidth: 390, referenceHeight: 844, orientation: "portrait", safeArea: { enabled: true, padding: { top: 0, bottom: 0, left: 0, right: 0 } } },
  timeline: { tracks: [] },
  gui: { nodes: [] },
};

export function App() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>({ scenes: [], assets: [], levels: [] });
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
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [status, setStatus] = useState("Loading");
  const [zoom, setZoom] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeTab, setActiveTab] = useState<"entities" | "scenes" | "levels">("entities");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const selectedEntityIdRef = useRef(selectedEntityId);
  selectedEntityIdRef.current = selectedEntityId;

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveScene(sceneRef.current);
    }, AUTO_SAVE_DELAY_MS);
  }, []);

  useEffect(() => () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); }, []);

  async function refresh() {
    const [projectResponse, sceneResponse] = await Promise.all([
      fetch("/api/project"),
      fetch(`/api/scene?file=${currentSceneFile}`)
    ]);
    const rawSnapshot = await projectResponse.json() as { project?: unknown; scenes: string[]; assets: GameKitAsset[]; levels?: GameKitLevel[] };
    const nextSnapshot: ProjectSnapshot = {
      scenes: rawSnapshot.scenes ?? [],
      assets: rawSnapshot.assets ?? [],
      levels: rawSnapshot.levels ?? []
    };
    const nextScene = await sceneResponse.json() as GameKitScene;
    setSnapshot(nextSnapshot);
    reset(nextScene);
    setSelectedEntityId(nextScene.entities[0]?.id);
    setSelectedAssetId(nextSnapshot.assets[0]?.id);
    setIsDirty(false);
    setLastSaved(new Date());
    setStatus("Ready");
  }

  useEffect(() => { refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Load failed")); }, []);

  useEffect(() => {
    fetch(`/api/scene?file=${currentSceneFile}`)
      .then((r) => r.json())
      .then((nextScene: GameKitScene) => {
        reset(nextScene);
        setSelectedEntityId(nextScene.entities[0]?.id);
        setIsDirty(false);
        setLastSaved(new Date());
        setStatus("Ready");
      })
      .catch((e) => setStatus(e instanceof Error ? e.message : "Load failed"));
  }, [currentSceneFile]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const ctrl = event.metaKey || event.ctrlKey;
      const isInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement;

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
      if (!isInput && (event.key === "Delete" || event.key === "Backspace")) {
        if (selectedEntityIdRef.current) {
          event.preventDefault();
          deleteEntity(selectedEntityIdRef.current);
        }
        return;
      }
      if (ctrl && event.key === "d") {
        if (selectedEntityIdRef.current) {
          event.preventDefault();
          duplicateEntity(selectedEntityIdRef.current);
        }
        return;
      }
      if (event.key === "Escape") {
        if (selectedEntityIdRef.current) {
          event.preventDefault();
          setSelectedEntityId(undefined);
        }
        return;
      }
      if (!isInput && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        const eid = selectedEntityIdRef.current;
        if (!eid) return;
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
        const s = sceneRef.current;
        if (!s) return;
        const entity = s.entities.find((e) => e.id === eid);
        if (!entity) return;
        const transform = findComponent<TransformComponent>(entity, "Transform");
        if (!transform) return;
        push((draft) => {
          if (!draft) return;
          const ent = draft.entities.find((e) => e.id === eid);
          if (!ent) return;
          const t = findComponent<TransformComponent>(ent, "Transform");
          if (!t) return;
          t.position.x = Math.round((t.position.x + move.x * delta) * 10) / 10;
          t.position.y = Math.round((t.position.y + move.y * delta) * 10) / 10;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, push]);

  async function saveScene(nextScene = scene) {
    if (!nextScene) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/scene?file=${currentSceneFile}`, {
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
    setStatus("Deleting");
    const response = await fetch(`/api/assets?id=${encodeURIComponent(assetId)}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json() as { error?: string };
      throw new Error(body.error ?? "Delete failed");
    }
    await refresh();
  }

  async function importAsset(file: File) {
    setStatus("Importing");
    const response = await fetch(`/api/assets?filename=${encodeURIComponent(file.name)}`, { method: "POST", body: await file.arrayBuffer() });
    if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Import failed");
    await refresh();
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
      setSelectedEntityId(entity.id);
    });
  }

  function deleteEntity(id: string) {
    updateScene((draft) => {
      const index = draft.entities.findIndex((e) => e.id === id);
      if (index === -1) return;
      draft.entities.splice(index, 1);
      if (selectedEntityId === id) {
        setSelectedEntityId(draft.entities[Math.min(index, draft.entities.length - 1)]?.id);
      }
    });
  }

  function duplicateEntity(id: string) {
    const current = scene;
    if (!current) return;
    const source = current.entities.find((e) => e.id === id);
    if (!source) return;
    updateScene((draft) => {
      const clone = structuredClone(source) as typeof source;
      clone.id = crypto.randomUUID();
      clone.name = `${source.name} (copy)`;
      const transform = findComponent<TransformComponent>(clone, "Transform");
      if (transform) {
        transform.position.x += 32;
        transform.position.y += 32;
      }
      const sourceIndex = draft.entities.findIndex((e) => e.id === id);
      draft.entities.splice(sourceIndex + 1, 0, clone);
      setSelectedEntityId(clone.id);
    });
  }

  function handleCreateScene(name: string) {
    const newScene = createEmptyScene(name);
    const fileName = `${newScene.id}.scene.json`;
    fetch(`/api/scene?file=${fileName}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newScene)
    }).then(() => {
      setSnapshot((prev) => ({ ...prev, scenes: [...prev.scenes, fileName] }));
      setCurrentSceneFile(fileName);
      refresh();
    });
  }

  function handleDeleteScene(sceneId: string) {
    if (snapshot.scenes.length <= 1) { alert("Cannot delete the last scene"); return; }
    fetch(`/api/scene?file=${sceneId}`, { method: "DELETE" }).then(() => {
      const remaining = snapshot.scenes.filter((s) => s !== sceneId);
      setSnapshot((prev) => ({ ...prev, scenes: remaining }));
      if (currentSceneFile === sceneId) setCurrentSceneFile(remaining[0]);
      refresh();
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
  }

  function handleDeleteLevel(levelId: string) {
    setSnapshot((prev) => ({ ...prev, levels: prev.levels.filter((l) => l.id !== levelId) }));
    setIsDirty(true);
    triggerAutoSave();
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
  }

  return (
    <main className="shell">
      <Topbar
        sceneName={scene?.name ?? "Scene"}
        isDirty={isDirty}
        saveState={saveState}
        status={status}
        lastSaved={lastSaved}
        onRefresh={() => refresh().catch(setError)}
        onImport={(file) => importAsset(file).catch(setError)}
        onSave={() => saveScene().catch(setError)}
        onAddEntity={addEntity}
        formatLastSaved={formatLastSaved}
      />

      <section className="workspace">
        <div className="panel sidebar-tabs">
          <div className="tab-bar">
            <button type="button" className={activeTab === "entities" ? "active" : ""} onClick={() => setActiveTab("entities")}>Entities</button>
            <button type="button" className={activeTab === "scenes" ? "active" : ""} onClick={() => setActiveTab("scenes")}>Scenes</button>
            <button type="button" className={activeTab === "levels" ? "active" : ""} onClick={() => setActiveTab("levels")}>Levels</button>
          </div>
          {activeTab === "entities" && (
            <Sidebar
              assets={snapshot.assets}
              entities={scene?.entities ?? []}
              selectedAssetId={selectedAssetId}
              selectedEntityId={selectedEntityId}
              onSelectAsset={setSelectedAssetId}
              onSelectEntity={setSelectedEntityId}
              onDeleteAsset={(id) => deleteAsset(id).catch(setError)}
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
        </div>

        <SceneCanvas
          scene={scene}
          assets={snapshot.assets}
          selectedEntityId={selectedEntityId}
          zoom={zoom}
          onZoomChange={setZoom}
          onSelect={setSelectedEntityId}
          onMove={(id, position) => {
            push((draft) => {
              if (!draft) return;
              const entity = draft.entities.find((candidate) => candidate.id === id);
              const transform = entity?.components.find((component): component is TransformComponent => component.type === "Transform");
              if (transform) transform.position = position;
            });
            setIsDirty(true);
            triggerAutoSave();
          }}
        />

        <div className="inspector-column">
          {scene && <SceneSettings scene={scene} onChange={updateScene} />}
          <Inspector
            entity={selectedEntity}
            assets={snapshot.assets}
            onChange={(mutator) => updateScene((draft) => {
              const entity = draft.entities.find((candidate) => candidate.id === selectedEntityId);
              if (entity) mutator(entity);
            })}
            onDelete={selectedEntityId ? () => deleteEntity(selectedEntityId) : undefined}
          />
        </div>
      </section>

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