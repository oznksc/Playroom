import { describe, expect, it } from "vitest";
import { createRng, seedFromString } from "../src/rng.js";

describe("Deterministic Seeded RNG (Mulberry32)", () => {
  it("produces identical sequences given the same numeric seed", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
    expect(seq1[0]).toBeGreaterThanOrEqual(0);
    expect(seq1[0]).toBeLessThan(1);
  });

  it("produces identical sequences given the same string seed", () => {
    const rng1 = createRng("playroom-level-arena-1");
    const rng2 = createRng("playroom-level-arena-1");

    const seq1 = Array.from({ length: 15 }, () => rng1.nextInt(1, 100));
    const seq2 = Array.from({ length: 15 }, () => rng2.nextInt(1, 100));

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences with different seeds", () => {
    const rngA = createRng(100);
    const rngB = createRng(200);

    const seqA = Array.from({ length: 10 }, () => rngA.next());
    const seqB = Array.from({ length: 10 }, () => rngB.next());

    expect(seqA).not.toEqual(seqB);
  });

  it("generates integers within bounds inclusively", () => {
    const rng = createRng(12345);
    const min = 10;
    const max = 20;
    const values = Array.from({ length: 200 }, () => rng.nextInt(min, max));

    expect(Math.min(...values)).toBe(min);
    expect(Math.max(...values)).toBe(max);
    for (const v of values) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(min);
      expect(v).toBeLessThanOrEqual(max);
    }
  });

  it("generates floats within [min, max)", () => {
    const rng = createRng(777);
    for (let i = 0; i < 100; i++) {
      const f = rng.nextFloat(-5.5, 5.5);
      expect(f).toBeGreaterThanOrEqual(-5.5);
      expect(f).toBeLessThan(5.5);
    }
  });

  it("picks elements from arrays and shuffles deterministically", () => {
    const rng1 = createRng("deck-seed");
    const rng2 = createRng("deck-seed");

    const items = ["gem_ruby", "gem_sapphire", "gem_emerald", "coin_gold", "hazard_spike"];

    const picks1 = Array.from({ length: 8 }, () => rng1.pick(items));
    const picks2 = Array.from({ length: 8 }, () => rng2.pick(items));
    expect(picks1).toEqual(picks2);

    const shuffled1 = rng1.shuffle(items);
    const shuffled2 = rng2.shuffle(items);
    expect(shuffled1).toEqual(shuffled2);
    expect(shuffled1).toHaveLength(items.length);
    expect(new Set(shuffled1)).toEqual(new Set(items));
  });

  it("supports state save and restore", () => {
    const rng = createRng(999);
    // Advance 10 steps
    for (let i = 0; i < 10; i++) rng.next();

    // Snapshot state
    const savedState = rng.getState();

    // Advance 5 steps
    const seqAfterSave = Array.from({ length: 5 }, () => rng.next());

    // Restore state
    rng.setState(savedState);
    const seqAfterRestore = Array.from({ length: 5 }, () => rng.next());

    expect(seqAfterRestore).toEqual(seqAfterSave);
  });

  it("forks independent child RNGs deterministically", () => {
    const parent1 = createRng(555);
    const parent2 = createRng(555);

    const child1 = parent1.fork();
    const child2 = parent2.fork();

    const childSeq1 = Array.from({ length: 10 }, () => child1.next());
    const childSeq2 = Array.from({ length: 10 }, () => child2.next());
    expect(childSeq1).toEqual(childSeq2);

    // Parent continues deterministically
    expect(parent1.next()).toEqual(parent2.next());
  });

  it("hashes strings consistently with seedFromString", () => {
    expect(seedFromString("hello")).toBe(seedFromString("hello"));
    expect(seedFromString("hello")).not.toBe(seedFromString("world"));
    expect(seedFromString("")).toBe(0x811c9dc5 >>> 0);
  });
});
