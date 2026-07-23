import { useRef, useCallback } from "react";
import type { PlayerControllerInput } from "./player.js";

export type ExtendedPlayerInput = PlayerControllerInput & {
  fire: boolean;
  action: boolean;
};

export function usePlayerInput(): {
  inputRef: React.MutableRefObject<ExtendedPlayerInput>;
  setLeft: (pressed: boolean) => void;
  setRight: (pressed: boolean) => void;
  setJump: (pressed: boolean) => void;
  setFire: (pressed: boolean) => void;
  setAction: (pressed: boolean) => void;
} {
  const inputRef = useRef<ExtendedPlayerInput>({
    left: false,
    right: false,
    jump: false,
    fire: false,
    action: false,
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

  const setFire = useCallback((pressed: boolean) => {
    inputRef.current.fire = pressed;
  }, []);

  const setAction = useCallback((pressed: boolean) => {
    inputRef.current.action = pressed;
  }, []);

  return { inputRef, setLeft, setRight, setJump, setFire, setAction };
}
