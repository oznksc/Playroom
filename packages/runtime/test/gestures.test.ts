import { describe, expect, it } from "vitest";
import {
  createGestureRecognizer,
  gestureToJumpImpulse,
  gestureScriptEventName,
} from "../src/gestures.js";

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

  it("maps recognized gestures to script event names", () => {
    expect(gestureScriptEventName({ kind: "tap", x: 0, y: 0 })).toBe("tap");
    expect(gestureScriptEventName({ kind: "longPress", x: 0, y: 0 })).toBe("longPress");
    expect(
      gestureScriptEventName({
        kind: "swipe",
        direction: "up",
        dx: 0,
        dy: -100,
        distance: 100,
        x: 0,
        y: 0,
      }),
    ).toBe("swipeUp");
    expect(
      gestureScriptEventName({
        kind: "swipe",
        direction: "down",
        dx: 0,
        dy: 100,
        distance: 100,
        x: 0,
        y: 0,
      }),
    ).toBe("swipeDown");
    expect(
      gestureScriptEventName({
        kind: "swipe",
        direction: "left",
        dx: -100,
        dy: 0,
        distance: 100,
        x: 0,
        y: 0,
      }),
    ).toBe("swipeLeft");
    expect(
      gestureScriptEventName({
        kind: "swipe",
        direction: "right",
        dx: 100,
        dy: 0,
        distance: 100,
        x: 0,
        y: 0,
      }),
    ).toBe("swipeRight");
    expect(gestureScriptEventName({ kind: "pinch", scale: 2, centerX: 0, centerY: 0 })).toBe("pinch");
  });
});
