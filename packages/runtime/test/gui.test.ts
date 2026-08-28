import { describe, it, expect } from "vitest";
import { offsetGuiNode, guiNodeOrigin } from "../src/gui.js";
import type { GuiNode, GuiComponentInstance } from "@gamekit/schema";

describe("gui helpers", () => {
  it("offsets a node by the instance position", () => {
    const node: GuiNode = {
      type: "Text",
      id: "t1",
      x: 10,
      y: 20,
      width: 100,
      height: 24,
      text: "Hello",
    };
    const instance: GuiComponentInstance = { id: "inst", componentId: "c", x: 50, y: 5 };
    const out = offsetGuiNode(node, instance);
    expect(out.x).toBe(60);
    expect(out.y).toBe(25);
    expect(out.text).toBe("Hello");
  });

  it("applies per-node overrides on top of the offset", () => {
    const node: GuiNode = {
      type: "Button",
      id: "b1",
      x: 0,
      y: 0,
      width: 80,
      height: 32,
      text: "Go",
    };
    const instance: GuiComponentInstance = {
      id: "inst",
      componentId: "c",
      x: 100,
      y: 200,
      nodeOverrides: { b1: { text: "Stop", width: 120, color: "#ff0000" } },
    };
    const out = offsetGuiNode(node, instance);
    expect(out.x).toBe(100);
    expect(out.y).toBe(200);
    expect(out.text).toBe("Stop");
    expect(out.width).toBe(120);
    expect(out.color).toBe("#ff0000");
  });

  it("computes the top-left origin with default anchor (0, 0)", () => {
    const node: GuiNode = {
      type: "Text",
      id: "t1",
      x: 30,
      y: 40,
      width: 100,
      height: 24,
      text: "Hi",
    };
    expect(guiNodeOrigin(node)).toEqual({ x: 30, y: 40 });
  });

  it("shifts the origin for a center anchor (0.5, 0.5)", () => {
    const node: GuiNode = {
      type: "Button",
      id: "b1",
      x: 200,
      y: 100,
      width: 100,
      height: 50,
      text: "Go",
      anchorX: 0.5,
      anchorY: 0.5,
    };
    expect(guiNodeOrigin(node)).toEqual({ x: 150, y: 75 });
  });

  it("shifts the origin for a right/bottom anchor (1, 1)", () => {
    const node: GuiNode = {
      type: "Image",
      id: "i1",
      x: 300,
      y: 200,
      width: 100,
      height: 50,
      assetId: "img",
      anchorX: 1,
      anchorY: 1,
    };
    expect(guiNodeOrigin(node)).toEqual({ x: 200, y: 150 });
  });
});
