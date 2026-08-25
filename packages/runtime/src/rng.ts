/**
 * Seeded deterministic Pseudo-Random Number Generator (Mulberry32).
 * Provides bit-for-bit reproducible random streams for physics, particles, and simulations.
 */

export interface SeededRng {
  /** Returns a pseudo-random float in [0, 1) */
  next(): number;
  /** Returns a pseudo-random integer in [min, max] (inclusive) */
  nextInt(min: number, max: number): number;
  /** Returns a pseudo-random float in [min, max) */
  nextFloat(min: number, max: number): number;
  /** Returns a boolean with given probability of being true (default: 0.5) */
  nextBool(probability?: number): boolean;
  /** Randomly selects an element from an array */
  pick<T>(items: readonly T[]): T | undefined;
  /** Returns a new shuffled array without mutating the original */
  shuffle<T>(items: readonly T[]): T[];
  /** Derives an independent child RNG initialized with a deterministic sub-seed */
  fork(): SeededRng;
  /** Returns the current internal 32-bit state (for save/restore) */
  getState(): number;
  /** Restores the internal 32-bit state */
  setState(state: number): void;
  /** Returns the original initial seed */
  getSeed(): number;
}

/**
 * Hash a string to a 32-bit unsigned integer seed using FNV-1a.
 */
export function seedFromString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

class Mulberry32Rng implements SeededRng {
  private readonly initialSeed: number;
  private state: number;

  constructor(seed: number) {
    this.initialSeed = seed >>> 0;
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return Math.floor(this.next() * (hi - lo + 1)) + lo;
  }

  nextFloat(min: number, max: number): number {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + this.next() * (hi - lo);
  }

  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    const index = Math.floor(this.next() * items.length);
    return items[index];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  fork(): SeededRng {
    const subSeed = Math.floor(this.next() * 0xffffffff);
    return new Mulberry32Rng(subSeed);
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }

  getSeed(): number {
    return this.initialSeed;
  }
}

/**
 * Create a seeded deterministic RNG instance.
 * @param seed Optional seed number (e.g. 1337) or string (e.g. "game-level-1"). Defaults to 0.
 */
export function createRng(seed: number | string = 0): SeededRng {
  const numericSeed = typeof seed === "string" ? seedFromString(seed) : seed >>> 0;
  return new Mulberry32Rng(numericSeed);
}
