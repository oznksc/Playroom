import type { PlayerControllerComponent, Vector2 } from "@gamekit/schema";

export type PlayerControllerInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
  /** Top-down vertical (optional; ignored in platformer mode). */
  up?: boolean;
  down?: boolean;
};

export type PlayerControllerState = {
  velocity: Vector2;
  grounded: boolean;
};

/** Zero gravity ⇒ free 4-way movement instead of jump/fall. */
export function isTopDownController(component: PlayerControllerComponent): boolean {
  return component.gravity === 0;
}

/** Frames of grace after leaving a platform during which a jump still counts (coyote time). */
export const COYOTE_GRACE_FRAMES = 4;
/** Frames a jump press stays buffered so a jump just before landing still fires. */
export const JUMP_BUFFER_FRAMES = 6;
/** Horizontal speed multiplier while airborne (less air control). */
export const AIR_CONTROL = 0.85;
/** Floor for the upward velocity cap; anything above jumpVelocity is kept. */
export const MAX_UP_VELOCITY_FLOOR = 200;

export function createPlayerController(component: PlayerControllerComponent) {
  const state: PlayerControllerState = {
    velocity: { x: 0, y: 0 },
    grounded: false,
  };
  let groundedGraceFrames = 0;
  let jumpBufferFrames = 0;
  let jumpHeldLastFrame = false;

  return {
    state,
    update(input: PlayerControllerInput, deltaSeconds: number): PlayerControllerState {
      if (isTopDownController(component)) {
        const dx = Number(input.right) - Number(input.left);
        // jumpVelocity 0 + jump key ⇒ treat jump as "up" for legacy top-down skills
        const up = Boolean(input.up) || (component.jumpVelocity === 0 && input.jump);
        const down = Boolean(input.down);
        const dy = Number(down) - Number(up);
        let vx = dx * component.speed;
        let vy = dy * component.speed;
        if (dx !== 0 && dy !== 0) {
          const inv = 1 / Math.SQRT2;
          vx *= inv;
          vy *= inv;
        }
        state.velocity.x = vx;
        state.velocity.y = vy;
        return state;
      }

      // Coyote time: keep "grounded" for a short window after leaving the floor.
      const touchingGround = state.grounded;
      if (touchingGround) {
        groundedGraceFrames = COYOTE_GRACE_FRAMES;
      } else if (groundedGraceFrames > 0) {
        groundedGraceFrames -= 1;
      }
      state.grounded = touchingGround || groundedGraceFrames > 0;

      // Edge-triggered jump: holding the key must not re-apply the impulse.
      const jumpPressed = input.jump && !jumpHeldLastFrame;
      jumpHeldLastFrame = input.jump;
      if (jumpPressed) {
        jumpBufferFrames = JUMP_BUFFER_FRAMES;
      } else if (jumpBufferFrames > 0) {
        jumpBufferFrames -= 1;
      }

      const direction = Number(input.right) - Number(input.left);
      const moveSpeed = touchingGround ? component.speed : component.speed * AIR_CONTROL;
      state.velocity.x = direction * moveSpeed;
      state.velocity.y += component.gravity * deltaSeconds;

      // Kill downward residual velocity when standing on floor (stops Y jitter / bounce loop).
      if (touchingGround && state.velocity.y > 0 && !jumpPressed) {
        state.velocity.y = 0;
      }

      // Jump only when actually on the ground (or coyote grace), respecting the buffer.
      if (jumpBufferFrames > 0 && state.grounded) {
        state.velocity.y = -component.jumpVelocity;
        jumpBufferFrames = 0;
        groundedGraceFrames = 0;
      }

      // Cap upward speed so a bad impulse can never fling the player off-screen.
      const maxUp = Math.max(component.jumpVelocity, MAX_UP_VELOCITY_FLOOR);
      if (state.velocity.y < -maxUp) {
        state.velocity.y = -maxUp;
      }

      return state;
    },
    setGrounded(grounded: boolean): void {
      state.grounded = grounded;
    },
  };
}
