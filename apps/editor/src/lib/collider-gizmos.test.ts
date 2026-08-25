import { describe, expect, it } from "vitest";
import { colliderCenter, colliderGizmoStyle, layerMaskLabel } from "./collider-gizmos.js";

describe("collider gizmos", () => {
  it("uses green solids and blue triggers, gold when selected", () => {
    const solid = colliderGizmoStyle({ isTrigger: false, isStatic: false, selected: false });
    const trigger = colliderGizmoStyle({ isTrigger: true, isStatic: false, selected: false });
    const selected = colliderGizmoStyle({ isTrigger: true, isStatic: true, selected: true });
    expect(solid.kind).toBe("solid");
    expect(solid.dash).toEqual([]);
    expect(solid.stroke).toMatch(/#34d399/i);
    expect(trigger.kind).toBe("trigger");
    expect(trigger.dash.length).toBeGreaterThan(0);
    expect(trigger.badge).toBe("T");
    expect(selected.stroke).toMatch(/#ffb300/i);
    expect(selected.badge).toBe("TS");
  });

  it("labels layer/mask and AABB center from offset+size", () => {
    expect(layerMaskLabel(2, 5)).toBe("L2·M5");
    expect(layerMaskLabel(undefined, undefined)).toBe("L1·M1");
    expect(colliderCenter({ x: -32, y: -16 }, { x: 64, y: 32 })).toEqual({ x: 0, y: 0 });
  });
});
