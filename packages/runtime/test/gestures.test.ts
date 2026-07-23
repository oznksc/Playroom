import { describe, expect, it } from "vitest";
import { createGestureRecognizer, gestureToJumpImpulse } from "../src/gestures.js";

describe("gesture recognizer", () => {
  it("recognizes a tap", () => {
    const g = createGestureRecognizer();
    g.pointerDown(1, 10, 10, 0);
    const result = g.pointerUp(1, 12, 11, 100);
    expect(result).toEqual({ kind: "tap", x: 12, y: 11 });
  });

  it("recognizes swipe up", () => {
    const g = createGestureRecognizer();
    g.pointerDown(1, 100, 200, 0);
    const result = g.pointerUp(1, 100, 100, 200);
    expect(result?.kind).toBe("swipe");
    if (result?.kind === "swipe") {
      expect(result.direction).toBe("up");
      expect(gestureToJumpImpulse(result)).toBe(true);
    }
  });

  it("recognizes long-press while held still", () => {
    const g = createGestureRecognizer({ longPressMs: 400 });
    g.pointerDown(1, 50, 50, 0);
    const result = g.pointerMove(1, 51, 50, 450);
    expect(result).toEqual({ kind: "longPress", x: 51, y: 50 });
  });

  it("emits pinch scale with two pointers", () => {
    const g = createGestureRecognizer();
    g.pointerDown(1, 0, 0, 0);
    g.pointerDown(2, 100, 0, 0);
    const result = g.pointerMove(2, 200, 0, 50);
    expect(result?.kind).toBe("pinch");
    if (result?.kind === "pinch") {
      expect(result.scale).toBeCloseTo(2, 1);
    }
  });
});
