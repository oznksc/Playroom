import type { InputMapConfig } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";
import type { PlayerControllerInput } from "./player.js";

export type ResolvedActionKeys = {
  left: string[];
  right: string[];
  jump: string[];
};

export function resolveActionKeys(inputMap?: InputMapConfig): ResolvedActionKeys {
  const map = inputMap?.bindings?.length ? inputMap : DEFAULT_INPUT_MAP;
  const left: string[] = [];
  const right: string[] = [];
  const jump: string[] = [];

  for (const binding of map.bindings) {
    const action = binding.action;
    if (action === "move_left" || binding.touchControl === "left") {
      left.push(...binding.keys);
    } else if (action === "move_right" || binding.touchControl === "right") {
      right.push(...binding.keys);
    } else if (action === "jump" || binding.touchControl === "jump") {
      jump.push(...binding.keys);
    }
  }

  return {
    left: left.length ? left : DEFAULT_INPUT_MAP.bindings[0].keys,
    right: right.length ? right : DEFAULT_INPUT_MAP.bindings[1].keys,
    jump: jump.length ? jump : DEFAULT_INPUT_MAP.bindings[2].keys,
  };
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
  };
}
