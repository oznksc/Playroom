import { describe, expect, it } from "vitest";
import {
  particleLifeProgress,
  particleRenderAlpha,
  particleRenderColor,
  particleRenderSize,
  type Particle,
} from "../src/particles.js";

function makeParticle(overrides: Partial<Particle> = {}): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    lifetime: 1,
    sizeStart: 10,
    sizeEnd: 0,
    colorStart: "#ff0000",
    colorEnd: "#0000ff",
    ...overrides,
  };
}

describe("particle render helpers", () => {
  it("clamps life progress to [0, 1]", () => {
    expect(particleLifeProgress(makeParticle({ age: 0 }))).toBe(0);
    expect(particleLifeProgress(makeParticle({ age: 0.5 }))).toBeCloseTo(0.5);
    expect(particleLifeProgress(makeParticle({ age: 2 }))).toBe(1);
  });

  it("fades alpha linearly to 0 at end of life", () => {
    expect(particleRenderAlpha(makeParticle({ age: 0 }))).toBe(1);
    expect(particleRenderAlpha(makeParticle({ age: 0.5 }))).toBeCloseTo(0.5);
    expect(particleRenderAlpha(makeParticle({ age: 1 }))).toBe(0);
  });

  it("interpolates size from start to end", () => {
    expect(particleRenderSize(makeParticle({ age: 0 }))).toBe(10);
    expect(particleRenderSize(makeParticle({ age: 0.5 }))).toBeCloseTo(5);
    expect(particleRenderSize(makeParticle({ age: 1 }))).toBe(0);
  });

  it("interpolates color per channel over life", () => {
    expect(particleRenderColor(makeParticle({ age: 0 }))).toBe("#ff0000");
    expect(particleRenderColor(makeParticle({ age: 1 }))).toBe("#0000ff");
    expect(particleRenderColor(makeParticle({ age: 0.5 }))).toBe("#800080");
  });

  it("expands 3-digit hex colors", () => {
    const p = makeParticle({ colorStart: "#f00", colorEnd: "#00f", age: 0 });
    expect(particleRenderColor(p)).toBe("#ff0000");
  });

  it("falls back to a midpoint swap for non-hex colors", () => {
    const p = makeParticle({ colorStart: "red", colorEnd: "blue" });
    expect(particleRenderColor(makeParticle({ ...p, age: 0.2 }))).toBe("red");
    expect(particleRenderColor(makeParticle({ ...p, age: 0.8 }))).toBe("blue");
  });
});
