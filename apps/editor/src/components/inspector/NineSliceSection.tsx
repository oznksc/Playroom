import type { NineSliceComponent, GameKitAsset } from "@gamekit/schema";
import { Square } from "lucide-react";
import { NumberField, AccordionSection, Select } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  nineSlice: NineSliceComponent | undefined;
  assets: GameKitAsset[];
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function NineSliceSection({ nineSlice, assets, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Square size={12} />}
      label="NineSlice Sprite"
      open={open}
      onToggle={onToggle}
      removable={!!nineSlice}
      onRemove={onRemove}
      accent="purple"
    >
      {nineSlice ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Asset</span>
            <Select
              value={nineSlice.assetId}
              onChange={(e) => onChange((d) => { findComponent<NineSliceComponent>(d, "NineSlice")!.assetId = e.target.value; })}
            >
              <option value="">— Select —</option>
              {assets.filter(a => a.kind === "image").map((a) => (
                <option key={a.id} value={a.id}>{a.id}</option>
              ))}
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Width" value={nineSlice.width}
              onChange={(v) => onChange((d) => { findComponent<NineSliceComponent>(d, "NineSlice")!.width = v; })}
            />
            <NumberField label="Height" value={nineSlice.height}
              onChange={(v) => onChange((d) => { findComponent<NineSliceComponent>(d, "NineSlice")!.height = v; })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Left Width" value={nineSlice.leftWidth}
              onChange={(v) => onChange((d) => { findComponent<NineSliceComponent>(d, "NineSlice")!.leftWidth = v; })}
            />
            <NumberField label="Right Width" value={nineSlice.rightWidth}
              onChange={(v) => onChange((d) => { findComponent<NineSliceComponent>(d, "NineSlice")!.rightWidth = v; })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Top Height" value={nineSlice.topHeight}
              onChange={(v) => onChange((d) => { findComponent<NineSliceComponent>(d, "NineSlice")!.topHeight = v; })}
            />
            <NumberField label="Bottom Height" value={nineSlice.bottomHeight}
              onChange={(v) => onChange((d) => { findComponent<NineSliceComponent>(d, "NineSlice")!.bottomHeight = v; })}
            />
          </div>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No NineSlice component</p>
      )}
    </AccordionSection>
  );
}
