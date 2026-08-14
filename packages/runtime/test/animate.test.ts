import { describe, expect, it } from "vitest";
import type { AnimationComponent } from "@gamekit/schema";
import { updateAnimation, getFrameSourceRect } from "../src/animate.js";

function makeAnim(overrides: Partial<AnimationComponent> = {}): AnimationComponent {
  return {
    type: "Animation",
    assetId: "hero-run",
    frameWidth: 32,
    frameHeight: 32,
    totalFrames: 4,
    framesPerSecond: 8,
    loop: true,
    currentFrame: 0,
    ...overrides,
  };
}

describe("animation", () => {
  it("starts advancing from currentFrame when set", () => {
    const anim = makeAnim({ currentFrame: 2 });
    const state = { currentFrame: anim.currentFrame ?? 0, elapsed: 0 };
    // Half a second at 8fps = 4 frames; starts at frame 2, wraps to 2.
    const frame = updateAnimation(anim, state, 0.5);
    expect(frame).toBe(2);
  });

  it("starts from frame 0 when currentFrame is unset", () => {
    const anim = makeAnim({ currentFrame: undefined });
    const state = { currentFrame: anim.currentFrame ?? 0, elapsed: 0 };
    const frame = updateAnimation(anim, state, 0.5);
    expect(frame).toBe(0);
  });

  it("holds the last frame when not looping", () => {
    const anim = makeAnim({ currentFrame: 3, loop: false });
    const state = { currentFrame: anim.currentFrame ?? 0, elapsed: 0 };
    const frame = updateAnimation(anim, state, 1);
    expect(frame).toBe(3);
  });

  it("computes a single-row source rect for a frame index", () => {
    expect(getFrameSourceRect(makeAnim(), 2)).toEqual({
      x: 64,
      y: 0,
      width: 32,
      height: 32,
    });
  });
});
