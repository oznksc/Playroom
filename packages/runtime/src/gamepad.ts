/**
 * Lightweight Gamepad API poller (web / environments with navigator.getGamepads).
 * Maps common button names used in schema InputActionBinding.gamepad fields.
 */

export type GamepadSnapshot = {
  connected: boolean;
  buttons: Record<string, boolean>;
  axes: Record<string, number>;
};

const BUTTON_INDEX: Record<string, number> = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

export function isGamepadApiAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";
}

export function pollGamepad(index = 0): GamepadSnapshot {
  const empty: GamepadSnapshot = { connected: false, buttons: {}, axes: {} };
  if (!isGamepadApiAvailable()) return empty;

  const pads = navigator.getGamepads();
  const pad = pads[index];
  if (!pad) return empty;

  const buttons: Record<string, boolean> = {};
  for (const [name, i] of Object.entries(BUTTON_INDEX)) {
    buttons[name] = Boolean(pad.buttons[i]?.pressed);
  }

  const axes: Record<string, number> = {
    LEFT_STICK_X: pad.axes[0] ?? 0,
    LEFT_STICK_Y: pad.axes[1] ?? 0,
    RIGHT_STICK_X: pad.axes[2] ?? 0,
    RIGHT_STICK_Y: pad.axes[3] ?? 0,
  };

  // Convenience signed axis names used in some bindings
  axes.LEFT_STICK_X_NEG = axes.LEFT_STICK_X < -0.35 ? axes.LEFT_STICK_X : 0;
  axes.LEFT_STICK_X_POS = axes.LEFT_STICK_X > 0.35 ? axes.LEFT_STICK_X : 0;
  axes.LEFT_STICK_Y_NEG = axes.LEFT_STICK_Y < -0.35 ? axes.LEFT_STICK_Y : 0;
  axes.LEFT_STICK_Y_POS = axes.LEFT_STICK_Y > 0.35 ? axes.LEFT_STICK_Y : 0;

  return { connected: true, buttons, axes };
}

/** Resolve whether a schema gamepad binding string is currently active. */
export function isGamepadBindingActive(
  binding: string | undefined,
  snapshot: GamepadSnapshot,
  deadzone = 0.35,
): boolean {
  if (!binding || !snapshot.connected) return false;
  const key = binding.toUpperCase();

  if (key in snapshot.buttons) {
    return Boolean(snapshot.buttons[key]);
  }
  if (key in snapshot.axes) {
    const v = snapshot.axes[key] ?? 0;
    if (key.endsWith("_NEG")) return v < -deadzone;
    if (key.endsWith("_POS")) return v > deadzone;
    return Math.abs(v) > deadzone;
  }
  return false;
}
