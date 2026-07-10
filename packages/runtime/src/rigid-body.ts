import type { RigidBodyComponent, Vector2 } from "@gamekit/schema";

export type RigidBodyState = {
  velocity: Vector2;
  angularVelocity: number;
  sleeping: boolean;
  sleepTimer: number;
};

const FIXED_DT = 1 / 60;
export const RIGID_BODY_SLEEP_DELAY = 0.5;
export const RIGID_BODY_SLEEP_LINEAR_THRESHOLD = 0.05;
export const RIGID_BODY_SLEEP_ANGULAR_THRESHOLD = 0.05;

export function createRigidBody(component: RigidBodyComponent): {
  state: RigidBodyState;
  component: RigidBodyComponent;
  integrateForces(dt: number, gravity: Vector2): void;
  applyImpulse(impulse: Vector2): void;
  applyForce(force: Vector2, dt: number): void;
  integratePosition(position: Vector2, dt: number): Vector2;
  updateSleep(dt: number, supported: boolean): void;
  wake(): void;
  sleep(): void;
} {
  const state: RigidBodyState = {
    velocity: { ...component.velocity },
    angularVelocity: component.angularVelocity,
    sleeping: false,
    sleepTimer: 0,
  };

  function integrateForces(dt: number, gravity: Vector2): void {
    if (component.isKinematic || state.sleeping) return;

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
    if (impulse.x !== 0 || impulse.y !== 0) wake();
    state.velocity.x += impulse.x / component.mass;
    state.velocity.y += impulse.y / component.mass;
  }

  function applyForce(force: Vector2, dt: number): void {
    if (component.isKinematic) return;
    if (force.x !== 0 || force.y !== 0) wake();
    state.velocity.x += (force.x / component.mass) * dt;
    state.velocity.y += (force.y / component.mass) * dt;
  }

  function integratePosition(position: Vector2, dt: number): Vector2 {
    if (state.sleeping) return { ...position };
    return {
      x: position.x + state.velocity.x * dt,
      y: position.y + state.velocity.y * dt,
    };
  }

  function updateSleep(dt: number, supported: boolean): void {
    if (component.isKinematic || !supported) {
      state.sleepTimer = 0;
      return;
    }

    const linearSpeedSq = state.velocity.x * state.velocity.x + state.velocity.y * state.velocity.y;
    const belowThreshold = linearSpeedSq <= RIGID_BODY_SLEEP_LINEAR_THRESHOLD ** 2
      && Math.abs(state.angularVelocity) <= RIGID_BODY_SLEEP_ANGULAR_THRESHOLD;

    if (!belowThreshold) {
      state.sleepTimer = 0;
      state.sleeping = false;
      return;
    }

    state.sleepTimer += dt;
    if (state.sleepTimer >= RIGID_BODY_SLEEP_DELAY) sleep();
  }

  function wake(): void {
    state.sleeping = false;
    state.sleepTimer = 0;
  }

  function sleep(): void {
    if (component.isKinematic) return;
    state.sleeping = true;
    state.sleepTimer = RIGID_BODY_SLEEP_DELAY;
    state.velocity = { x: 0, y: 0 };
    state.angularVelocity = 0;
  }

  return { state, component, integrateForces, applyImpulse, applyForce, integratePosition, updateSleep, wake, sleep };
}

export const RIGID_BODY_FIXED_DT = FIXED_DT;
