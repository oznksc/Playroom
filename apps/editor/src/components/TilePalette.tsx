import type { GameKitAsset, GameKitScene, TilemapComponent } from "@gamekit/schema";
import { Eraser, Paintbrush, Pipette, Square, PaintBucket } from "lucide-react";
import { findComponent } from "../lib/components.js";
import styles from "./TilePalette.module.css";
import type { TilePaintMode } from "../lib/editor-tools.js";
import { tileSrcRect, tilesetTileCount } from "../lib/tile-paint.js";
import { cn } from "@/ui";

type TilePaletteProps = {
  scene?: GameKitScene;
  assets: GameKitAsset[];
  images: Map<string, HTMLImageElement>;
  selectedEntityIds: Set<string>;
  paintTileId: number;
  paintMode: TilePaintMode;
  brushSize: number;
  onPaintTileIdChange: (id: number) => void;
  onPaintModeChange: (mode: TilePaintMode) => void;
  onBrushSizeChange: (size: number) => void;
};

const MODES: Array<{ id: TilePaintMode; label: string; hint: string; icon: typeof Paintbrush }> = [
  { id: "brush", label: "Brush", hint: "B", icon: Paintbrush },
  { id: "erase", label: "Erase", hint: "X", icon: Eraser },
  { id: "fill", label: "Fill", hint: "G", icon: PaintBucket },
  { id: "rect", label: "Rect", hint: "T", icon: Square },
  { id: "eyedropper", label: "Pick", hint: "I / Alt", icon: Pipette },
];

export function resolvePaintTilemap(
  scene: GameKitScene | undefined,
  selectedEntityIds: Set<string>,
): TilemapComponent | undefined {
  if (!scene) return undefined;
  const selected = [...selectedEntityIds]
    .map((id) => scene.entities.find((e) => e.id === id))
    .find((e) => e && findComponent(e, "Tilemap"));
  if (selected) return findComponent<TilemapComponent>(selected, "Tilemap");
  for (const entity of scene.entities) {
    const tm = findComponent<TilemapComponent>(entity, "Tilemap");
    if (tm) return tm;
  }
  return undefined;
}

export function TilePalette({
  scene,
  assets,
  images,
  selectedEntityIds,
  paintTileId,
  paintMode,
  brushSize,
  onPaintTileIdChange,
  onPaintModeChange,
  onBrushSizeChange,
}: TilePaletteProps) {
  const tilemap = resolvePaintTilemap(scene, selectedEntityIds);
  const tileset = images.get(tilemap?.tilesetId ?? "");
  const count = tilesetTileCount(
    tileset,
    tilemap?.tileWidth ?? 32,
    tilemap?.tileHeight ?? 32,
    tilemap?.columns ?? 8,
  );
  const ids = [0, ...Array.from({ length: count }, (_, i) => i + 1)];
  const preview = tileSrcRect(
    paintTileId,
    tilemap?.columns ?? 8,
    tilemap?.tileWidth ?? 32,
    tilemap?.tileHeight ?? 32,
  );
  const tilesetName = assets.find((a) => a.id === tilemap?.tilesetId)?.id ?? tilemap?.tilesetId ?? "no tileset";

  return (
    <div className={styles["tile-palette"]} role="toolbar" aria-label="Tile palette">
      <div className={styles["tile-palette-tools"]}>
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              className={cn(styles["tile-tool"], paintMode === mode.id && styles.active)}
              title={`${mode.label} (${mode.hint})`}
              aria-label={mode.label}
              aria-pressed={paintMode === mode.id}
              onClick={() => onPaintModeChange(mode.id)}
            >
              <Icon size={13} strokeWidth={1.75} />
            </button>
          );
        })}
        <span className={styles["tile-palette-sep"]} aria-hidden />
        {[1, 2, 3].map((size) => (
          <button
            key={size}
            type="button"
            className={cn(styles["tile-tool"], brushSize === size && styles.active)}
            title={`Brush size ${size}`}
            aria-label={`Brush size ${size}`}
            onClick={() => onBrushSizeChange(size)}
          >
            {size}
          </button>
        ))}
      </div>
      <span className={styles["tile-palette-label"]}>
        {paintMode === "erase" ? "Erase" : paintMode === "fill" ? "Fill" : paintMode === "rect" ? "Rect" : paintMode === "eyedropper" ? "Pick" : "Brush"}
        {tilemap ? ` · ${tilesetName}` : " · select a tilemap"}
      </span>
      <div className={styles["tile-palette-preview"]} aria-hidden>
        {paintTileId === 0 || !tileset || !preview ? (
          <span className={styles["tile-palette-preview-empty"]}>{paintTileId === 0 ? "·" : paintTileId}</span>
        ) : (
          <span
            className={styles["tile-palette-preview-chip"]}
            style={{
              backgroundImage: `url(${tileset.src})`,
              backgroundSize: `${(tileset.width / preview.sw) * 100}% ${(tileset.height / preview.sh) * 100}%`,
              backgroundPosition: `${-(preview.sx / tileset.width) * ((tileset.width / preview.sw) * 100)}% ${-(preview.sy / tileset.height) * ((tileset.height / preview.sh) * 100)}%`,
            }}
          />
        )}
      </div>
      <div className={styles["tile-palette-swatches"]}>
        {ids.map((id) => {
          const src = tileSrcRect(id, tilemap?.columns ?? 8, tilemap?.tileWidth ?? 32, tilemap?.tileHeight ?? 32);
          const active = paintTileId === id && paintMode !== "erase" ? id !== 0 : paintMode === "erase" && id === 0;
          return (
            <button
              key={id}
              type="button"
              className={cn(styles["tile-swatch"], active && styles.active, id === 0 && styles.empty)}
              title={id === 0 ? "Empty (erase)" : `Tile ${id}`}
              onClick={() => {
                onPaintTileIdChange(id);
                if (id === 0) onPaintModeChange("erase");
                else if (paintMode === "erase" || paintMode === "eyedropper") onPaintModeChange("brush");
              }}
            >
              {id === 0 || !tileset || !src ? (
                id === 0 ? "·" : id
              ) : (
                <span
                  className={styles["tile-swatch-chip"]}
                  style={{
                    backgroundImage: `url(${tileset.src})`,
                    backgroundSize: `${(tileset.width / src.sw) * 100}% ${(tileset.height / src.sh) * 100}%`,
                    backgroundPosition: `${-(src.sx / tileset.width) * ((tileset.width / src.sw) * 100)}% ${-(src.sy / tileset.height) * ((tileset.height / src.sh) * 100)}%`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
