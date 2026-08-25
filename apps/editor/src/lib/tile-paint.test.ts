import { describe, expect, it } from "vitest";
import {
  brushCells,
  fillRectCells,
  floodFill,
  stampBrush,
  tileCellAt,
  tilesetTileCount,
  tileSrcRect,
} from "./tile-paint.js";

describe("tile paint", () => {
  it("maps world points onto grid cells", () => {
    expect(tileCellAt({ x: 40, y: 50 }, { x: 10, y: 10 }, 16, 16, 8, 8)).toEqual({ gx: 1, gy: 2 });
    expect(tileCellAt({ x: 9, y: 10 }, { x: 10, y: 10 }, 16, 16, 8, 8)).toBeNull();
  });

  it("stamps a brush and rectangle, flood-fills a region", () => {
    const empty = new Array(16).fill(0);
    const stamped = stampBrush(empty, 4, 4, 1, 1, 3, 3);
    expect(stamped.filter((v) => v === 3).length).toBe(9);
    expect(stamped[0]).toBe(3);

    const rect = fillRectCells(empty, 4, 4, { gx: 2, gy: 1 }, { gx: 3, gy: 3 }, 7);
    expect(rect[tileIndex(2, 1)]).toBe(7);
    expect(rect[tileIndex(3, 3)]).toBe(7);
    expect(rect[tileIndex(0, 0)]).toBe(0);

    const seeded = empty.slice();
    seeded[0] = 1;
    seeded[1] = 1;
    seeded[4] = 1;
    const filled = floodFill(seeded, 4, 4, 0, 0, 9);
    expect(filled[0]).toBe(9);
    expect(filled[1]).toBe(9);
    expect(filled[4]).toBe(9);
    expect(filled[2]).toBe(0);
  });

  it("derives tileset counts and source rects", () => {
    expect(tilesetTileCount({ width: 64, height: 32 }, 16, 16, 4)).toBe(8);
    expect(tileSrcRect(1, 4, 16, 16)).toEqual({ sx: 0, sy: 0, sw: 16, sh: 16 });
    expect(tileSrcRect(6, 4, 16, 16)).toEqual({ sx: 16, sy: 16, sw: 16, sh: 16 });
    expect(tileSrcRect(0, 4, 16, 16)).toBeNull();
    expect(brushCells(0, 0, 2, 4, 4)).toEqual([{ gx: 0, gy: 0 }]);
  });
});

function tileIndex(x: number, y: number): number {
  return y * 4 + x;
}
