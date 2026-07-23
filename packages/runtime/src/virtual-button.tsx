import React, { useRef, useState } from "react";
import { PanResponder, Text, View, type ViewStyle } from "react-native";

export type VirtualButtonProps = {
  /** Short label drawn on the button (e.g. "A", "Jump"). */
  label: string;
  /** Called when the button is pressed. */
  onPressIn: () => void;
  /** Called when the button is released. */
  onPressOut: () => void;
  /** Diameter in px. Default 64. */
  size?: number;
  /** Opacity (0..1). Default 0.55. */
  opacity?: number;
  /** Absolute positioning style overrides. */
  style?: ViewStyle;
  /** Accent color when pressed. Default cyan. */
  accent?: string;
  /** Accessibility label. */
  accessibilityLabel?: string;
};

/**
 * Circular on-screen action button. Uses its own PanResponder so it can be
 * pressed simultaneously with the VirtualJoystick (multi-touch).
 */
export function VirtualButton({
  label,
  onPressIn,
  onPressOut,
  size = 64,
  opacity = 0.55,
  style,
  accent = "#00f0ff",
  accessibilityLabel,
}: VirtualButtonProps): React.ReactElement {
  const [pressed, setPressed] = useState(false);
  const pressedRef = useRef(false);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        if (pressedRef.current) return;
        pressedRef.current = true;
        setPressed(true);
        onPressIn();
      },
      onPanResponderRelease: () => {
        if (!pressedRef.current) return;
        pressedRef.current = false;
        setPressed(false);
        onPressOut();
      },
      onPanResponderTerminate: () => {
        if (!pressedRef.current) return;
        pressedRef.current = false;
        setPressed(false);
        onPressOut();
      },
    }),
  ).current;

  const half = size / 2;
  const bgAlpha = pressed ? opacity + 0.25 : opacity;
  const borderAlpha = pressed ? 0.95 : 0.55;

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: pressed }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: pressed
            ? `rgba(0,240,255,${Math.min(0.55, bgAlpha)})`
            : `rgba(255,255,255,${bgAlpha * 0.35})`,
          borderWidth: 2,
          borderColor: pressed
            ? accent
            : `rgba(255,255,255,${borderAlpha})`,
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
        },
        style,
      ]}
      {...responder.panHandlers}
    >
      <Text
        style={{
          color: pressed ? accent : "rgba(255,255,255,0.92)",
          fontSize: Math.max(11, size * 0.22),
          fontWeight: "700",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
