import type { AnimationComponent } from "@gamekit/schema";

export type AnimationState = {
  currentFrame: number;
  elapsed: number;
};

export function updateAnimation(
  anim: AnimationComponent,
  state: AnimationState,
  dt: number
): number {
  if (anim.frameHeight <= 0 || anim.totalFrames <= 0 || anim.framesPerSecond <= 0) return state.currentFrame;

  state.elapsed += dt;
  const frameDuration = 1 / anim.framesPerSecond;

  while (state.elapsed >= frameDuration) {
    state.elapsed -= frameDuration;
    state.currentFrame++;
    if (state.currentFrame >= anim.totalFrames) {
      state.currentFrame = anim.loop ? 0 : anim.totalFrames - 1;
    }
  }

  return state.currentFrame;
}

export function getFrameSourceRect(
  anim: AnimationComponent,
  frameIndex: number
): { x: number; y: number; width: number; height: number } | undefined {
  if (anim.frameWidth <= 0 || anim.frameHeight <= 0) return undefined;
  return {
    x: frameIndex * anim.frameWidth,
    y: 0,
    width: anim.frameWidth,
    height: anim.frameHeight
  };
}
