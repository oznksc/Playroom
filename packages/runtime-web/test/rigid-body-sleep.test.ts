import { describe, expect, it } from "vitest";
import { createPhaserRigidBody, type PhaserRigidBody } from "../src/rigid-body-web.js";

function makeBody() {
  const velocity = { x: 0, y: 0 };
  const body = {
    velocity,
    moves: true,
    angularVelocity: 0,
    blocked: { down: false },
    touching: { down: false },
    setVelocity(x: number, y: number) {
      velocity.x = x;
      velocity.y = y;
    },
  };
  return { body, velocity };
}

function makeRb(body: PhaserRigidBody["body"], drag = 0, mass = 1) {
  return createPhaserRigidBody(body, {
    type: "RigidBody",
    mass,
    drag,
    velocity: { x: 0, y: 0 },
    angularVelocity: 0,
    isKinematic: false,
    useGravity: true,
    gravityScale: 1,
  });
}

describe("PhaserRigidBody", () => {
  it("applyImpulse adds impulse divided by mass", () => {
    const { body, velocity } = makeBody();
    const rb = makeRb(body, 0, 2);
    rb.applyImpulse({ x: 100, y: 0 });
    expect(velocity.x).toBe(50);
  });

  it("applies exponential drag per frame like Skia", () => {
    const { body, velocity } = makeBody();
    velocity.x = 100;
    velocity.y = 50;
    const rb = makeRb(body, 0.1);
    rb.applyDrag(1 / 60);
    const factor = Math.pow(0.9, 1);
    expect(velocity.x).toBeCloseTo(100 * factor);
    expect(velocity.y).toBeCloseTo(50 * factor);
  });

  it("sleeps a supported, still body after the delay and freezes it", () => {
    const { body, velocity } = makeBody();
    velocity.x = 0;
    body.blocked.down = true;
    const rb = makeRb(body);
    for (let i = 0; i < 60; i++) rb.updateSleep(1 / 60, true);
    expect(rb.sleeping).toBe(true);
    expect(body.moves).toBe(false);
    expect(velocity.x).toBe(0);
  });

  it("wakes a sleeping body", () => {
    const { body, velocity } = makeBody();
    body.blocked.down = true;
    const rb = makeRb(body);
    for (let i = 0; i < 60; i++) rb.updateSleep(1 / 60, true);
    expect(rb.sleeping).toBe(true);
    rb.wake();
    expect(rb.sleeping).toBe(false);
    expect(body.moves).toBe(true);
  });

  it("does not sleep an unsupported body", () => {
    const { body, velocity } = makeBody();
    velocity.x = 0;
    const rb = makeRb(body);
    for (let i = 0; i < 120; i++) rb.updateSleep(1 / 60, false);
    expect(rb.sleeping).toBe(false);
  });

  it("resets the sleep timer when the body moves", () => {
    const { body, velocity } = makeBody();
    velocity.x = 0;
    body.blocked.down = true;
    const rb = makeRb(body);
    for (let i = 0; i < 30; i++) rb.updateSleep(1 / 60, true);
    velocity.x = 10;
    for (let i = 0; i < 30; i++) rb.updateSleep(1 / 60, true);
    expect(rb.sleeping).toBe(false);
  });
});
