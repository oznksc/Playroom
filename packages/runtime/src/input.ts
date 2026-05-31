import { useRef, useCallback } from "react";
import type { PlayerControllerInput } from "./player.js";

export function usePlayerInput(): {
  inputRef: React.MutableRefObject<PlayerControllerInput>;
  setLeft: (pressed: boolean) => void;
  setRight: (pressed: boolean) => void;
  setJump: (pressed: boolean) => void;
} {
  const inputRef = useRef<PlayerControllerInput>({
    left: false,
    right: false,
    jump: false,
  });

  const setLeft = useCallback((pressed: boolean) => {
    inputRef.current.left = pressed;
  }, []);

  const setRight = useCallback((pressed: boolean) => {
    inputRef.current.right = pressed;
  }, []);

  const setJump = useCallback((pressed: boolean) => {
    inputRef.current.jump = pressed;
  }, []);

  return { inputRef, setLeft, setRight, setJump };
}