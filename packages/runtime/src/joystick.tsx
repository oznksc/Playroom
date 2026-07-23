import React, { useCallback, useRef, useState } from "react";
import { PanResponder, View } from "react-native";

export type VirtualJoystickProps = {
  /** Called with normalized x,y (-1..1) each frame during active touch. */
  onMove: (x: number, y: number) => void;
  /** Called when touch ends. */
  onRelease: () => void;
  /** Diameter of the joystick base in px. Default 120. */
  size?: number;
  /** Maximum thumb travel radius from center. Default 40. */
  travel?: number;
  /** Opacity of the joystick (0..1). Default 0.6. */
  opacity?: number;
};

export function VirtualJoystick({
  onMove,
  onRelease,
  size = 120,
  travel = 40,
  opacity = 0.6,
}: VirtualJoystickProps): React.ReactElement {
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const centerRef = useRef({ x: 0, y: 0 });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep stick capture so multi-touch buttons on the other side stay independent
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (_, gesture) => {
        centerRef.current = { x: gesture.x0, y: gesture.y0 };
        setActive(true);
        setThumb({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        const dx = gesture.moveX - centerRef.current.x;
        const dy = gesture.moveY - centerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampDist = Math.min(dist, travel);
        const angle = Math.atan2(dy, dx);

        const nx = (clampDist / travel) * Math.cos(angle);
        const ny = (clampDist / travel) * Math.sin(angle);

        setThumb({ x: nx * travel, y: ny * travel });
        onMove(nx, ny);
      },
      onPanResponderRelease: () => {
        setActive(false);
        setThumb({ x: 0, y: 0 });
        onRelease();
      },
      onPanResponderTerminate: () => {
        setActive(false);
        setThumb({ x: 0, y: 0 });
        onRelease();
      },
    })
  ).current;

  const half = size / 2;
  const outerStyle = {
    width: size,
    height: size,
    borderRadius: half,
    backgroundColor: `rgba(255,255,255,${active ? opacity : opacity * 0.4})`,
    borderWidth: 2,
    borderColor: `rgba(255,255,255,${active ? opacity * 1.5 : opacity * 0.6})`,
    position: "absolute" as const,
    bottom: 40,
    left: 24,
  };

  const thumbSize = size * 0.36;
  const thumbStyle = {
    width: thumbSize,
    height: thumbSize,
    borderRadius: thumbSize / 2,
    backgroundColor: `rgba(255,255,255,${active ? 0.9 : 0.5})`,
    position: "absolute" as const,
    left: half + thumb.x - thumbSize / 2,
    top: half + thumb.y - thumbSize / 2,
  };

  return (
    <View style={outerStyle} {...responder.panHandlers}>
      <View style={thumbStyle} />
    </View>
  );
}
