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

const AUTO_SAVE_DELAY_MS = 1500;

export function App() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>({ scenes: [], assets: [], levels: [] });
  const [currentSceneFile, setCurrentSceneFile] = useState<string>("main.scene.json");
  const [scene, setScene] = useState<GameKitScene | undefined>();
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [status, setStatus] = useState("Loading");
  const [zoom] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeTab, setActiveTab] = useState<"entities" | "scenes" | "levels">("entities");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveScene(sceneRef.current);
    }, AUTO_SAVE_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

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
    setScene(nextScene);
    setSelectedEntityId((current) => current ?? nextScene.entities[0]?.id);
    setSelectedAssetId((current) => current ?? nextSnapshot.assets[0]?.id);
    setIsDirty(false);
    setLastSaved(new Date());
    setStatus("Ready");
  }

  useEffect(() => {
    refresh().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Load failed"));
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Load failed"));
  }, [currentSceneFile]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        saveScene(sceneRef.current);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function saveScene(nextScene = scene) {
    if (!nextScene) {
      return;
    }

    setSaveState("saving");
    try {
      const [sceneResponse, projectResponse] = await Promise.all([
        fetch(`/api/scene?file=${currentSceneFile}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(nextScene)
        }),
        fetch("/api/project", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ levels: snapshot.levels })
        })
      ]);

      if (!sceneResponse.ok) {
        const body = await sceneResponse.json() as { error?: string; errors?: string[] };
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

  async function importAsset(file: File) {
    setStatus("Importing");
    const response = await fetch(`/api/assets?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      body: await file.arrayBuffer()
    });

    if (!response.ok) {
      const body = await response.json() as { error?: string };
      throw new Error(body.error ?? "Import failed");
    }

    await refresh();
  }

  function updateScene(mutator: (draft: GameKitScene) => void) {
    setScene((current) => {
      if (!current) {
        return current;
      }
      const draft = structuredClone(current) as GameKitScene;
      mutator(draft);
      return draft;
    });
    setIsDirty(true);
    triggerAutoSave();
  }

  function addEntity() {
    updateScene((draft) => {
      const entity = createEntity("Entity", { x: 180, y: 240 });
      const assetId = selectedAssetId ?? snapshot.assets[0]?.id;
      if (assetId) {
        entity.components.push({
          type: "Sprite",
          assetId,
          width: 64,
          height: 64,
          anchor: { x: 0.5, y: 0.5 }
        });
      }
      entity.components.push({
        type: "AabbCollider",
        offset: { x: -32, y: -32 },
        size: { x: 64, y: 64 },
        isStatic: false
      });
      draft.entities.push(entity);
      setSelectedEntityId(entity.id);
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
      setSnapshot((prev) => ({
        ...prev,
        scenes: [...prev.scenes, fileName]
      }));
      setCurrentSceneFile(fileName);
      refresh();
    });
  }

  function handleDeleteScene(sceneId: string) {
    if (snapshot.scenes.length <= 1) {
      alert("Cannot delete the last scene");
      return;
    }

    fetch(`/api/scene?file=${sceneId}`, { method: "DELETE" }).then(() => {
      const remaining = snapshot.scenes.filter((s) => s !== sceneId);
      setSnapshot((prev) => ({
        ...prev,
        scenes: remaining
      }));
      if (currentSceneFile === sceneId) {
        setCurrentSceneFile(remaining[0]);
      }
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

    setSnapshot((prev) => ({
      ...prev,
      levels: [...prev.levels, newLevel]
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleDeleteLevel(levelId: string) {
    setSnapshot((prev) => ({
      ...prev,
      levels: prev.levels.filter((l) => l.id !== levelId)
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleToggleUnlockLevel(levelId: string) {
    setSnapshot((prev) => ({
      ...prev,
      levels: prev.levels.map((l) =>
        l.id === levelId ? { ...l, unlocked: !l.unlocked } : l
      )
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleReorderLevels(levels: GameKitLevel[]) {
    setSnapshot((prev) => ({
      ...prev,
      levels
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleAssignSceneToLevel(levelId: string, sceneId: string) {
    setSnapshot((prev) => ({
      ...prev,
      levels: prev.levels.map((l) =>
        l.id === levelId ? { ...l, sceneIds: [...l.sceneIds, sceneId] } : l
      )
    }));
    setIsDirty(true);
    triggerAutoSave();
  }

  function handleRemoveSceneFromLevel(levelId: string, sceneId: string) {
    setSnapshot((prev) => ({
      ...prev,
      levels: prev.levels.map((l) =>
        l.id === levelId ? { ...l, sceneIds: l.sceneIds.filter((s) => s !== sceneId) } : l
      )
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
            <button
              type="button"
              className={activeTab === "entities" ? "active" : ""}
              onClick={() => setActiveTab("entities")}
            >
              Entities
            </button>
            <button
              type="button"
              className={activeTab === "scenes" ? "active" : ""}
              onClick={() => setActiveTab("scenes")}
            >
              Scenes
            </button>
            <button
              type="button"
              className={activeTab === "levels" ? "active" : ""}
              onClick={() => setActiveTab("levels")}
            >
              Levels
            </button>
          </div>

          {activeTab === "entities" && (
            <Sidebar
              assets={snapshot.assets}
              entities={scene?.entities ?? []}
              selectedAssetId={selectedAssetId}
              selectedEntityId={selectedEntityId}
              onSelectAsset={setSelectedAssetId}
              onSelectEntity={setSelectedEntityId}
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
                if (level && level.sceneIds.length > 0) {
                  setCurrentSceneFile(level.sceneIds[0]);
                }
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
          onSelect={setSelectedEntityId}
          onMove={(id, position) => {
            updateScene((draft) => {
              const entity = draft.entities.find((candidate) => candidate.id === id);
              const transform = entity?.components.find((component): component is TransformComponent => component.type === "Transform");
              if (transform) {
                transform.position = position;
              }
            });
          }}
        />

        <div className="inspector-column">
          {scene && (
            <SceneSettings
              scene={scene}
              onChange={updateScene}
            />
          )}
          <Inspector
            entity={selectedEntity}
            assets={snapshot.assets}
            onChange={(mutator) => updateScene((draft) => {
              const entity = draft.entities.find((candidate) => candidate.id === selectedEntityId);
              if (entity) {
                mutator(entity);
              }
            })}
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
