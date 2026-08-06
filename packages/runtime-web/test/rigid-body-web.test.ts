import { describe, expect, it } from "vitest";
import { createPhaserRigidBody } from "../src/rigid-body-web.js";

function fakeBody(initial = { x: 0, y: 0 }) {
  let velocity = { ...initial };
  return {
    velocity,
    setVelocity(x: number, y: number) {
      velocity = { x, y };
    },
    getVelocity() {
      return velocity;
    },
  };
}

const component = (over: Partial<import("@gamekit/schema").RigidBodyComponent> = {}) => ({
  type: "RigidBody" as const,
  velocity: { x: 0, y: 0 },
  angularVelocity: 0,
  mass: 1,
  drag: 0,
  isKinematic: false,
  gravityScale: 1,
  useGravity: true,
  ...over,
});

describe("createPhaserRigidBody", () => {
  it("applies an impulse divided by mass", () => {
    const body = fakeBody();
    const rb = createPhaserRigidBody(body, component({ mass: 2 }));
    rb.applyImpulse({ x: 10, y: 4 });
    expect(body.getVelocity()).toEqual({ x: 5, y: 2 });
  });

  it("accumulates on top of current velocity", () => {
    const body = fakeBody({ x: 3, y: -1 });
    const rb = createPhaserRigidBody(body, component({ mass: 1 }));
    rb.applyImpulse({ x: 2, y: 1 });
    expect(body.getVelocity()).toEqual({ x: 5, y: 0 });
  });

  it("is a no-op for kinematic bodies", () => {
    const body = fakeBody({ x: 1, y: 1 });
    const rb = createPhaserRigidBody(body, component({ isKinematic: true }));
    rb.applyImpulse({ x: 100, y: 100 });
    expect(body.getVelocity()).toEqual({ x: 1, y: 1 });
  });
});
