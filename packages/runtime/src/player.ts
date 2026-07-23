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

export function createPlayerController(component: PlayerControllerComponent) {
  const state: PlayerControllerState = {
    velocity: { x: 0, y: 0 },
    grounded: false
  };

  return {
    state,
    update(input: PlayerControllerInput, deltaSeconds: number): PlayerControllerState {
      if (isTopDownController(component)) {
        const dx = Number(input.right) - Number(input.left);
        // jumpVelocity 0 + jump key ⇒ treat jump as "up" for legacy top-down skills
        const up =
          Boolean(input.up) || (component.jumpVelocity === 0 && input.jump);
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

      const direction = Number(input.right) - Number(input.left);
      state.velocity.x = direction * component.speed;
      state.velocity.y += component.gravity * deltaSeconds;

      if (input.jump && state.grounded) {
        state.velocity.y = -component.jumpVelocity;
        state.grounded = false;
      }

      return state;
    },
    setGrounded(grounded: boolean): void {
      state.grounded = grounded;
    }
  };
}
