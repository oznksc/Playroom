/**
 * Pure gesture recognizer state machine for pointer streams.
 * Platform adapters feed pointer events; consumers read recognized gestures.
 */

export type GestureKind = "tap" | "longPress" | "swipe" | "pinch";

export type SwipeDirection = "up" | "down" | "left" | "right";

export type RecognizedGesture =
  | { kind: "tap"; x: number; y: number }
  | { kind: "longPress"; x: number; y: number }
  | {
      kind: "swipe";
      direction: SwipeDirection;
      dx: number;
      dy: number;
      distance: number;
      x: number;
      y: number;
    }
  | {
      kind: "pinch";
      scale: number;
      centerX: number;
      centerY: number;
    };

export type GestureRecognizerOptions = {
  /** Max movement (px) for a tap. Default 12. */
  tapSlop?: number;
  /** Max duration (ms) for a tap. Default 250. */
  tapMaxMs?: number;
  /** Min hold (ms) for long-press. Default 450. */
  longPressMs?: number;
  /** Min swipe distance (px). Default 48. */
  swipeMinDistance?: number;
  /** Max swipe duration (ms). Default 600. */
  swipeMaxMs?: number;
};

type PointerState = {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  startTime: number;
};

export type GestureRecognizer = {
  pointerDown: (id: number, x: number, y: number, timeMs?: number) => void;
  pointerMove: (id: number, x: number, y: number, timeMs?: number) => RecognizedGesture | null;
  pointerUp: (id: number, x: number, y: number, timeMs?: number) => RecognizedGesture | null;
  pointerCancel: (id: number) => void;
  reset: () => void;
  activePointerCount: () => number;
};

export function createGestureRecognizer(
  options: GestureRecognizerOptions = {},
): GestureRecognizer {
  const tapSlop = options.tapSlop ?? 12;
  const tapMaxMs = options.tapMaxMs ?? 250;
  const longPressMs = options.longPressMs ?? 450;
  const swipeMinDistance = options.swipeMinDistance ?? 48;
  const swipeMaxMs = options.swipeMaxMs ?? 600;

  const pointers = new Map<number, PointerState>();
  let pinchStartDistance: number | null = null;
  let longPressFired = new Set<number>();

  function distance(a: PointerState, b: PointerState): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function swipeDirection(dx: number, dy: number): SwipeDirection {
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }
    return dy >= 0 ? "down" : "up";
  }

  return {
    pointerDown(id, x, y, timeMs = Date.now()) {
      pointers.set(id, { id, startX: x, startY: y, x, y, startTime: timeMs });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStartDistance = distance(a!, b!);
      }
    },

    pointerMove(id, x, y, _timeMs = Date.now()) {
      const p = pointers.get(id);
      if (!p) return null;
      p.x = x;
      p.y = y;

      // Pinch when two pointers active
      if (pointers.size >= 2 && pinchStartDistance && pinchStartDistance > 0) {
        const pts = [...pointers.values()];
        const d = distance(pts[0]!, pts[1]!);
        const scale = d / pinchStartDistance;
        const centerX = (pts[0]!.x + pts[1]!.x) / 2;
        const centerY = (pts[0]!.y + pts[1]!.y) / 2;
        return { kind: "pinch", scale, centerX, centerY };
      }

      // Long-press while still held nearly still
      const elapsed = _timeMs - p.startTime;
      const moved = Math.hypot(p.x - p.startX, p.y - p.startY);
      if (
        !longPressFired.has(id) &&
        elapsed >= longPressMs &&
        moved <= tapSlop
      ) {
        longPressFired.add(id);
        return { kind: "longPress", x: p.x, y: p.y };
      }

      return null;
    },

    pointerUp(id, x, y, timeMs = Date.now()) {
      const p = pointers.get(id);
      const alreadyLongPressed = longPressFired.has(id);
      pointers.delete(id);
      longPressFired.delete(id);

      if (pointers.size < 2) {
        pinchStartDistance = null;
      }

      if (!p) return null;

      // Prefer not emitting tap/swipe after long-press already fired
      if (alreadyLongPressed) {
        return null;
      }

      const dx = x - p.startX;
      const dy = y - p.startY;
      const dist = Math.hypot(dx, dy);
      const elapsed = timeMs - p.startTime;

      if (dist >= swipeMinDistance && elapsed <= swipeMaxMs) {
        return {
          kind: "swipe",
          direction: swipeDirection(dx, dy),
          dx,
          dy,
          distance: dist,
          x,
          y,
        };
      }

      if (dist <= tapSlop && elapsed <= tapMaxMs) {
        return { kind: "tap", x, y };
      }

      return null;
    },

    pointerCancel(id) {
      pointers.delete(id);
      longPressFired.delete(id);
      if (pointers.size < 2) pinchStartDistance = null;
    },

    reset() {
      pointers.clear();
      longPressFired.clear();
      pinchStartDistance = null;
    },

    activePointerCount() {
      return pointers.size;
    },
  };
}

/**
 * Map a recognized gesture to a player input impulse (best-effort defaults).
 * Swipe-up → jump; other gestures are returned for custom handlers.
 */
export function gestureToJumpImpulse(gesture: RecognizedGesture | null): boolean {
  return gesture?.kind === "swipe" && gesture.direction === "up";
}
