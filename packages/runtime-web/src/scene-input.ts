import Phaser from "phaser";
import type { InputMapConfig } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";

export type SceneInputKeys = {
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  jump: Phaser.Input.Keyboard.Key[];
};

export function configureSceneKeyboard(
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null,
  inputMap?: InputMapConfig,
): SceneInputKeys {
  if (!keyboard) return { left: [], right: [], jump: [] };
  const map = inputMap ?? DEFAULT_INPUT_MAP;
  const byAction = (action: string) => map.bindings.find((binding) => binding.action === action)?.keys ?? [];
  const toCodes = (keys: string[]) => keys.flatMap((key) => {
    if (key === " " || key === "Space" || key === "Spacebar") return [Phaser.Input.Keyboard.KeyCodes.SPACE];
    if (key === "ArrowLeft") return [Phaser.Input.Keyboard.KeyCodes.LEFT];
    if (key === "ArrowRight") return [Phaser.Input.Keyboard.KeyCodes.RIGHT];
    if (key === "ArrowUp") return [Phaser.Input.Keyboard.KeyCodes.UP];
    if (key === "ArrowDown") return [Phaser.Input.Keyboard.KeyCodes.DOWN];
    if (key.length === 1) {
      const code = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[key.toUpperCase()];
      return typeof code === "number" ? [code] : [];
    }
    return [];
  }).filter((code, index, codes) => codes.indexOf(code) === index);
  const left = byAction("move_left").length ? byAction("move_left") : ["ArrowLeft", "a", "A"];
  const right = byAction("move_right").length ? byAction("move_right") : ["ArrowRight", "d", "D"];
  const jump = byAction("jump").length ? byAction("jump") : ["ArrowUp", " ", "w", "W"];
  return {
    left: toCodes(left).map((code) => keyboard.addKey(code)),
    right: toCodes(right).map((code) => keyboard.addKey(code)),
    jump: toCodes(jump).map((code) => keyboard.addKey(code)),
  };
}
