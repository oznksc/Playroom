import type { TilemapComponent, GameKitAsset } from "@gamekit/schema";
import { Grid3x3 } from "lucide-react";
import { NumberField, AccordionSection, Select } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  tilemap: TilemapComponent | undefined;
  assets: GameKitAsset[];
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function TilemapSection({ tilemap, assets, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Grid3x3 size={12} />}
      label="Tilemap Renderer"
      open={open}
      onToggle={onToggle}
      removable={!!tilemap}
      onRemove={onRemove}
      accent="green"
    >
      {tilemap ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Tileset</span>
            <Select
              value={tilemap.tilesetId}
              onChange={(e) => onChange((draft) => {
                findComponent<TilemapComponent>(draft, "Tilemap")!.tilesetId = e.target.value;
              })}
            >
              <option value="">— Select asset —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.id}</option>
              ))}
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="Tile W" value={tilemap.tileWidth}
              onChange={(v) => onChange((d) => { findComponent<TilemapComponent>(d, "Tilemap")!.tileWidth = v; })}
            />
            <NumberField label="Tile H" value={tilemap.tileHeight}
              onChange={(v) => onChange((d) => { findComponent<TilemapComponent>(d, "Tilemap")!.tileHeight = v; })}
            />
            <NumberField label="Columns" value={tilemap.columns}
              onChange={(v) => onChange((d) => { findComponent<TilemapComponent>(d, "Tilemap")!.columns = Math.max(1, Math.floor(v)); })}
            />
            <NumberField label="Grid W" value={tilemap.gridWidth}
              onChange={(v) => onChange((d) => {
                const tm = findComponent<TilemapComponent>(d, "Tilemap")!;
                const w = Math.max(1, Math.floor(v));
                const h = tm.gridHeight;
                const next = new Array(w * h).fill(0);
                for (let y = 0; y < h; y++) {
                  for (let x = 0; x < Math.min(w, tm.gridWidth); x++) {
                    const src = y * tm.gridWidth + x;
                    if (src < tm.tiles.length) next[y * w + x] = tm.tiles[src];
                  }
                }
                tm.gridWidth = w;
                tm.tiles = next;
              })}
            />
            <NumberField label="Grid H" value={tilemap.gridHeight}
              onChange={(v) => onChange((d) => {
                const tm = findComponent<TilemapComponent>(d, "Tilemap")!;
                const h = Math.max(1, Math.floor(v));
                const w = tm.gridWidth;
                const next = new Array(w * h).fill(0);
                for (let y = 0; y < Math.min(h, tm.gridHeight); y++) {
                  for (let x = 0; x < w; x++) {
                    const src = y * tm.gridWidth + x;
                    if (src < tm.tiles.length) next[y * w + x] = tm.tiles[src];
                  }
                }
                tm.gridHeight = h;
                tm.tiles = next;
              })}
            />
          </div>
          <p className="m-0 font-mono text-[10px] text-text-muted">
            {tilemap.tiles.length} cells · paint on canvas with brush tools
          </p>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No tilemap on this entity</p>
      )}
    </AccordionSection>
  );
}
