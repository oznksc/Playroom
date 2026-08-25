import type { TextComponent, GameKitAsset } from "@gamekit/schema";
import { Type } from "lucide-react";
import { NumberField, AccordionSection, Select, Input, ColorField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  textComp: TextComponent | undefined;
  assets: GameKitAsset[];
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function TextSection({ textComp, assets, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Type size={12} />}
      label="Text Label"
      open={open}
      onToggle={onToggle}
      removable={!!textComp}
      onRemove={onRemove}
    >
      {textComp ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Text</span>
            <Input
              value={textComp.text}
              onChange={(e) => {
                const val = e.target.value;
                onChange((d) => { findComponent<TextComponent>(d, "Text")!.text = val; });
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Font asset</span>
            <Select
              value={textComp.fontAssetId}
              onChange={(e) => {
                const val = e.target.value;
                onChange((d) => { findComponent<TextComponent>(d, "Text")!.fontAssetId = val; });
              }}
            >
              <option value="default">default</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.id}</option>
              ))}
            </Select>
          </label>
          <NumberField
            label="Size"
            value={textComp.size}
            onChange={(v) => onChange((d) => { findComponent<TextComponent>(d, "Text")!.size = v; })}
          />
          <NumberField
            label="Wrap width (0 = no wrap)"
            value={textComp.width ?? 0}
            onChange={(v) => onChange((d) => {
              findComponent<TextComponent>(d, "Text")!.width = v > 0 ? v : undefined;
            })}
          />
          <ColorField
            label="Color"
            value={textComp.color}
            onChange={(v) => onChange((d) => { findComponent<TextComponent>(d, "Text")!.color = v; })}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Align</span>
            <Select
              value={textComp.align}
              onChange={(e) => {
                const val = e.target.value as TextComponent["align"];
                onChange((d) => {
                  findComponent<TextComponent>(d, "Text")!.align = val;
                });
              }}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </Select>
          </label>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No text component</p>
      )}
    </AccordionSection>
  );
}
