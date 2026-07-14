import type { MutableRefObject } from "react";

type Pan = { x: number; y: number };

export function resetPlaySession<TCamera, TOutcome extends string>(params: {
  controllers: Map<string, unknown>;
  rigidBodies: Map<string, unknown>;
  animationStates: Map<string, unknown>;
  triggerState: Set<string>;
  collisionState: Set<string>;
  cameraFollowRef: MutableRefObject<TCamera | null>;
  playViewPanRef: MutableRefObject<Pan | null>;
  playOutcomeRef: MutableRefObject<TOutcome>;
  fallCooldownRef: MutableRefObject<number>;
  audioControllerRef: MutableRefObject<{ dispose(): void } | null>;
  setPlayViewPan: (pan: Pan | null) => void;
  setPlayOutcome: (outcome: null) => void;
  setPlayLives: (lives: number | null) => void;
  noneOutcome: TOutcome;
}): void {
  params.controllers.clear();
  params.rigidBodies.clear();
  params.animationStates.clear();
  params.triggerState.clear();
  params.collisionState.clear();
  params.cameraFollowRef.current = null;
  params.playViewPanRef.current = null;
  params.setPlayViewPan(null);
  params.playOutcomeRef.current = params.noneOutcome;
  params.setPlayOutcome(null);
  params.setPlayLives(null);
  params.fallCooldownRef.current = 0;
  params.audioControllerRef.current?.dispose();
  params.audioControllerRef.current = null;
}
