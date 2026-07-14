import type { SpriteComponent, GameKitAsset } from "@gamekit/schema";
import { ImagePlus, FolderOpen } from "lucide-react";
import { NumberField, AccordionSection } from "@/ui";
import { findComponent } from "../../lib/components.js";
import { getApiUrl } from "../../lib/api.js";
import type { OnChange } from "./types.js";

type Props = {
  sprite: SpriteComponent | undefined;
  assets: GameKitAsset[];
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function SpriteSection({ sprite, assets, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<ImagePlus size={12} />}
      label="Sprite Renderer"
      open={open}
      onToggle={onToggle}
      removable={!!sprite}
      onRemove={onRemove}
      accent="cyan"
    >
      {sprite ? (
        <>
          <div className="mb-2 flex items-center gap-2">
            {assets.find(a => a.id === sprite.assetId) ? (
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-default bg-bg-base">
                <img src={getApiUrl(`/gamekit/assets/${assets.find(a => a.id === sprite.assetId)?.file}`)} alt="" />
              </div>
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-default bg-bg-base text-text-muted">
                <FolderOpen size={16} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-text-muted">Asset Ref</label>
              <select className="h-[26px] w-full rounded-md border border-border-default bg-bg-base px-2 text-[12px] outline-none focus:border-accent"
                value={sprite.assetId}
                onChange={(event) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.assetId = event.target.value;
                })}
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.id}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5" style={{ marginTop: 10 }}>
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Width"
                value={sprite.width}
                onChange={(value) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.width = value;
                })}
              />
              <NumberField
                label="Height"
                value={sprite.height}
                onChange={(value) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.height = value;
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Anchor X"
                value={sprite.anchor.x}
                onChange={(value) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.anchor.x = value;
                })}
              />
              <NumberField
                label="Anchor Y"
                value={sprite.anchor.y}
                onChange={(value) => onChange((draft) => {
                  findComponent<SpriteComponent>(draft, "Sprite")!.anchor.y = value;
                })}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">Sprite Renderer missing on this entity</p>
      )}
    </AccordionSection>
  );
}
