import type { GuiComponentInstance, GuiComponent, GuiNode, GuiText, GuiButton, GuiImage, GameKitAsset } from "@gamekit/schema";
import { Package, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <div className="inspector-num-field">
      <span className="field-badge">{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

type GuiInstanceInspectorProps = {
  instance: GuiComponentInstance;
  component: GuiComponent | undefined;
  assets: GameKitAsset[];
  onChange: (mutator: (instance: GuiComponentInstance) => void) => void;
  onDelete: () => void;
};

export function GuiInstanceInspector({ instance, component, assets, onChange, onDelete }: GuiInstanceInspectorProps) {
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
      <aside className="panel inspector">
        <div className="empty-state">
          <Package size={32} style={{ opacity: 0.1 }} />
          <p>Component not found</p>
          <span className="tip">The referenced component definition may have been deleted.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel inspector">
      <div className="inspector-section-header">
        <div className="entity-main-details">
          <span className="gui-type-badge">{component.name}</span>
          <span className="entity-uuid-badge">{instance.id.slice(0, 8)}</span>
        </div>
        <button
          type="button"
          className="icon-button danger btn-delete-entity"
          onClick={onDelete}
          title="Remove instance"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="inspector-scroll-area">
        {/* Position Section */}
        <div className="inspector-section-card">
          <div className="inspector-section-title-row accent-transform">
            <button type="button" className="accordion-toggle" onClick={() => {}}>
              <span className="section-label-text">Instance Position</span>
            </button>
          </div>
          <div className="inspector-card-body">
            <div className="inspector-field-grid">
              <div className="field-grid-row dual-fields">
                <NumberField label="X" value={instance.x} onChange={(v) => onChange((inst) => { inst.x = v; })} />
                <NumberField label="Y" value={instance.y} onChange={(v) => onChange((inst) => { inst.y = v; })} />
              </div>
              <div className="field-checkbox-row">
                <input
                  id="inst-visible-check"
                  type="checkbox"
                  checked={instance.visible !== false}
                  onChange={(e) => onChange((inst) => { inst.visible = e.target.checked; })}
                />
                <label htmlFor="inst-visible-check">Visible</label>
              </div>
              <div className="field-checkbox-row">
                <input
                  id="inst-interactive-check"
                  type="checkbox"
                  checked={instance.interactive === true}
                  onChange={(e) => onChange((inst) => { inst.interactive = e.target.checked; })}
                />
                <label htmlFor="inst-interactive-check">Interactive</label>
              </div>
            </div>
          </div>
        </div>

        {/* Node Overrides Section */}
        <div className="inspector-section-card">
          <div className="inspector-section-title-row accent-sprite">
            <button type="button" className="accordion-toggle" onClick={() => {}}>
              <span className="section-label-text">Node Overrides ({component.nodes.length})</span>
            </button>
          </div>
          <div className="inspector-card-body">
            {component.nodes.length === 0 ? (
              <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", padding: 8 }}>
                Component has no nodes
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {component.nodes.map((node) => {
                  const isCollapsed = collapsedNodes[node.id] !== false;
                  return (
                    <div key={node.id} style={{ background: "var(--bg-base)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)" }}>
                      <button
                        type="button"
                        className="accordion-toggle"
                        onClick={() => toggleNodeCollapse(node.id)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", width: "100%", background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                        <span>{node.type}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 9 }}>{nodeLabel(node)}</span>
                      </button>
                      {!isCollapsed && (
                        <div style={{ padding: "4px 6px 6px", borderTop: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: 4 }}>
                          {node.type === "Text" && (
                            <>
                              <OverrideField label="text" nodeId={node.id} override={getOverride(node.id, "text")} fallback={(node as GuiText).text} onChange={(v) => setOverride(node.id, "text", v)} />
                              <OverrideField label="color" nodeId={node.id} override={getOverride(node.id, "color")} fallback={(node as GuiText).color ?? "#ffffff"} onChange={(v) => setOverride(node.id, "color", v)} type="color" />
                            </>
                          )}
                          {node.type === "Button" && (
                            <>
                              <OverrideField label="text" nodeId={node.id} override={getOverride(node.id, "text")} fallback={(node as GuiButton).text} onChange={(v) => setOverride(node.id, "text", v)} />
                              <OverrideField label="color" nodeId={node.id} override={getOverride(node.id, "color")} fallback={(node as GuiButton).color ?? "#ffffff"} onChange={(v) => setOverride(node.id, "color", v)} type="color" />
                              <OverrideField label="backgroundColor" nodeId={node.id} override={getOverride(node.id, "backgroundColor")} fallback={(node as GuiButton).backgroundColor ?? "#333333"} onChange={(v) => setOverride(node.id, "backgroundColor", v)} type="color" />
                            </>
                          )}
                          {node.type === "Image" && (
                            <div className="inspector-select-wrapper">
                              <label className="inspector-select-label">assetId override</label>
                              <select
                                value={String(getOverride(node.id, "assetId") ?? (node as GuiImage).assetId)}
                                onChange={(e) => setOverride(node.id, "assetId", e.target.value)}
                              >
                                <option value="">— (default: {(node as GuiImage).assetId}) —</option>
                                {assets.map((a) => (
                                  <option key={a.id} value={a.id}>{a.id}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function nodeLabel(node: GuiNode): string {
  switch (node.type) {
    case "Text": return node.text || "Text";
    case "Button": return node.text || "Button";
    case "Image": return node.assetId || "Image";
  }
}

type OverrideFieldProps = {
  label: string;
  nodeId: string;
  override: unknown;
  fallback: string;
  onChange: (value: string) => void;
  type?: "text" | "color";
};

function OverrideField({ label, nodeId, override, fallback, onChange, type = "text" }: OverrideFieldProps) {
  const hasOverride = override !== undefined && override !== null;
  return (
    <div className="inspector-text-field">
      <span className="field-badge">{label}</span>
      <input
        type={type}
        value={hasOverride ? String(override) : fallback}
        onChange={(e) => onChange(e.target.value)}
        style={hasOverride ? { borderLeft: "2px solid var(--accent)" } : undefined}
      />
    </div>
  );
}
