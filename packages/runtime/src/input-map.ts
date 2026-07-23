import type { InputMapConfig } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";
import type { PlayerControllerInput } from "./player.js";
import type { ExtendedPlayerInput } from "./input.js";
import { isGamepadBindingActive, type GamepadSnapshot } from "./gamepad.js";

export type ResolvedActionKeys = {
  left: string[];
  right: string[];
  up: string[];
  down: string[];
  jump: string[];
  fire: string[];
  action: string[];
};

export type ResolvedGamepadBindings = {
  left?: string;
  right?: string;
  up?: string;
  down?: string;
  jump?: string;
  fire?: string;
  action?: string;
};

export function resolveActionKeys(inputMap?: InputMapConfig): ResolvedActionKeys {
  const map = inputMap?.bindings?.length ? inputMap : DEFAULT_INPUT_MAP;
  const left: string[] = [];
  const right: string[] = [];
  const up: string[] = [];
  const down: string[] = [];
  const jump: string[] = [];
  const fire: string[] = [];
  const action: string[] = [];

  for (const binding of map.bindings) {
    const actionName = binding.action;
    if (actionName === "move_left" || binding.touchControl === "left") {
      left.push(...binding.keys);
    } else if (actionName === "move_right" || binding.touchControl === "right") {
      right.push(...binding.keys);
    } else if (actionName === "move_up") {
      up.push(...binding.keys);
    } else if (actionName === "move_down") {
      down.push(...binding.keys);
    } else if (actionName === "jump" || binding.touchControl === "jump") {
      jump.push(...binding.keys);
    } else if (actionName === "fire" || binding.touchControl === "fire") {
      fire.push(...binding.keys);
    } else if (actionName === "action" || binding.touchControl === "action") {
      action.push(...binding.keys);
    }
  }

  return {
    left: left.length ? left : DEFAULT_INPUT_MAP.bindings[0]!.keys,
    right: right.length ? right : DEFAULT_INPUT_MAP.bindings[1]!.keys,
    up,
    down,
    jump: jump.length ? jump : DEFAULT_INPUT_MAP.bindings[2]!.keys,
    fire,
    action,
  };
}

export function resolveGamepadBindings(inputMap?: InputMapConfig): ResolvedGamepadBindings {
  const map = inputMap?.bindings?.length ? inputMap : DEFAULT_INPUT_MAP;
  const out: ResolvedGamepadBindings = {};
  for (const binding of map.bindings) {
    if (!binding.gamepad) continue;
    if (binding.action === "move_left" || binding.touchControl === "left") {
      out.left = binding.gamepad;
    } else if (binding.action === "move_right" || binding.touchControl === "right") {
      out.right = binding.gamepad;
    } else if (binding.action === "move_up") {
      out.up = binding.gamepad;
    } else if (binding.action === "move_down") {
      out.down = binding.gamepad;
    } else if (binding.action === "jump" || binding.touchControl === "jump") {
      out.jump = binding.gamepad;
    } else if (binding.action === "fire" || binding.touchControl === "fire") {
      out.fire = binding.gamepad;
    } else if (binding.action === "action" || binding.touchControl === "action") {
      out.action = binding.gamepad;
    }
  }
  // Sensible defaults when schema only has keyboard
  if (!out.jump) out.jump = "A";
  if (!out.left) out.left = "LEFT_STICK_X_NEG";
  if (!out.right) out.right = "LEFT_STICK_X_POS";
  if (!out.up) out.up = "LEFT_STICK_Y_NEG";
  if (!out.down) out.down = "LEFT_STICK_Y_POS";
  return out;
}

export function playerInputFromPressedKeys(
  pressed: ReadonlySet<string> | Iterable<string>,
  inputMap?: InputMapConfig,
): PlayerControllerInput {
  const keys = pressed instanceof Set ? pressed : new Set(pressed);
  const actions = resolveActionKeys(inputMap);
  return {
    left: actions.left.some((k) => keys.has(k)),
    right: actions.right.some((k) => keys.has(k)),
    jump: actions.jump.some((k) => keys.has(k)),
    up: actions.up.some((k) => keys.has(k)),
    down: actions.down.some((k) => keys.has(k)),
  };
}

export function extendedInputFromPressedKeys(
  pressed: ReadonlySet<string> | Iterable<string>,
  inputMap?: InputMapConfig,
): ExtendedPlayerInput {
  const keys = pressed instanceof Set ? pressed : new Set(pressed);
  const actions = resolveActionKeys(inputMap);
  return {
    left: actions.left.some((k) => keys.has(k)),
    right: actions.right.some((k) => keys.has(k)),
    jump: actions.jump.some((k) => keys.has(k)),
    up: actions.up.some((k) => keys.has(k)),
    down: actions.down.some((k) => keys.has(k)),
    fire: actions.fire.some((k) => keys.has(k)),
    action: actions.action.some((k) => keys.has(k)),
  };
}

/** Merge keyboard/touch input with live gamepad snapshot. */
export function mergeGamepadIntoInput(
  base: ExtendedPlayerInput,
  inputMap: InputMapConfig | undefined,
  snapshot: GamepadSnapshot,
): ExtendedPlayerInput {
  const gp = resolveGamepadBindings(inputMap);
  return {
    left: base.left || isGamepadBindingActive(gp.left, snapshot),
    right: base.right || isGamepadBindingActive(gp.right, snapshot),
    jump: base.jump || isGamepadBindingActive(gp.jump, snapshot),
    up: Boolean(base.up) || isGamepadBindingActive(gp.up, snapshot),
    down: Boolean(base.down) || isGamepadBindingActive(gp.down, snapshot),
    fire: base.fire || isGamepadBindingActive(gp.fire, snapshot),
    action: base.action || isGamepadBindingActive(gp.action, snapshot),
  };
}
