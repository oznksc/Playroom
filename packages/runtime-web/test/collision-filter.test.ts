import { describe, expect, it } from "vitest";
import { createEntity } from "@gamekit/schema";
import { colliderLayerMask, solidCollides, triggerOverlaps } from "../src/collision-filter.js";

describe("colliderLayerMask", () => {
  it("defaults to layer 1 / all-ones mask when no collider fields are set", () => {
    const entity = createEntity("Bare", { x: 0, y: 0 });
    entity.components.push({ type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 8, y: 8 }, isStatic: false });
    expect(colliderLayerMask(entity)).toEqual({ layer: 1, mask: 0xffffffff });
  });

  it("reads explicit layer and mask", () => {
    const entity = createEntity("Filtered", { x: 0, y: 0 });
    entity.components.push({ type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 4, isStatic: false, isTrigger: false, layer: 2, mask: 6 });
    expect(colliderLayerMask(entity)).toEqual({ layer: 2, mask: 6 });
  });
});

describe("solidCollides", () => {
  it("collides when the dynamic mask includes the static layer", () => {
    expect(solidCollides(1, 1)).toBe(true);
    expect(solidCollides(3, 2)).toBe(true);
  });

  it("ignores statics outside the dynamic mask", () => {
    expect(solidCollides(1, 2)).toBe(false);
    expect(solidCollides(0, 1)).toBe(false);
  });
});

describe("triggerOverlaps", () => {
  it("requires both masks to accept the other's layer", () => {
    const player = { layer: 1, mask: 1 };
    const trigger = { layer: 2, mask: 2 };
    // Trigger mask (2) does not include player layer (1).
    expect(triggerOverlaps(player, trigger)).toBe(false);
    // Both accept each other's layer.
    expect(triggerOverlaps({ layer: 1, mask: 3 }, { layer: 2, mask: 1 })).toBe(true);
  });
});
