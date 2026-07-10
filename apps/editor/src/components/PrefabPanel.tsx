import { Boxes, Plus, Trash2, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api.js";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  IconButton,
  EmptyState,
  cn,
} from "@/ui";

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
        body: JSON.stringify({ sceneFile, entityId: selectedEntityId }),
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
      const res = await fetch(
        getApiUrl(`/api/prefabs?id=${encodeURIComponent(prefab.file)}`),
        { method: "DELETE" }
      );
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
    <Panel>
      <PanelHeader>
        <PanelTitle accent="purple">Prefabs</PanelTitle>
        <IconButton
          size="sm"
          title={selectedEntityId ? "Create prefab from selection" : "Select an entity first"}
          onClick={() => void createFromSelection()}
          disabled={busy || !selectedEntityId}
        >
          <Plus size={13} />
        </IconButton>
      </PanelHeader>
      <p className="m-0 border-b border-border-default px-2.5 py-1.5 text-[10px] leading-relaxed text-text-muted">
        Select an entity → + to save as prefab. Click a prefab to spawn into the active scene.
      </p>
      <PanelBody className="space-y-0.5 p-1.5">
        {loading ? (
          <p className="py-6 text-center text-[11px] text-text-muted">Loading…</p>
        ) : prefabs.length === 0 ? (
          <EmptyState
            icon={<Boxes size={16} />}
            title="No prefabs yet"
            description="Save a selection as a reusable prefab."
          />
        ) : (
          prefabs.map((prefab) => (
            <div key={prefab.file} className="flex items-stretch gap-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void instantiate(prefab)}
                title="Instantiate into scene"
                className={cn(
                  "list-row min-h-[40px] flex-1 cursor-pointer disabled:opacity-50"
                )}
              >
                <Boxes size={12} className="shrink-0 text-accent-purple" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-text-primary">
                    {prefab.name}
                  </span>
                  <span className="block truncate text-[10px] text-text-muted">
                    {prefab.componentTypes.filter((t) => t !== "Transform").slice(0, 4).join(" · ") ||
                      "empty"}
                  </span>
                </span>
                <Download size={12} className="shrink-0 text-text-muted" />
              </button>
              <IconButton
                size="sm"
                variant="danger"
                className="self-center"
                disabled={busy}
                title="Delete prefab"
                onClick={() => void remove(prefab)}
              >
                <Trash2 size={11} />
              </IconButton>
            </div>
          ))
        )}
      </PanelBody>
    </Panel>
  );
}
