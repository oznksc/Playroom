import type { GameKitScene, TransformComponent } from "@gamekit/schema";
import { createEntity } from "@gamekit/schema";
import { useCallback, useEffect, useRef, useState } from "react";
import { Topbar } from "./components/Topbar.js";
import { Sidebar } from "./components/Sidebar.js";
import { SceneCanvas } from "./components/SceneCanvas.js";
import { Inspector } from "./components/Inspector.js";
import { Footer } from "./components/Footer.js";
import type { ProjectSnapshot, SaveState } from "./types.js";
import { findComponent } from "./lib/components.js";

const sceneFile = "main.scene.json";
const AUTO_SAVE_DELAY_MS = 1500;

export function App() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>({ scenes: [], assets: [] });
  const [scene, setScene] = useState<GameKitScene | undefined>();
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [status, setStatus] = useState("Loading");
  const [zoom] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
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
      fetch(`/api/scene?file=${sceneFile}`)
    ]);
    const nextSnapshot = await projectResponse.json() as ProjectSnapshot;
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
      const response = await fetch(`/api/scene?file=${sceneFile}`, {
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
        <Sidebar
          assets={snapshot.assets}
          entities={scene?.entities ?? []}
          selectedAssetId={selectedAssetId}
          selectedEntityId={selectedEntityId}
          onSelectAsset={setSelectedAssetId}
          onSelectEntity={setSelectedEntityId}
        />

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
