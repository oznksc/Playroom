import type { GameKitEntity, TilemapComponent, TransformComponent } from "@gamekit/schema";
import type { TilePaintMode } from "./editor-tools.js";
import { findComponent } from "./components.js";

export type TileCell = { gx: number; gy: number };

export type TilePaintOverlay = {
  entityId: string;
  hover: TileCell | null;
  rectStart: TileCell | null;
  tileId: number;
  brushSize: number;
  mode: TilePaintMode;
  draftTiles?: number[];
};

export function tileIndex(gx: number, gy: number, width: number): number {
  return gy * width + gx;
}

export function inTileBounds(gx: number, gy: number, width: number, height: number): boolean {
  return gx >= 0 && gy >= 0 && gx < width && gy < height;
}

export function tileCellAt(
  point: { x: number; y: number },
  origin: { x: number; y: number },
  tileWidth: number,
  tileHeight: number,
  gridWidth: number,
  gridHeight: number,
): TileCell | null {
  if (tileWidth <= 0 || tileHeight <= 0) return null;
  const gx = Math.floor((point.x - origin.x) / tileWidth);
  const gy = Math.floor((point.y - origin.y) / tileHeight);
  if (!inTileBounds(gx, gy, gridWidth, gridHeight)) return null;
  return { gx, gy };
}

export function stampBrush(
  tiles: number[],
  width: number,
  height: number,
  cx: number,
  cy: number,
  value: number,
  size = 1,
): number[] {
  const next = tiles.slice();
  const radius = Math.max(0, Math.floor((Math.max(1, size) - 1) / 2));
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (!inTileBounds(x, y, width, height)) continue;
      next[tileIndex(x, y, width)] = value;
    }
  }
  return next;
}

export function fillRectCells(
  tiles: number[],
  width: number,
  height: number,
  a: TileCell,
  b: TileCell,
  value: number,
): number[] {
  const next = tiles.slice();
  const minX = Math.max(0, Math.min(a.gx, b.gx));
  const maxX = Math.min(width - 1, Math.max(a.gx, b.gx));
  const minY = Math.max(0, Math.min(a.gy, b.gy));
  const maxY = Math.min(height - 1, Math.max(a.gy, b.gy));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      next[tileIndex(x, y, width)] = value;
    }
  }
  return next;
}

export function floodFill(
  tiles: number[],
  width: number,
  height: number,
  gx: number,
  gy: number,
  value: number,
): number[] {
  if (!inTileBounds(gx, gy, width, height)) return tiles.slice();
  const start = tileIndex(gx, gy, width);
  const target = tiles[start];
  if (target === value) return tiles.slice();
  const next = tiles.slice();
  const stack = [start];
  while (stack.length > 0) {
    const i = stack.pop()!;
    if (next[i] !== target) continue;
    next[i] = value;
    const x = i % width;
    const y = Math.floor(i / width);
    if (x > 0) stack.push(i - 1);
    if (x < width - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - width);
    if (y < height - 1) stack.push(i + width);
  }
  return next;
}

export function tilesetTileCount(
  image: { width: number; height: number } | undefined,
  tileWidth: number,
  tileHeight: number,
  columns: number,
): number {
  const tw = Math.max(1, tileWidth);
  const th = Math.max(1, tileHeight);
  if (image && image.width > 0 && image.height > 0) {
    const cols = Math.max(1, columns || Math.floor(image.width / tw));
    const rows = Math.max(1, Math.floor(image.height / th));
    return Math.max(1, cols * rows);
  }
  return Math.max(1, (columns || 8) * 4);
}

export function tileSrcRect(
  tileId: number,
  columns: number,
  tileWidth: number,
  tileHeight: number,
): { sx: number; sy: number; sw: number; sh: number } | null {
  if (tileId <= 0) return null;
  const cols = Math.max(1, columns);
  const srcIndex = tileId - 1;
  return {
    sx: (srcIndex % cols) * tileWidth,
    sy: Math.floor(srcIndex / cols) * tileHeight,
    sw: tileWidth,
    sh: tileHeight,
  };
}

export function rectCells(a: TileCell, b: TileCell): TileCell[] {
  const cells: TileCell[] = [];
  const minX = Math.min(a.gx, b.gx);
  const maxX = Math.max(a.gx, b.gx);
  const minY = Math.min(a.gy, b.gy);
  const maxY = Math.max(a.gy, b.gy);
  for (let gy = minY; gy <= maxY; gy++) {
    for (let gx = minX; gx <= maxX; gx++) cells.push({ gx, gy });
  }
  return cells;
}

export function brushCells(cx: number, cy: number, size: number, width: number, height: number): TileCell[] {
  const cells: TileCell[] = [];
  const radius = Math.max(0, Math.floor((Math.max(1, size) - 1) / 2));
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (inTileBounds(x, y, width, height)) cells.push({ gx: x, gy: y });
    }
  }
  return cells;
}

export function drawTilemapPaintOverlay(
  context: CanvasRenderingContext2D,
  tilemap: TilemapComponent,
  origin: { x: number; y: number },
  overlay: TilePaintOverlay,
  images: Map<string, HTMLImageElement>,
  zoom = 1,
): void {
  const { tileWidth, tileHeight, gridWidth, gridHeight } = tilemap;
  const hair = 1 / Math.max(0.0001, zoom);
  context.save();
  context.strokeStyle = "rgba(0,240,255,0.22)";
  context.lineWidth = hair;
  context.setLineDash([]);
  for (let x = 0; x <= gridWidth; x++) {
    const px = origin.x + x * tileWidth;
    context.beginPath();
    context.moveTo(px, origin.y);
    context.lineTo(px, origin.y + gridHeight * tileHeight);
    context.stroke();
  }
  for (let y = 0; y <= gridHeight; y++) {
    const py = origin.y + y * tileHeight;
    context.beginPath();
    context.moveTo(origin.x, py);
    context.lineTo(origin.x + gridWidth * tileWidth, py);
    context.stroke();
  }

  const previewCells: TileCell[] =
    overlay.mode === "rect" && overlay.rectStart && overlay.hover
      ? rectCells(overlay.rectStart, overlay.hover)
      : overlay.hover
        ? overlay.mode === "fill" || overlay.mode === "eyedropper"
          ? [overlay.hover]
          : brushCells(overlay.hover.gx, overlay.hover.gy, overlay.brushSize, gridWidth, gridHeight)
        : [];

  const image = images.get(tilemap.tilesetId);
  const src = tileSrcRect(overlay.tileId, tilemap.columns, tileWidth, tileHeight);
  for (const cell of previewCells) {
    const x = origin.x + cell.gx * tileWidth;
    const y = origin.y + cell.gy * tileHeight;
    if (overlay.mode === "erase" || overlay.tileId === 0) {
      context.fillStyle = "rgba(239,68,68,0.28)";
      context.fillRect(x, y, tileWidth, tileHeight);
    } else if (image && src) {
      context.globalAlpha = 0.55;
      context.drawImage(image, src.sx, src.sy, src.sw, src.sh, x, y, tileWidth, tileHeight);
      context.globalAlpha = 1;
    } else {
      context.fillStyle = "rgba(139,92,246,0.35)";
      context.fillRect(x, y, tileWidth, tileHeight);
    }
    context.strokeStyle = overlay.mode === "erase" ? "rgba(239,68,68,0.9)" : "rgba(0,240,255,0.85)";
    context.lineWidth = 1.5 * hair;
    context.strokeRect(x, y, tileWidth, tileHeight);
  }
  context.restore();
}

export function findTilemapHit(
  entities: GameKitEntity[],
  point: { x: number; y: number },
  selectedIds: Iterable<string>,
): { entityId: string; tilemap: TilemapComponent; transform: TransformComponent; cell: TileCell } | null {
  const selected = [...selectedIds]
    .map((id) => entities.find((e) => e.id === id))
    .find((e) => e && findComponent(e, "Tilemap"));
  const candidates = selected ? [selected] : [...entities].reverse();
  for (const entity of candidates) {
    if (!entity) continue;
    const tm = findComponent<TilemapComponent>(entity, "Tilemap");
    const tr = findComponent<TransformComponent>(entity, "Transform");
    if (!tm || !tr) continue;
    const cell = tileCellAt(point, tr.position, tm.tileWidth, tm.tileHeight, tm.gridWidth, tm.gridHeight);
    if (!cell) continue;
    return { entityId: entity.id, tilemap: tm, transform: tr, cell };
  }
  return null;
}
