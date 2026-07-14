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
      accent="purple"
    >
      {textComp ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Text</span>
            <Input
              value={textComp.text}
              onChange={(e) => onChange((d) => { findComponent<TextComponent>(d, "Text")!.text = e.target.value; })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Font asset</span>
            <Select
              value={textComp.fontAssetId}
              onChange={(e) => onChange((d) => { findComponent<TextComponent>(d, "Text")!.fontAssetId = e.target.value; })}
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
          <ColorField
            label="Color"
            value={textComp.color}
            onChange={(v) => onChange((d) => { findComponent<TextComponent>(d, "Text")!.color = v; })}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Align</span>
            <Select
              value={textComp.align}
              onChange={(e) => onChange((d) => {
                findComponent<TextComponent>(d, "Text")!.align = e.target.value as TextComponent["align"];
              })}
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
