import type { GuiNode, GuiText, GuiButton, GuiImage, GameKitAsset } from "@gamekit/schema";
import { Type, Square, Image, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  NumberField,
  IconButton,
  EmptyState,
  AccordionSection,
  Select,
  Input,
  CheckboxField,
} from "@/ui";

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
  });

  function toggleCollapse(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!node) {
    return (
      <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-bg-surface">
        <EmptyState
          icon={<Type size={16} />}
          title="No GUI node selected"
          description="Select a GUI node from the GUIs panel to edit its properties."
        />
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-bg-surface">
      <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 border-b border-border-default bg-bg-base px-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-bold text-text-primary">{node.type}</span>
          <span className="font-mono text-[9px] tracking-wide text-text-muted">
            {node.id.slice(0, 8)}
          </span>
        </div>
        <IconButton size="sm" variant="danger" onClick={onDelete} title="Delete GUI node">
          <Trash2 size={13} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
        <AccordionSection
          label="Position & Size"
          open={!collapsed.transform}
          onToggle={() => toggleCollapse("transform")}
          accent="purple"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="X" value={node.x} onChange={(v) => onChange((d) => { d.x = v; })} />
            <NumberField label="Y" value={node.y} onChange={(v) => onChange((d) => { d.y = v; })} />
            <NumberField label="Width" value={node.width} onChange={(v) => onChange((d) => { d.width = v; })} />
            <NumberField label="Height" value={node.height} onChange={(v) => onChange((d) => { d.height = v; })} />
            <NumberField label="Anchor X" value={node.anchorX ?? 0} onChange={(v) => onChange((d) => { d.anchorX = v; })} />
            <NumberField label="Anchor Y" value={node.anchorY ?? 0} onChange={(v) => onChange((d) => { d.anchorY = v; })} />
          </div>
          <CheckboxField
            label="Visible"
            checked={node.visible !== false}
            onChange={(checked) => onChange((d) => { d.visible = checked; })}
          />
          <CheckboxField
            label="Interactive"
            checked={node.interactive === true}
            onChange={(checked) => onChange((d) => { d.interactive = checked; })}
          />
        </AccordionSection>

        {node.type === "Text" && (
          <AccordionSection
            icon={<Type size={12} />}
            label="Text Content"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
            accent="cyan"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Text</span>
              <Input
                type="text"
                value={(node as GuiText).text}
                onChange={(e) => onChange((d) => { (d as GuiText).text = e.target.value; })}
              />
            </label>
            <NumberField
              label="Font Size"
              value={(node as GuiText).fontSize ?? 16}
              onChange={(v) => onChange((d) => { (d as GuiText).fontSize = v; })}
            />
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Color</span>
              <input
                type="color"
                className="h-7 w-full cursor-pointer rounded border border-border-default bg-transparent"
                value={(node as GuiText).color ?? "#ffffff"}
                onChange={(e) => onChange((d) => { (d as GuiText).color = e.target.value; })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Align</span>
              <Select
                value={(node as GuiText).align ?? "left"}
                onChange={(e) =>
                  onChange((d) => {
                    (d as GuiText).align = e.target.value as "left" | "center" | "right";
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </label>
          </AccordionSection>
        )}

        {node.type === "Button" && (
          <AccordionSection
            icon={<Square size={12} />}
            label="Button Content"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
            accent="green"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Text</span>
              <Input
                type="text"
                value={(node as GuiButton).text}
                onChange={(e) => onChange((d) => { (d as GuiButton).text = e.target.value; })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Action</span>
              <Input
                type="text"
                value={(node as GuiButton).action ?? ""}
                onChange={(e) => onChange((d) => { (d as GuiButton).action = e.target.value; })}
                placeholder="e.g. startGame"
              />
            </label>
            <NumberField
              label="Font Size"
              value={(node as GuiButton).fontSize ?? 16}
              onChange={(v) => onChange((d) => { (d as GuiButton).fontSize = v; })}
            />
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Text Color</span>
              <input
                type="color"
                className="h-7 w-full cursor-pointer rounded border border-border-default bg-transparent"
                value={(node as GuiButton).color ?? "#ffffff"}
                onChange={(e) => onChange((d) => { (d as GuiButton).color = e.target.value; })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">BG Color</span>
              <input
                type="color"
                className="h-7 w-full cursor-pointer rounded border border-border-default bg-transparent"
                value={(node as GuiButton).backgroundColor ?? "#333333"}
                onChange={(e) => onChange((d) => { (d as GuiButton).backgroundColor = e.target.value; })}
              />
            </label>
          </AccordionSection>
        )}

        {node.type === "Image" && (
          <AccordionSection
            icon={<Image size={12} />}
            label="Image Content"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
            accent="cyan"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Asset</span>
              <Select
                value={(node as GuiImage).assetId}
                onChange={(e) => onChange((d) => { (d as GuiImage).assetId = e.target.value; })}
              >
                <option value="">— Select Asset —</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.id}
                  </option>
                ))}
              </Select>
            </label>
          </AccordionSection>
        )}
      </div>
    </aside>
  );
}
