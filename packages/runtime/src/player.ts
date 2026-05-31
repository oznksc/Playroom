import type { PlayerControllerComponent, Vector2 } from "@gamekit/schema";

export type PlayerControllerInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

export type PlayerControllerState = {
  velocity: Vector2;
  grounded: boolean;
};

export function createPlayerController(component: PlayerControllerComponent) {
  const state: PlayerControllerState = {
    velocity: { x: 0, y: 0 },
    grounded: false
  };

  return {
    state,
    update(input: PlayerControllerInput, deltaSeconds: number): PlayerControllerState {
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
