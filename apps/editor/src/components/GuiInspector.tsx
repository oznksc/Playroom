import type { GuiNode, GuiText, GuiButton, GuiImage, GameKitAsset } from "@gamekit/schema";
import {
  Type,
  Square,
  Image,
  Trash2,
  ChevronDown,
  ChevronRight
} from "lucide-react";
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

type GuiInspectorProps = {
  node?: GuiNode;
  assets: GameKitAsset[];
  onChange: (mutator: (node: GuiNode) => void) => void;
  onDelete: () => void;
};

export function GuiInspector({ node, assets, onChange, onDelete }: GuiInspectorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    transform: false,
    content: false,
    style: false
  });

  function toggleCollapse(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!node) {
    return (
      <aside className="panel inspector">
        <div className="empty-state">
          <Type size={32} style={{ opacity: 0.1 }} />
          <p>No GUI node selected</p>
          <span className="tip">Select a GUI node from the GUIs panel to edit its properties.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel inspector">
      <div className="inspector-section-header">
        <div className="entity-main-details">
          <span className="gui-type-badge">{node.type}</span>
          <span className="entity-uuid-badge">{node.id.slice(0, 8)}</span>
        </div>
        <button
          type="button"
          className="icon-button danger btn-delete-entity"
          onClick={onDelete}
          title="Delete GUI node"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="inspector-scroll-area">
        {/* Transform Section */}
        <div className="inspector-section-card">
          <div className={`inspector-section-title-row accent-transform`}>
            <button type="button" className="accordion-toggle" onClick={() => toggleCollapse("transform")}>
              {collapsed.transform ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="section-label-text">Position & Size</span>
            </button>
          </div>
          {!collapsed.transform && (
            <div className="inspector-card-body">
              <div className="inspector-field-grid">
                <div className="field-grid-row dual-fields">
                  <NumberField label="X" value={node.x} onChange={(v) => onChange((d) => { d.x = v; })} />
                  <NumberField label="Y" value={node.y} onChange={(v) => onChange((d) => { d.y = v; })} />
                </div>
                <div className="field-grid-row dual-fields">
                  <NumberField label="Width" value={node.width} onChange={(v) => onChange((d) => { d.width = v; })} />
                  <NumberField label="Height" value={node.height} onChange={(v) => onChange((d) => { d.height = v; })} />
                </div>
                <div className="field-grid-row dual-fields">
                  <NumberField label="Anchor X" value={node.anchorX ?? 0} onChange={(v) => onChange((d) => { d.anchorX = v; })} />
                  <NumberField label="Anchor Y" value={node.anchorY ?? 0} onChange={(v) => onChange((d) => { d.anchorY = v; })} />
                </div>
                <div className="field-checkbox-row">
                  <input
                    id="gui-visible-check"
                    type="checkbox"
                    checked={node.visible !== false}
                    onChange={(e) => onChange((d) => { d.visible = e.target.checked; })}
                  />
                  <label htmlFor="gui-visible-check">Visible</label>
                </div>
                <div className="field-checkbox-row">
                  <input
                    id="gui-interactive-check"
                    type="checkbox"
                    checked={node.interactive === true}
                    onChange={(e) => onChange((d) => { d.interactive = e.target.checked; })}
                  />
                  <label htmlFor="gui-interactive-check">Interactive</label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Type-specific Content Section */}
        {node.type === "Text" && (
          <div className="inspector-section-card">
            <div className={`inspector-section-title-row accent-sprite`}>
              <button type="button" className="accordion-toggle" onClick={() => toggleCollapse("content")}>
                {collapsed.content ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <Type size={12} />
                <span className="section-label-text">Text Content</span>
              </button>
            </div>
            {!collapsed.content && (
              <div className="inspector-card-body">
                <div className="inspector-field-grid">
                  <div className="inspector-text-field">
                    <span className="field-badge">Text</span>
                    <input
                      type="text"
                      value={(node as GuiText).text}
                      onChange={(e) => onChange((d) => { (d as GuiText).text = e.target.value; })}
                    />
                  </div>
                  <div className="field-grid-row single-field">
                    <NumberField
                      label="Font Size"
                      value={(node as GuiText).fontSize ?? 16}
                      onChange={(v) => onChange((d) => { (d as GuiText).fontSize = v; })}
                    />
                  </div>
                  <div className="inspector-text-field">
                    <span className="field-badge">Color</span>
                    <input
                      type="color"
                      value={(node as GuiText).color ?? "#ffffff"}
                      onChange={(e) => onChange((d) => { (d as GuiText).color = e.target.value; })}
                    />
                  </div>
                  <div className="inspector-select-wrapper">
                    <label className="inspector-select-label">Align</label>
                    <select
                      value={(node as GuiText).align ?? "left"}
                      onChange={(e) => onChange((d) => { (d as GuiText).align = e.target.value as "left" | "center" | "right"; })}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {node.type === "Button" && (
          <div className="inspector-section-card">
            <div className={`inspector-section-title-row accent-collider`}>
              <button type="button" className="accordion-toggle" onClick={() => toggleCollapse("content")}>
                {collapsed.content ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <Square size={12} />
                <span className="section-label-text">Button Content</span>
              </button>
            </div>
            {!collapsed.content && (
              <div className="inspector-card-body">
                <div className="inspector-field-grid">
                  <div className="inspector-text-field">
                    <span className="field-badge">Text</span>
                    <input
                      type="text"
                      value={(node as GuiButton).text}
                      onChange={(e) => onChange((d) => { (d as GuiButton).text = e.target.value; })}
                    />
                  </div>
                  <div className="inspector-text-field">
                    <span className="field-badge">Action</span>
                    <input
                      type="text"
                      value={(node as GuiButton).action ?? ""}
                      onChange={(e) => onChange((d) => { (d as GuiButton).action = e.target.value; })}
                      placeholder="e.g. startGame"
                    />
                  </div>
                  <div className="field-grid-row single-field">
                    <NumberField
                      label="Font Size"
                      value={(node as GuiButton).fontSize ?? 16}
                      onChange={(v) => onChange((d) => { (d as GuiButton).fontSize = v; })}
                    />
                  </div>
                  <div className="inspector-text-field">
                    <span className="field-badge">Text Color</span>
                    <input
                      type="color"
                      value={(node as GuiButton).color ?? "#ffffff"}
                      onChange={(e) => onChange((d) => { (d as GuiButton).color = e.target.value; })}
                    />
                  </div>
                  <div className="inspector-text-field">
                    <span className="field-badge">BG Color</span>
                    <input
                      type="color"
                      value={(node as GuiButton).backgroundColor ?? "#333333"}
                      onChange={(e) => onChange((d) => { (d as GuiButton).backgroundColor = e.target.value; })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {node.type === "Image" && (
          <div className="inspector-section-card">
            <div className={`inspector-section-title-row accent-camera`}>
              <button type="button" className="accordion-toggle" onClick={() => toggleCollapse("content")}>
                {collapsed.content ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <Image size={12} />
                <span className="section-label-text">Image Content</span>
              </button>
            </div>
            {!collapsed.content && (
              <div className="inspector-card-body">
                <div className="inspector-field-grid">
                  <div className="inspector-select-wrapper">
                    <label className="inspector-select-label">Asset</label>
                    <select
                      value={(node as GuiImage).assetId}
                      onChange={(e) => onChange((d) => { (d as GuiImage).assetId = e.target.value; })}
                    >
                      <option value="">— Select Asset —</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>{asset.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
