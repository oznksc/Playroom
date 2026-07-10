import { Boxes, Plus, Trash2, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api.js";

export type PrefabSummary = {
  file: string;
  id: string;
  name: string;
  componentTypes: string[];
  sourceEntityName?: string;
};

type PrefabPanelProps = {
  sceneFile: string;
  selectedEntityId?: string;
  onInstantiated: () => void;
  onStatus?: (message: string) => void;
};

export function PrefabPanel({
  sceneFile,
  selectedEntityId,
  onInstantiated,
  onStatus,
}: PrefabPanelProps) {
  const [prefabs, setPrefabs] = useState<PrefabSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/prefabs"));
      if (!res.ok) throw new Error("Failed to list prefabs");
      const data = (await res.json()) as { prefabs?: PrefabSummary[] };
      setPrefabs(data.prefabs ?? []);
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : "Failed to load prefabs");
    } finally {
      setLoading(false);
    }
  }, [onStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createFromSelection() {
    if (!selectedEntityId) {
      onStatus?.("Select an entity in Hierarchy first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(getApiUrl("/api/prefabs"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sceneFile,
          entityId: selectedEntityId,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; file?: string };
      if (!res.ok) throw new Error(body.error ?? "Create failed");
      onStatus?.(`Prefab saved: ${body.file}`);
      await load();
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : "Create prefab failed");
    } finally {
      setBusy(false);
    }
  }

  async function instantiate(prefab: PrefabSummary) {
    setBusy(true);
    try {
      const res = await fetch(getApiUrl("/api/prefabs"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "instantiate",
          sceneFile,
          prefabId: prefab.file,
          x: 120 + Math.round(Math.random() * 80),
          y: 120 + Math.round(Math.random() * 80),
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; name?: string };
      if (!res.ok) throw new Error(body.error ?? "Instantiate failed");
      onStatus?.(`Spawned ${body.name ?? prefab.name}`);
      onInstantiated();
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : "Instantiate failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(prefab: PrefabSummary) {
    if (!confirm(`Delete prefab "${prefab.name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(getApiUrl(`/api/prefabs?id=${encodeURIComponent(prefab.file)}`), {
        method: "DELETE",
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      onStatus?.(`Removed ${prefab.file}`);
      await load();
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="prefab-panel">
      <div className="prefab-panel-header">
        <h3>Prefabs</h3>
        <button
          type="button"
          className="icon-button"
          title={selectedEntityId ? "Create prefab from selection" : "Select an entity first"}
          onClick={() => void createFromSelection()}
          disabled={busy || !selectedEntityId}
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="prefab-hint">
        Select an entity → + to save as prefab. Click a prefab to spawn into the active scene.
      </div>

      <div className="prefab-list-scroll">
        {loading ? (
          <div className="hierarchy-empty">
            <p>Loading…</p>
          </div>
        ) : prefabs.length === 0 ? (
          <div className="hierarchy-empty">
            <Boxes size={20} style={{ opacity: 0.2 }} />
            <p>No prefabs yet</p>
          </div>
        ) : (
          prefabs.map((prefab) => (
            <div key={prefab.file} className="prefab-item">
              <button
                type="button"
                className="prefab-item-main"
                onClick={() => void instantiate(prefab)}
                disabled={busy}
                title="Instantiate into scene"
              >
                <Boxes size={12} className="prefab-icon" />
                <span className="prefab-meta">
                  <span className="prefab-name">{prefab.name}</span>
                  <span className="prefab-types">
                    {prefab.componentTypes.filter((t) => t !== "Transform").slice(0, 4).join(" · ") ||
                      "empty"}
                  </span>
                </span>
                <Download size={12} className="prefab-spawn-icon" />
              </button>
              <button
                type="button"
                className="prefab-item-delete"
                onClick={() => void remove(prefab)}
                disabled={busy}
                title="Delete prefab"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
