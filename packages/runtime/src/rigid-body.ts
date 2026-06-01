import type { RigidBodyComponent, Vector2 } from "@gamekit/schema";

export type RigidBodyState = {
  velocity: Vector2;
  angularVelocity: number;
};

const FIXED_DT = 1 / 60;

export function createRigidBody(component: RigidBodyComponent): {
  state: RigidBodyState;
  component: RigidBodyComponent;
  integrateForces(dt: number, gravity: Vector2): void;
  applyImpulse(impulse: Vector2): void;
  applyForce(force: Vector2, dt: number): void;
  integratePosition(position: Vector2, dt: number): Vector2;
} {
  const state: RigidBodyState = {
    velocity: { ...component.velocity },
    angularVelocity: component.angularVelocity,
  };

  function integrateForces(dt: number, gravity: Vector2): void {
    if (component.isKinematic) return;

    if (component.useGravity) {
      state.velocity.x += gravity.x * component.gravityScale * dt;
      state.velocity.y += gravity.y * component.gravityScale * dt;
    }

    if (component.drag > 0) {
      const dragFactor = Math.pow(1 - component.drag, dt * 60);
      state.velocity.x *= dragFactor;
      state.velocity.y *= dragFactor;
    }
  }

  function applyImpulse(impulse: Vector2): void {
    if (component.isKinematic) return;
    state.velocity.x += impulse.x / component.mass;
    state.velocity.y += impulse.y / component.mass;
  }

  function applyForce(force: Vector2, dt: number): void {
    if (component.isKinematic) return;
    state.velocity.x += (force.x / component.mass) * dt;
    state.velocity.y += (force.y / component.mass) * dt;
  }

  function integratePosition(position: Vector2, dt: number): Vector2 {
    return {
      x: position.x + state.velocity.x * dt,
      y: position.y + state.velocity.y * dt,
    };
  }

  return { state, component, integrateForces, applyImpulse, applyForce, integratePosition };
}

export const RIGID_BODY_FIXED_DT = FIXED_DT;
