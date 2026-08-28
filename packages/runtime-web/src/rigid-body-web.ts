import type { RigidBodyComponent } from "@gamekit/schema";
import {
  RIGID_BODY_SLEEP_DELAY,
  RIGID_BODY_SLEEP_LINEAR_THRESHOLD,
  RIGID_BODY_SLEEP_ANGULAR_THRESHOLD,
} from "@gamekit/runtime/rigid-body";

/**
 * Phaser-side RigidBody adapter. Wraps an Arcade body with the shared
 * RigidBody semantics so script actions (applyImpulse) behave the same way
 * they do on the Skia runtime: `velocity += impulse / mass`, and a no-op for
 * kinematic bodies. Also mirrors the Skia sleeping model: a supported body
 * that stays below the linear/angular thresholds for `RIGID_BODY_SLEEP_DELAY`
 * seconds falls asleep, freezing in place while collisions keep working.
 */
export type PhaserRigidBody = {
  body: {
    velocity: { x: number; y: number };
    setVelocity(x: number, y: number): void;
    moves: boolean;
    angularVelocity: number;
    blocked?: { down: boolean };
    touching?: { down: boolean };
  };
  readonly sleeping: boolean;
  applyImpulse(impulse: { x: number; y: number }): void;
  applyDrag(dt: number): void;
  updateSleep(dt: number, supported: boolean): void;
  wake(): void;
};

export function createPhaserRigidBody(
  body: PhaserRigidBody["body"],
  component: RigidBodyComponent
): PhaserRigidBody {
  let sleepTimer = 0;
  let sleeping = false;

  function wake(): void {
    sleeping = false;
    sleepTimer = 0;
    body.moves = true;
  }

  function applyImpulse(impulse: { x: number; y: number }): void {
    if (component.isKinematic) return;
    if (impulse.x !== 0 || impulse.y !== 0) wake();
    const mass = Math.max(0.001, component.mass);
    body.setVelocity(body.velocity.x + impulse.x / mass, body.velocity.y + impulse.y / mass);
    if (sleeping) body.moves = true;
  }

  function applyDrag(dt: number): void {
    if (sleeping) return;
    if (component.drag <= 0) return;
    const dragFactor = Math.pow(1 - component.drag, dt * 60);
    body.setVelocity(body.velocity.x * dragFactor, body.velocity.y * dragFactor);
  }

  function updateSleep(dt: number, supported: boolean): void {
    if (component.isKinematic || !supported) {
      sleepTimer = 0;
      return;
    }

    const linearSpeedSq = body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y;
    const belowThreshold =
      linearSpeedSq <= RIGID_BODY_SLEEP_LINEAR_THRESHOLD ** 2 &&
      Math.abs(body.angularVelocity) <= RIGID_BODY_SLEEP_ANGULAR_THRESHOLD;

    if (!belowThreshold) {
      sleepTimer = 0;
      return;
    }

    sleepTimer += dt;
    if (sleepTimer >= RIGID_BODY_SLEEP_DELAY) {
      sleeping = true;
      sleepTimer = RIGID_BODY_SLEEP_DELAY;
      body.setVelocity(0, 0);
      body.moves = false;
    }
  }

  return {
    body,
    get sleeping() {
      return sleeping;
    },
    applyImpulse,
    applyDrag,
    updateSleep,
    wake,
  };
}
