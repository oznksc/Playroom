import { describe, expect, it } from "vitest";
import {
  computeSpotCone,
  hexToRgbaHex,
  pointLightColors,
  LIGHT_CONE_HALF_ANGLE,
} from "../src/light.js";

describe("hexToRgbaHex", () => {
  it("appends alpha to a valid hex color", () => {
    expect(hexToRgbaHex("#ff0000", 0.5)).toBe("#ff000080");
  });

  it("clamps alpha to 0..1", () => {
    expect(hexToRgbaHex("#00ff00", 2)).toBe("#00ff00ff");
    expect(hexToRgbaHex("#00ff00", -1)).toBe("#00ff0000");
  });

  it("falls back to white on invalid color", () => {
    expect(hexToRgbaHex("red", 1)).toBe("#ffffff" + "ff");
  });
});

describe("pointLightColors", () => {
  it("builds a bright-to-transparent gradient", () => {
    const colors = pointLightColors("#ffffff", 1);
    expect(colors[0]).toBe("#ffffffd9");
    expect(colors[1]).toBe("#ffffff4c");
    expect(colors[2]).toBe("#ffffff00");
  });

  it("scales peak alpha with intensity", () => {
    const dim = pointLightColors("#ffffff", 0.5);
    const bright = pointLightColors("#ffffff", 1);
    expect(Number.parseInt(dim[0].slice(7), 16)).toBeLessThan(
      Number.parseInt(bright[0].slice(7), 16)
    );
  });
});

describe("computeSpotCone", () => {
  it("points straight up at 0 degrees (no rotation)", () => {
    const cone = computeSpotCone({ x: 100, y: 100 }, 200, 0);
    expect(cone.x1).toBe(100);
    expect(cone.y1).toBe(100);
    expect(cone.x2).toBeCloseTo(100 - Math.sin(LIGHT_CONE_HALF_ANGLE) * 200, 5);
    expect(cone.y2).toBeCloseTo(100 - Math.cos(LIGHT_CONE_HALF_ANGLE) * 200, 5);
    expect(cone.x3).toBeCloseTo(100 + Math.sin(LIGHT_CONE_HALF_ANGLE) * 200, 5);
    expect(cone.y3).toBeCloseTo(100 - Math.cos(LIGHT_CONE_HALF_ANGLE) * 200, 5);
  });

  it("opens to the right at 90 degrees", () => {
    const cone = computeSpotCone({ x: 0, y: 0 }, 100, 90);
    expect(cone.x2).toBeGreaterThan(0);
    expect(cone.x3).toBeGreaterThan(0);
    expect(cone.x2).toBeCloseTo(cone.x3, 5);
    expect(cone.y2).toBeCloseTo(-cone.y3, 5);
  });
});
