import Phaser from "phaser";
import type { InputMapConfig } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";
import type { PlayerControllerInput } from "@gamekit/runtime/player";
import { mergeGamepadIntoInput } from "@gamekit/runtime/input-map";
import { pollGamepad } from "@gamekit/runtime/gamepad";

/** Keyboard/gamepad input extended with fire/action (mirrors runtime ExtendedPlayerInput). */
type ExtendedPlayerInput = PlayerControllerInput & {
  fire: boolean;
  action: boolean;
};

export type SceneInputKeys = {
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  jump: Phaser.Input.Keyboard.Key[];
  fire: Phaser.Input.Keyboard.Key[];
  action: Phaser.Input.Keyboard.Key[];
};

function byAction(map: InputMapConfig, action: string): string[] {
  return map.bindings.find((binding) => binding.action === action)?.keys ?? [];
}

function toCodes(keys: string[]): number[] {
  return keys
    .flatMap((key) => {
      if (key === " " || key === "Space" || key === "Spacebar") {
        return [Phaser.Input.Keyboard.KeyCodes.SPACE];
      }
      if (key === "ArrowLeft") return [Phaser.Input.Keyboard.KeyCodes.LEFT];
      if (key === "ArrowRight") return [Phaser.Input.Keyboard.KeyCodes.RIGHT];
      if (key === "ArrowUp") return [Phaser.Input.Keyboard.KeyCodes.UP];
      if (key === "ArrowDown") return [Phaser.Input.Keyboard.KeyCodes.DOWN];
      if (key.length === 1) {
        const code = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[key.toUpperCase()];
        return typeof code === "number" ? [code] : [];
      }
      return [];
    })
    .filter((code, index, codes) => codes.indexOf(code) === index);
}

export function configureSceneKeyboard(
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null,
  inputMap?: InputMapConfig,
): SceneInputKeys {
  if (!keyboard) {
    return { left: [], right: [], up: [], down: [], jump: [], fire: [], action: [] };
  }
  const map = inputMap ?? DEFAULT_INPUT_MAP;
  const left = byAction(map, "move_left").length ? byAction(map, "move_left") : ["ArrowLeft", "a", "A"];
  const right = byAction(map, "move_right").length ? byAction(map, "move_right") : ["ArrowRight", "d", "D"];
  const up = byAction(map, "move_up");
  const down = byAction(map, "move_down");
  const jump = byAction(map, "jump").length ? byAction(map, "jump") : ["ArrowUp", " ", "w", "W"];
  const fire = byAction(map, "fire");
  const action = byAction(map, "action");
  return {
    left: toCodes(left).map((code) => keyboard.addKey(code)),
    right: toCodes(right).map((code) => keyboard.addKey(code)),
    up: toCodes(up).map((code) => keyboard.addKey(code)),
    down: toCodes(down).map((code) => keyboard.addKey(code)),
    jump: toCodes(jump).map((code) => keyboard.addKey(code)),
    fire: toCodes(fire).map((code) => keyboard.addKey(code)),
    action: toCodes(action).map((code) => keyboard.addKey(code)),
  };
}

export type TouchButtons = {
  jump: boolean;
  fire: boolean;
  action: boolean;
  dx: number;
  dy: number;
};

/** Build player input from keyboard + touch buttons + gamepad. */
export function resolveScenePlayerInput(
  keys: SceneInputKeys,
  touch: TouchButtons,
  inputMap?: InputMapConfig,
): ExtendedPlayerInput {
  const base: ExtendedPlayerInput = {
    left: keys.left.some((k) => k.isDown) || touch.dx < -0.3,
    right: keys.right.some((k) => k.isDown) || touch.dx > 0.3,
    up: keys.up.some((k) => k.isDown) || touch.dy < -0.3,
    down: keys.down.some((k) => k.isDown) || touch.dy > 0.3,
    jump: keys.jump.some((k) => k.isDown) || touch.jump || touch.dy < -0.5,
    fire: keys.fire.some((k) => k.isDown) || touch.fire,
    action: keys.action.some((k) => k.isDown) || touch.action,
  };
  return mergeGamepadIntoInput(base, inputMap, pollGamepad());
}
