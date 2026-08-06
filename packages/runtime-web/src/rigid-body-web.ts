import type { RigidBodyComponent } from "@gamekit/schema";

/**
 * Phaser-side RigidBody adapter. Wraps an Arcade body with the shared
 * RigidBody semantics so script actions (applyImpulse) behave the same way
 * they do on the Skia runtime: `velocity += impulse / mass`, and a no-op for
 * kinematic bodies.
 */
export type PhaserRigidBody = {
  body: {
    velocity: { x: number; y: number };
    setVelocity(x: number, y: number): void;
  };
  applyImpulse(impulse: { x: number; y: number }): void;
};

export function createPhaserRigidBody(
  body: PhaserRigidBody["body"],
  component: RigidBodyComponent,
): PhaserRigidBody {
  return {
    body,
    applyImpulse(impulse) {
      if (component.isKinematic) return;
      const mass = Math.max(0.001, component.mass);
      body.setVelocity(
        body.velocity.x + impulse.x / mass,
        body.velocity.y + impulse.y / mass,
      );
    },
  };
}
