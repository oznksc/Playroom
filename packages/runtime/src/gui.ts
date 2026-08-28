import type { GuiNode, GuiComponentInstance } from "@gamekit/schema";

/**
 * Compose a GUI node with its owning instance: translate by the instance's
 * (x, y) and overlay any per-node overrides. Shared across Skia, Phaser, and
 * the editor canvas so all three render the same effective node.
 */
export function offsetGuiNode(node: GuiNode, instance: GuiComponentInstance): GuiNode {
  const overrides = instance.nodeOverrides?.[node.id] as Record<string, unknown> | undefined;
  const base = { ...node, x: node.x + instance.x, y: node.y + instance.y };
  if (!overrides) return base as GuiNode;
  const { id: _id, type: _type, ...safe } = overrides;
  return { ...base, ...safe } as GuiNode;
}

/**
 * Top-left origin of a GUI node's box, honoring `anchorX`/`anchorY` as
 * 0..1 fractions (0 = left/top edge, 0.5 = center, 1 = right/bottom edge).
 * Default (unset) is 0, i.e. `x`/`y` is the top-left corner.
 */
export function guiNodeOrigin(node: GuiNode): { x: number; y: number } {
  return {
    x: node.x - node.width * (node.anchorX ?? 0),
    y: node.y - node.height * (node.anchorY ?? 0),
  };
}
