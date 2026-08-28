import type { NineSliceComponent } from "@gamekit/schema";

export type NineSliceRegion = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Compute the 9-slice regions for a component: source rects (natural image px,
 * `sx/sy/sw/sh`) mapped to target rects (`x/y/w/h`) anchored at `x0/y0`.
 * Corners keep source size; edges stretch on one axis; the center stretches both.
 */
export function computeNineSliceRegions(
  nineSlice: NineSliceComponent,
  x0: number,
  y0: number,
  srcWidth: number,
  srcHeight: number
): NineSliceRegion[] {
  const left = nineSlice.leftWidth;
  const right = nineSlice.rightWidth;
  const top = nineSlice.topHeight;
  const bottom = nineSlice.bottomHeight;

  const midSrcW = Math.max(0, srcWidth - left - right);
  const midSrcH = Math.max(0, srcHeight - top - bottom);
  const midW = Math.max(0, nineSlice.width - left - right);
  const midH = Math.max(0, nineSlice.height - top - bottom);

  const xL = x0 + left;
  const xR = x0 + left + midW;
  const yT = y0 + top;
  const yB = y0 + top + midH;

  const regions: NineSliceRegion[] = [];
  if (midSrcW > 0 && midSrcH > 0) {
    regions.push({ sx: left, sy: top, sw: midSrcW, sh: midSrcH, x: xL, y: yT, w: midW, h: midH });
  }
  if (midSrcW > 0 && top > 0)
    regions.push({ sx: left, sy: 0, sw: midSrcW, sh: top, x: xL, y: y0, w: midW, h: top });
  if (midSrcW > 0 && bottom > 0)
    regions.push({
      sx: left,
      sy: srcHeight - bottom,
      sw: midSrcW,
      sh: bottom,
      x: xL,
      y: yB,
      w: midW,
      h: bottom,
    });
  if (midSrcH > 0 && left > 0)
    regions.push({ sx: 0, sy: top, sw: left, sh: midSrcH, x: x0, y: yT, w: left, h: midH });
  if (midSrcH > 0 && right > 0)
    regions.push({
      sx: srcWidth - right,
      sy: top,
      sw: right,
      sh: midSrcH,
      x: xR,
      y: yT,
      w: right,
      h: midH,
    });
  if (left > 0 && top > 0)
    regions.push({ sx: 0, sy: 0, sw: left, sh: top, x: x0, y: y0, w: left, h: top });
  if (right > 0 && top > 0)
    regions.push({
      sx: srcWidth - right,
      sy: 0,
      sw: right,
      sh: top,
      x: xR,
      y: y0,
      w: right,
      h: top,
    });
  if (left > 0 && bottom > 0)
    regions.push({
      sx: 0,
      sy: srcHeight - bottom,
      sw: left,
      sh: bottom,
      x: x0,
      y: yB,
      w: left,
      h: bottom,
    });
  if (right > 0 && bottom > 0)
    regions.push({
      sx: srcWidth - right,
      sy: srcHeight - bottom,
      sw: right,
      sh: bottom,
      x: xR,
      y: yB,
      w: right,
      h: bottom,
    });
  return regions;
}
