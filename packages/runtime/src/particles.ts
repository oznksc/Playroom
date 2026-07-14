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

export function particleLifeProgress(p: Particle): number {
  return Math.min(1, Math.max(0, p.age / Math.max(0.0001, p.lifetime)));
}

export function particleRenderSize(p: Particle): number {
  const t = particleLifeProgress(p);
  return p.sizeStart + (p.sizeEnd - p.sizeStart) * t;
}

/** Remaining opacity, fading linearly to 0 at end of life. Shared by both runtimes. */
export function particleRenderAlpha(p: Particle): number {
  return 1 - particleLifeProgress(p);
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  let value = hex.trim();
  if (value.startsWith("#")) value = value.slice(1);
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (value.length !== 6) return null;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function toHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0");
}

/** True per-channel RGB interpolation from colorStart to colorEnd over the particle's life. */
export function particleRenderColor(p: Particle): string {
  const t = particleLifeProgress(p);
  const start = parseHexColor(p.colorStart);
  const end = parseHexColor(p.colorEnd);
  if (!start || !end) {
    // Non-hex colors can't be interpolated — fall back to a midpoint swap.
    return t < 0.5 ? p.colorStart : p.colorEnd;
  }
  const r = start.r + (end.r - start.r) * t;
  const g = start.g + (end.g - start.g) * t;
  const b = start.b + (end.b - start.b) * t;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
