import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import type { InputMapConfig, TouchControl } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";
import { VirtualJoystick } from "./joystick.js";
import { VirtualButton } from "./virtual-button.js";

export type VirtualControlActions = {
  setLeft: (pressed: boolean) => void;
  setRight: (pressed: boolean) => void;
  setJump: (pressed: boolean) => void;
  setFire?: (pressed: boolean) => void;
  setAction?: (pressed: boolean) => void;
};

export type VirtualControlsProps = {
  inputMap?: InputMapConfig;
  actions: VirtualControlActions;
  /** When true, upward joystick tilt also triggers jump (legacy). Default false — use Jump button. */
  joystickJump?: boolean;
};

type ButtonSpec = {
  control: Extract<TouchControl, "jump" | "fire" | "action">;
  label: string;
  bottom: number;
  right: number;
  size: number;
};

const BUTTON_LAYOUT: ButtonSpec[] = [
  { control: "jump", label: "A", bottom: 48, right: 28, size: 72 },
  { control: "fire", label: "B", bottom: 100, right: 100, size: 60 },
  { control: "action", label: "X", bottom: 48, right: 120, size: 56 },
];

function resolveTouchButtons(inputMap?: InputMapConfig): Set<TouchControl> {
  const map = inputMap?.bindings?.length ? inputMap : DEFAULT_INPUT_MAP;
  const set = new Set<TouchControl>();
  for (const binding of map.bindings) {
    if (binding.touchControl) set.add(binding.touchControl);
  }
  // Always show jump if nothing else mapped (platformer default)
  if (!set.has("jump") && !set.has("fire") && !set.has("action")) {
    set.add("jump");
  }
  return set;
}

/**
 * Mobile virtual control overlay: analog stick (left) + action buttons (right).
 * Each control owns its own responder so joystick + buttons work with multi-touch.
 */
export function VirtualControls({
  inputMap,
  actions,
  joystickJump = false,
}: VirtualControlsProps): React.ReactElement {
  const touchButtons = useMemo(() => resolveTouchButtons(inputMap), [inputMap]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <VirtualJoystick
        onMove={(x, y) => {
          actions.setLeft(x < -0.3);
          actions.setRight(x > 0.3);
          if (joystickJump) {
            actions.setJump(y < -0.5);
          }
        }}
        onRelease={() => {
          actions.setLeft(false);
          actions.setRight(false);
          if (joystickJump) {
            actions.setJump(false);
          }
        }}
      />

      {BUTTON_LAYOUT.filter((b) => touchButtons.has(b.control)).map((spec) => (
        <VirtualButton
          key={spec.control}
          label={spec.label}
          size={spec.size}
          style={{ bottom: spec.bottom, right: spec.right }}
          accessibilityLabel={spec.control}
          onPressIn={() => {
            if (spec.control === "jump") actions.setJump(true);
            if (spec.control === "fire") actions.setFire?.(true);
            if (spec.control === "action") actions.setAction?.(true);
          }}
          onPressOut={() => {
            if (spec.control === "jump") actions.setJump(false);
            if (spec.control === "fire") actions.setFire?.(false);
            if (spec.control === "action") actions.setAction?.(false);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});
