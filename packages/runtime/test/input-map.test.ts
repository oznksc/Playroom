import { describe, expect, it } from "vitest";
import {
  resolveActionKeys,
  extendedInputFromPressedKeys,
  mergeGamepadIntoInput,
} from "../src/input-map.js";
import type { GamepadSnapshot } from "../src/gamepad.js";

describe("input map", () => {
  it("resolves default left/right/jump keys", () => {
    const keys = resolveActionKeys();
    expect(keys.left).toContain("a");
    expect(keys.right).toContain("d");
    expect(keys.jump).toContain(" ");
  });

  it("resolves fire/action from bindings", () => {
    const keys = resolveActionKeys({
      bindings: [
        { action: "fire", keys: ["j", "J"], touchControl: "fire" },
        { action: "action", keys: ["k"], touchControl: "action" },
      ],
    });
    expect(keys.fire).toEqual(["j", "J"]);
    expect(keys.action).toEqual(["k"]);
  });

  it("builds extended input from pressed keys", () => {
    const input = extendedInputFromPressedKeys(new Set(["a", "j"]), {
      bindings: [
        { action: "move_left", keys: ["a"], touchControl: "left" },
        { action: "fire", keys: ["j"], touchControl: "fire" },
      ],
    });
    expect(input.left).toBe(true);
    expect(input.fire).toBe(true);
    expect(input.jump).toBe(false);
  });

  it("merges gamepad A into jump", () => {
    const base = { left: false, right: false, jump: false, fire: false, action: false };
    const snapshot: GamepadSnapshot = {
      connected: true,
      buttons: { A: true },
      axes: {},
    };
    const merged = mergeGamepadIntoInput(base, undefined, snapshot);
    expect(merged.jump).toBe(true);
  });
});
