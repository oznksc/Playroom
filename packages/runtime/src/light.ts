export const LIGHT_FALLBACK_COLOR = "#ffffff";
export const LIGHT_CONE_HALF_ANGLE = Math.PI / 6;

/**
 * Convert a `#rrggbb` hex color + alpha (0..1) into an `#rrggbbaa` hex string
 * accepted by Skia colors. Falls back to white for unparseable input.
 */
export function hexToRgbaHex(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return `#ffffff${alphaToHex(alpha)}`;
  return `#${m[1]}${alphaToHex(alpha)}`;
}

function alphaToHex(alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return a.toString(16).padStart(2, "0");
}

export type LightPoint = { x: number; y: number };

/**
 * Radial glow color stops for a point light: bright at the center, fully
 * transparent at `range`. `intensity` scales the peak alpha.
 */
export function pointLightColors(color: string, intensity: number): string[] {
  const peak = Math.max(0, Math.min(1, intensity)) * 0.85;
  return [hexToRgbaHex(color, peak), hexToRgbaHex(color, peak * 0.35), hexToRgbaHex(color, 0)];
}

export type SpotCone = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
};

/**
 * The three vertices of the spot cone fan (drawn as a Path) in world space:
 * apex at the light position, opening along `rotationDeg` (degrees; 0 points
 * straight up, positive rotates clockwise) to `range` length.
 */
export function computeSpotCone(
  light: LightPoint,
  range: number,
  rotationDeg: number,
): SpotCone {
  const angle = (rotationDeg * Math.PI) / 180;
  const a1 = angle - LIGHT_CONE_HALF_ANGLE;
  const a2 = angle + LIGHT_CONE_HALF_ANGLE;
  // Direction points up (-y) at 0° and rotates clockwise (toward +x) as the
  // angle grows, matching the engine's screen-space rotation semantics.
  const dir = (a: number) => ({
    x: Math.sin(a) * range,
    y: -Math.cos(a) * range,
  });
  const e1 = dir(a1);
  const e2 = dir(a2);
  return {
    x1: light.x,
    y1: light.y,
    x2: light.x + e1.x,
    y2: light.y + e1.y,
    x3: light.x + e2.x,
    y3: light.y + e2.y,
  };
}

/** Alpha stops shared by point and spot gradients. */
export const LIGHT_GRADIENT_POSITIONS = [0, 0.45, 1] as const;