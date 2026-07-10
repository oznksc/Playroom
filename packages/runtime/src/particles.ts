import type { ParticleSystemComponent, Vector2 } from "@gamekit/schema";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  sizeStart: number;
  sizeEnd: number;
  colorStart: string;
  colorEnd: string;
};

export type ParticleEmitterState = {
  particles: Particle[];
  emitAccumulator: number;
};

export function createParticleEmitter(): ParticleEmitterState {
  return { particles: [], emitAccumulator: 0 };
}

export function updateParticleEmitter(
  state: ParticleEmitterState,
  component: ParticleSystemComponent,
  origin: Vector2,
  gravityY: number,
  dt: number,
): Particle[] {
  if (!component.active) {
    // Still age existing particles
    state.particles = state.particles
      .map((p) => ({ ...p, age: p.age + dt, vy: p.vy + gravityY * component.gravityScale * dt, x: p.x + p.vx * dt, y: p.y + p.vy * dt }))
      .filter((p) => p.age < p.lifetime);
    return state.particles;
  }

  state.emitAccumulator += component.emissionRate * dt;
  while (state.emitAccumulator >= 1 && state.particles.length < component.maxParticles) {
    state.emitAccumulator -= 1;
    state.particles.push(spawnParticle(component, origin));
  }

  const g = gravityY * component.gravityScale;
  state.particles = state.particles
    .map((p) => ({
      ...p,
      age: p.age + dt,
      vx: p.vx,
      vy: p.vy + g * dt,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
    }))
    .filter((p) => p.age < p.lifetime);

  return state.particles;
}

function spawnParticle(component: ParticleSystemComponent, origin: Vector2): Particle {
  let ox = origin.x;
  let oy = origin.y;
  if (component.shape === "box") {
    ox += (Math.random() - 0.5) * component.width;
    oy += (Math.random() - 0.5) * component.height;
  }
  const angle = Math.random() * Math.PI * 2;
  const speed = component.speed * (0.5 + Math.random() * 0.5);
  return {
    x: ox,
    y: oy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    lifetime: component.lifetime * (0.7 + Math.random() * 0.6),
    sizeStart: component.sizeStart,
    sizeEnd: component.sizeEnd,
    colorStart: component.colorStart,
    colorEnd: component.colorEnd,
  };
}

export function particleRenderSize(p: Particle): number {
  const t = Math.min(1, p.age / Math.max(0.0001, p.lifetime));
  return p.sizeStart + (p.sizeEnd - p.sizeStart) * t;
}

export function particleRenderColor(p: Particle): string {
  // Prefer start color for MVP; full lerp would need hex parsing.
  const t = p.age / Math.max(0.0001, p.lifetime);
  return t < 0.5 ? p.colorStart : p.colorEnd;
}
