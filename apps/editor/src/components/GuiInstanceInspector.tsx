import type {
  GuiComponentInstance,
  GuiComponent,
  GuiNode,
  GuiText,
  GuiButton,
  GuiImage,
  GameKitAsset,
} from "@gamekit/schema";
import { Package, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  NumberField,
  IconButton,
  EmptyState,
  AccordionSection,
  Select,
  Input,
  CheckboxField,
  cn,
} from "@/ui";

type GuiInstanceInspectorProps = {
  instance: GuiComponentInstance;
  component: GuiComponent | undefined;
  assets: GameKitAsset[];
  onChange: (mutator: (instance: GuiComponentInstance) => void) => void;
  onDelete: () => void;
};

export function GuiInstanceInspector({
  instance,
  component,
  assets,
  onChange,
  onDelete,
}: GuiInstanceInspectorProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  function toggleNodeCollapse(nodeId: string) {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  }

  function getOverride(nodeId: string, key: string): unknown {
    return instance.nodeOverrides?.[nodeId]?.[key as keyof GuiNode];
  }

  function setOverride(nodeId: string, key: string, value: unknown) {
    onChange((inst) => {
      if (!inst.nodeOverrides) inst.nodeOverrides = {};
      if (!inst.nodeOverrides[nodeId]) inst.nodeOverrides[nodeId] = {};
      (inst.nodeOverrides[nodeId] as Record<string, unknown>)[key] = value;
    });
  }

  if (!component) {
    return (
      <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
        <EmptyState
          icon={<Package size={16} />}
          title="Component not found"
          description="The referenced component definition may have been deleted."
        />
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-bold text-text-primary">{component.name}</span>
          <span className="font-mono text-[9px] tracking-wide text-text-muted">
            {instance.id.slice(0, 8)}
          </span>
        </div>
        <IconButton size="sm" variant="danger" onClick={onDelete} title="Remove instance">
          <Trash2 size={13} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
        <AccordionSection label="Instance Position" open staticHeader onToggle={() => {}}>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="X"
              value={instance.x}
              onChange={(v) => onChange((inst) => { inst.x = v; })}
            />
            <NumberField
              label="Y"
              value={instance.y}
              onChange={(v) => onChange((inst) => { inst.y = v; })}
            />
          </div>
          <CheckboxField
            label="Visible"
            checked={instance.visible !== false}
            onChange={(checked) => onChange((inst) => { inst.visible = checked; })}
          />
          <CheckboxField
            label="Interactive"
            checked={instance.interactive === true}
            onChange={(checked) => onChange((inst) => { inst.interactive = checked; })}
          />
        </AccordionSection>

        <AccordionSection
          label={`Node Overrides (${component.nodes.length})`}
          open
          onToggle={() => {}}
        >
          {component.nodes.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-text-muted">Component has no nodes</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {component.nodes.map((node) => {
                const isCollapsed = collapsedNodes[node.id] !== false;
                return (
                  <div
                    key={node.id}
                    className="overflow-hidden rounded-md border border-border-default bg-bg-base"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[10px] font-semibold text-text-secondary hover:bg-bg-hover"
                      onClick={() => toggleNodeCollapse(node.id)}
                    >
                      {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                      <span>{node.type}</span>
                      <span className="truncate text-[9px] text-text-muted">{nodeLabel(node)}</span>
                    </button>
                    {!isCollapsed && (
                      <div className="flex flex-col gap-1.5 border-t border-border-default p-2">
                        {node.type === "Text" && (
                          <>
                            <OverrideField
                              label="text"
                              override={getOverride(node.id, "text")}
                              fallback={(node as GuiText).text}
                              onChange={(v) => setOverride(node.id, "text", v)}
                            />
                            <OverrideField
                              label="color"
                              override={getOverride(node.id, "color")}
                              fallback={(node as GuiText).color ?? "#ffffff"}
                              onChange={(v) => setOverride(node.id, "color", v)}
                              type="color"
                            />
                          </>
                        )}
                        {node.type === "Button" && (
                          <>
                            <OverrideField
                              label="text"
                              override={getOverride(node.id, "text")}
                              fallback={(node as GuiButton).text}
                              onChange={(v) => setOverride(node.id, "text", v)}
                            />
                            <OverrideField
                              label="color"
                              override={getOverride(node.id, "color")}
                              fallback={(node as GuiButton).color ?? "#ffffff"}
                              onChange={(v) => setOverride(node.id, "color", v)}
                              type="color"
                            />
                            <OverrideField
                              label="backgroundColor"
                              override={getOverride(node.id, "backgroundColor")}
                              fallback={(node as GuiButton).backgroundColor ?? "#333333"}
                              onChange={(v) => setOverride(node.id, "backgroundColor", v)}
                              type="color"
                            />
                          </>
                        )}
                        {node.type === "Image" && (
                          <label className="flex flex-col gap-1">
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                              assetId override
                            </span>
                            <Select
                              value={String(
                                getOverride(node.id, "assetId") ?? (node as GuiImage).assetId
                              )}
                              onChange={(e) => setOverride(node.id, "assetId", e.target.value)}
                            >
                              <option value="">
                                — (default: {(node as GuiImage).assetId}) —
                              </option>
                              {assets.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.id}
                                </option>
                              ))}
                            </Select>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AccordionSection>
      </div>
    </aside>
  );
}

function nodeLabel(node: GuiNode): string {
  switch (node.type) {
    case "Text":
      return node.text || "Text";
    case "Button":
      return node.text || "Button";
    case "Image":
      return node.assetId || "Image";
  }
}

type OverrideFieldProps = {
  label: string;
  override: unknown;
  fallback: string;
  onChange: (value: string) => void;
  type?: "text" | "color";
};

function OverrideField({
  label,
  override,
  fallback,
  onChange,
  type = "text",
}: OverrideFieldProps) {
  const hasOverride = override !== undefined && override !== null;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      {type === "color" ? (
        <input
          type="color"
          className={cn(
            "h-7 w-full cursor-pointer rounded border border-border-default bg-transparent",
            hasOverride && "ring-1 ring-inset ring-accent/35"
          )}
          value={hasOverride ? String(override) : fallback}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          type="text"
          className={cn(hasOverride && "ring-1 ring-inset ring-accent/35")}
          value={hasOverride ? String(override) : fallback}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
