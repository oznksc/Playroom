import type {
  AabbColliderComponent,
  GameKitAsset,
  GameKitEntity,
  GameKitScene,
  SpriteComponent,
  TransformComponent
} from "@gamekit/schema";
import { createEntity } from "@gamekit/schema";
import { Box, ImagePlus, Plus, RefreshCw, Save, Upload } from "lucide-react";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type ProjectSnapshot = {
  scenes: string[];
  assets: GameKitAsset[];
};

const sceneFile = "main.scene.json";

export function App() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>({ scenes: [], assets: [] });
  const [scene, setScene] = useState<GameKitScene | undefined>();
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [status, setStatus] = useState("Loading");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setStatus("Ready");
  }

  useEffect(() => {
    refresh().catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Load failed"));
  }, []);

  async function saveScene(nextScene = scene) {
    if (!nextScene) {
      return;
    }

    const response = await fetch(`/api/scene?file=${sceneFile}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(nextScene)
    });

    if (!response.ok) {
      const body = await response.json() as { error?: string; errors?: string[] };
      throw new Error(body.error ?? body.errors?.join(", ") ?? "Save failed");
    }

    setStatus("Saved");
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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>GameKit</h1>
          <span>{scene?.name ?? "Scene"}</span>
        </div>
        <div className="toolbar">
          <button type="button" title="Refresh" onClick={() => refresh().catch(setError)}>
            <RefreshCw size={18} />
          </button>
          <button type="button" title="Import asset" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
          </button>
          <button type="button" title="Add entity" onClick={addEntity}>
            <Plus size={18} />
          </button>
          <button type="button" title="Save scene" onClick={() => saveScene().catch(setError)}>
            <Save size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                importAsset(file).catch(setError);
              }
              event.currentTarget.value = "";
            }}
          />
        </div>
      </header>

      <section className="workspace">
        <aside className="panel">
          <PanelTitle icon={<ImagePlus size={16} />} label="Assets" />
          <div className="assetGrid">
            {snapshot.assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={asset.id === selectedAssetId ? "asset selected" : "asset"}
                onClick={() => setSelectedAssetId(asset.id)}
                title={asset.id}
              >
                <img src={`/gamekit/assets/${asset.file}`} alt="" />
                <span>{asset.id}</span>
              </button>
            ))}
          </div>

          <PanelTitle icon={<Box size={16} />} label="Entities" />
          <div className="entityList">
            {scene?.entities.map((entity) => (
              <button
                key={entity.id}
                type="button"
                className={entity.id === selectedEntityId ? "entity selected" : "entity"}
                onClick={() => setSelectedEntityId(entity.id)}
              >
                {entity.name}
              </button>
            ))}
          </div>
        </aside>

        <SceneCanvas
          scene={scene}
          assets={snapshot.assets}
          selectedEntityId={selectedEntityId}
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

      <footer>{status}</footer>
    </main>
  );

  function setError(error: unknown) {
    setStatus(error instanceof Error ? error.message : "Operation failed");
  }
}

function SceneCanvas({
  scene,
  assets,
  selectedEntityId,
  onSelect,
  onMove
}: {
  scene?: GameKitScene;
  assets: GameKitAsset[];
  selectedEntityId?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, position: { x: number; y: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | undefined>();
  const images = useImageCache(assets);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !scene) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = scene.viewport.width * pixelRatio;
    canvas.height = scene.viewport.height * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawScene(context, scene, assets, images, selectedEntityId);
  }, [scene, assets, images, selectedEntityId]);

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!scene) {
      return { x: 0, y: 0 };
    }
    return {
      x: (event.clientX - rect.left) * (scene.viewport.width / rect.width),
      y: (event.clientY - rect.top) * (scene.viewport.height / rect.height)
    };
  }

  return (
    <section className="canvasPanel">
      <canvas
        ref={canvasRef}
        style={{
          aspectRatio: scene ? `${scene.viewport.width} / ${scene.viewport.height}` : "390 / 844"
        }}
        onPointerDown={(event) => {
          if (!scene) {
            return;
          }
          const point = pointerPosition(event);
          const hit = [...scene.entities].reverse().find((entity) => hitEntity(entity, point));
          if (!hit) {
            return;
          }
          const transform = findComponent<TransformComponent>(hit, "Transform");
          if (!transform) {
            return;
          }
          onSelect(hit.id);
          setDrag({ id: hit.id, dx: point.x - transform.position.x, dy: point.y - transform.position.y });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag) {
            return;
          }
          const point = pointerPosition(event);
          onMove(drag.id, { x: Math.round(point.x - drag.dx), y: Math.round(point.y - drag.dy) });
        }}
        onPointerUp={() => setDrag(undefined)}
      />
    </section>
  );
}

function Inspector({
  entity,
  assets,
  onChange
}: {
  entity?: GameKitEntity;
  assets: GameKitAsset[];
  onChange: (mutator: (entity: GameKitEntity) => void) => void;
}) {
  const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
  const sprite = entity ? findComponent<SpriteComponent>(entity, "Sprite") : undefined;
  const collider = entity ? findComponent<AabbColliderComponent>(entity, "AabbCollider") : undefined;

  return (
    <aside className="panel inspector">
      <h2>{entity?.name ?? "Inspector"}</h2>
      {entity && transform ? (
        <>
          <label>
            Name
            <input value={entity.name} onChange={(event) => onChange((draft) => { draft.name = event.target.value; })} />
          </label>
          <div className="fieldRow">
            <NumberField label="X" value={transform.position.x} onChange={(value) => onChange((draft) => {
              findComponent<TransformComponent>(draft, "Transform")!.position.x = value;
            })} />
            <NumberField label="Y" value={transform.position.y} onChange={(value) => onChange((draft) => {
              findComponent<TransformComponent>(draft, "Transform")!.position.y = value;
            })} />
          </div>
          {sprite ? (
            <>
              <label>
                Sprite
                <select value={sprite.assetId} onChange={(event) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.assetId = event.target.value;
                })}>
                  {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id}</option>)}
                </select>
              </label>
              <div className="fieldRow">
                <NumberField label="W" value={sprite.width} onChange={(value) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.width = value;
                })} />
                <NumberField label="H" value={sprite.height} onChange={(value) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.height = value;
                })} />
              </div>
            </>
          ) : null}
          {collider ? (
            <>
              <div className="fieldRow">
                <NumberField label="CW" value={collider.size.x} onChange={(value) => onChange((draft) => {
                  findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.x = value;
                })} />
                <NumberField label="CH" value={collider.size.y} onChange={(value) => onChange((draft) => {
                  findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.y = value;
                })} />
              </div>
              <label className="check">
                <input type="checkbox" checked={collider.isStatic} onChange={(event) => onChange((draft) => {
                  findComponent<AabbColliderComponent>(draft, "AabbCollider")!.isStatic = event.target.checked;
                })} />
                Static collider
              </label>
            </>
          ) : null}
        </>
      ) : (
        <p className="muted">No entity selected</p>
      )}
    </aside>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function PanelTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className="panelTitle">
      {icon}
      {label}
    </h2>
  );
}

function useImageCache(assets: GameKitAsset[]): Map<string, HTMLImageElement> {
  const [version, setVersion] = useState(0);
  const cache = useMemo(() => new Map<string, HTMLImageElement>(), [assets]);

  useEffect(() => {
    let cancelled = false;
    for (const asset of assets) {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          cache.set(asset.id, image);
          setVersion((current) => current + 1);
        }
      };
      image.src = `/gamekit/assets/${asset.file}`;
    }
    return () => {
      cancelled = true;
    };
  }, [assets, cache]);

  void version;
  return cache;
}

function drawScene(
  context: CanvasRenderingContext2D,
  scene: GameKitScene,
  assets: GameKitAsset[],
  images: Map<string, HTMLImageElement>,
  selectedEntityId?: string
) {
  context.clearRect(0, 0, scene.viewport.width, scene.viewport.height);
  context.fillStyle = scene.viewport.background;
  context.fillRect(0, 0, scene.viewport.width, scene.viewport.height);
  drawGrid(context, scene.viewport.width, scene.viewport.height);

  for (const entity of scene.entities) {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    const sprite = findComponent<SpriteComponent>(entity, "Sprite");
    const collider = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    if (!transform) {
      continue;
    }

    if (sprite) {
      const image = images.get(sprite.assetId);
      const x = transform.position.x - sprite.width * sprite.anchor.x;
      const y = transform.position.y - sprite.height * sprite.anchor.y;
      if (image) {
        context.drawImage(image, x, y, sprite.width, sprite.height);
      } else {
        context.fillStyle = colorForAsset(sprite.assetId, assets);
        context.fillRect(x, y, sprite.width, sprite.height);
      }
    }

    if (collider) {
      context.strokeStyle = entity.id === selectedEntityId ? "#f8e16c" : collider.isStatic ? "#a7f3d0" : "#93c5fd";
      context.lineWidth = entity.id === selectedEntityId ? 3 : 1.5;
      context.strokeRect(
        transform.position.x + collider.offset.x,
        transform.position.y + collider.offset.y,
        collider.size.x,
        collider.size.y
      );
    }
  }
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number) {
  context.strokeStyle = "rgba(255,255,255,.08)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function hitEntity(entity: GameKitEntity, point: { x: number; y: number }): boolean {
  const transform = findComponent<TransformComponent>(entity, "Transform");
  const sprite = findComponent<SpriteComponent>(entity, "Sprite");
  const collider = findComponent<AabbColliderComponent>(entity, "AabbCollider");
  if (!transform) {
    return false;
  }
  const box = collider
    ? {
        x: transform.position.x + collider.offset.x,
        y: transform.position.y + collider.offset.y,
        width: collider.size.x,
        height: collider.size.y
      }
    : sprite
      ? {
          x: transform.position.x - sprite.width * sprite.anchor.x,
          y: transform.position.y - sprite.height * sprite.anchor.y,
          width: sprite.width,
          height: sprite.height
        }
      : undefined;

  return !!box &&
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height;
}

function colorForAsset(assetId: string, assets: GameKitAsset[]): string {
  const index = Math.max(0, assets.findIndex((asset) => asset.id === assetId));
  return ["#60a5fa", "#34d399", "#f8e16c", "#f472b6", "#c084fc"][index % 5];
}

function findComponent<T extends { type: string }>(entity: GameKitEntity, type: T["type"]): T | undefined {
  return entity.components.find((component) => component.type === type) as T | undefined;
}
