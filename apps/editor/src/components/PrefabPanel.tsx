import { Boxes, Plus, Trash2, Download, Save, RefreshCw, Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api.js";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  IconButton,
  EmptyState,
  Button,
  Input,
  Badge,
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
  /** Display name of selected entity (for prefab name default). */
  selectedEntityName?: string;
  onInstantiated: () => void;
  onStatus?: (message: string) => void;
};

export function PrefabPanel({
  sceneFile,
  selectedEntityId,
  selectedEntityName,
  onInstantiated,
  onStatus,
}: PrefabPanelProps) {
  const [prefabs, setPrefabs] = useState<PrefabSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [prefabName, setPrefabName] = useState("");

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

  function startCreate() {
    if (!selectedEntityId) {
      onStatus?.("Select an entity in Hierarchy first");
      return;
    }
    setPrefabName(selectedEntityName?.trim() || "Prefab");
    setCreating(true);
  }

  async function submitCreate() {
    if (!selectedEntityId) {
      onStatus?.("Select an entity in Hierarchy first");
      return;
    }
    const name = prefabName.trim();
    if (!name) {
      onStatus?.("Prefab name is required");
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
          name,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; file?: string };
      if (!res.ok) throw new Error(body.error ?? "Create failed");
      onStatus?.(`Prefab saved: ${body.file ?? name}`);
      setCreating(false);
      setPrefabName("");
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
      <PanelHeader className="h-9">
        <PanelTitle accent="purple">Prefabs</PanelTitle>
        <div className="flex items-center gap-0.5">
          <IconButton
            size="sm"
            title="Refresh list"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            <RefreshCw size={12} />
          </IconButton>
          <IconButton
            size="sm"
            variant={selectedEntityId ? "accent" : "ghost"}
            title={
              selectedEntityId
                ? "Save selected entity as prefab"
                : "Select an entity in Hierarchy first"
            }
            onClick={startCreate}
            disabled={busy || !selectedEntityId}
          >
            <Plus size={13} />
          </IconButton>
        </div>
      </PanelHeader>

      <div className="space-y-1.5 border-b border-white/[0.06] px-2 py-1.5">
        <p className="m-0 text-[10px] leading-relaxed text-text-muted">
          Select an entity → save as prefab. Spawn places a copy into the active scene.
        </p>
        {selectedEntityId ? (
          <div className="flex items-center gap-1.5 rounded-[8px] bg-accent/10 px-2 py-1 text-[10px] text-accent">
            <Save size={11} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              Selection: {selectedEntityName || selectedEntityId}
            </span>
            <Button size="sm" variant="solid" disabled={busy} onClick={startCreate}>
              <Plus size={11} /> Save prefab
            </Button>
          </div>
        ) : (
          <div className="rounded-[8px] bg-white/[0.04] px-2 py-1 text-[10px] text-text-muted">
            No entity selected — pick one in Hierarchy to create a prefab.
          </div>
        )}

        {creating && (
          <div className="flex items-center gap-1 rounded-[10px] border border-accent-purple/30 bg-accent-purple/10 p-1.5">
            <Input
              autoFocus
              className="h-7 flex-1"
              placeholder="Prefab name…"
              value={prefabName}
              disabled={busy}
              onChange={(e) => setPrefabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setPrefabName("");
                }
              }}
            />
            <IconButton
              size="sm"
              variant="accent"
              title="Save prefab"
              disabled={busy}
              onClick={() => void submitCreate()}
            >
              <Check size={12} />
            </IconButton>
            <IconButton
              size="sm"
              title="Cancel"
              disabled={busy}
              onClick={() => {
                setCreating(false);
                setPrefabName("");
              }}
            >
              <X size={12} />
            </IconButton>
          </div>
        )}
      </div>

      <PanelBody className="flex flex-col gap-0 p-1">
        {loading ? (
          <p className="py-6 text-center text-[11px] text-text-muted">Loading…</p>
        ) : prefabs.length === 0 ? (
          <EmptyState
            icon={<Boxes size={16} />}
            title="No prefabs yet"
            description={
              selectedEntityId
                ? "Save the current selection as a reusable prefab."
                : "Select an entity, then save it as a prefab."
            }
            action={
              selectedEntityId ? (
                <Button size="sm" variant="solid" disabled={busy} onClick={startCreate}>
                  <Plus size={12} /> Create from selection
                </Button>
              ) : undefined
            }
          />
        ) : (
          prefabs.map((prefab) => (
            <div
              key={prefab.file}
              className="mb-0.5 flex items-center gap-0.5 rounded-[10px] border border-transparent hover:border-white/[0.06] hover:bg-white/[0.04]"
            >
              <div className="min-w-0 flex-1 px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Boxes size={12} className="shrink-0 text-accent-purple" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-text-primary">
                    {prefab.name}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-0.5 pl-4">
                  {prefab.componentTypes
                    .filter((t) => t !== "Transform")
                    .slice(0, 5)
                    .map((t) => (
                      <Badge key={t} variant="muted" className="!px-1 !py-0 text-[9px]">
                        {t}
                      </Badge>
                    ))}
                  {prefab.sourceEntityName && (
                    <span className="text-[9px] text-text-muted">
                      from {prefab.sourceEntityName}
                    </span>
                  )}
                </div>
              </div>
              <IconButton
                size="sm"
                variant="solid"
                className="self-center"
                disabled={busy}
                title="Spawn into active scene"
                onClick={() => void instantiate(prefab)}
              >
                <Download size={12} />
              </IconButton>
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

/**
 * Save entity as prefab (shared by Hierarchy context menu / command palette).
 */
export async function createPrefabFromEntityApi(options: {
  sceneFile: string;
  entityId: string;
  name?: string;
}): Promise<{ file: string; name: string }> {
  const res = await fetch(getApiUrl("/api/prefabs"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sceneFile: options.sceneFile,
      entityId: options.entityId,
      name: options.name,
    }),
  });
  const body = (await res.json()) as {
    ok?: boolean;
    error?: string;
    file?: string;
    prefab?: { name?: string };
  };
  if (!res.ok) throw new Error(body.error ?? "Create prefab failed");
  return {
    file: body.file ?? "prefab",
    name: body.prefab?.name ?? options.name ?? "Prefab",
  };
}
