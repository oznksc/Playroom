import { describe, expect, it } from "vitest";
import { createEntity } from "@gamekit/schema";
import { pivotTransform } from "../src/transform.js";

function transformOf(name: string, rotation: number, scale: { x: number; y: number }) {
  const entity = createEntity(name, { x: 50, y: 60 });
  const transform = entity.components.find((c) => c.type === "Transform")!;
  transform.rotation = rotation;
  transform.scale = scale;
  return transform;
}

describe("pivotTransform", () => {
  it("emits translate-to-pivot and translate-back when transform is identity", () => {
    const t = pivotTransform(transformOf("Idle", 0, { x: 1, y: 1 }), 50, 60);
    expect(t).toEqual([
      { translateX: 50 },
      { translateY: 60 },
      { translateX: -50 },
      { translateY: -60 },
    ]);
  });

  it("inserts rotate between the pivot translates when rotation is set", () => {
    const t = pivotTransform(transformOf("Spinner", 90, { x: 1, y: 1 }), 10, 20);
    expect(t).toEqual([
      { translateX: 10 },
      { translateY: 20 },
      { rotate: Math.PI / 2 },
      { translateX: -10 },
      { translateY: -20 },
    ]);
  });

  it("inserts scaleX/scaleY before rotate when both are set", () => {
    const t = pivotTransform(transformOf("Big", 180, { x: 2, y: 0.5 }), 30, 40);
    expect(t).toEqual([
      { translateX: 30 },
      { translateY: 40 },
      { rotate: Math.PI },
      { scaleX: 2 },
      { scaleY: 0.5 },
      { translateX: -30 },
      { translateY: -40 },
    ]);
  });
});
