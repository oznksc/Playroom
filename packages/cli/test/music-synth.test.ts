import { describe, it, expect } from "vitest";
import { synthesizeMusic, MUSIC_PRESETS, type MusicPreset } from "../src/generators/music-synth.js";

describe("Music Synthesizer", () => {
  it("synthesizes valid loopable WAV music tracks for all presets", () => {
    const presets = Object.keys(MUSIC_PRESETS) as MusicPreset[];
    expect(presets.length).toBeGreaterThan(3);

    for (const preset of presets) {
      const buffer = synthesizeMusic({ preset, durationSec: 2.0 }); // Short duration for fast test
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(1000);

      const header = Buffer.from(buffer.subarray(0, 12)).toString("ascii");
      expect(header.startsWith("RIFF")).toBe(true);
      expect(header.endsWith("WAVE")).toBe(true);
    }
  });

  it("handles custom key, scale, bpm, and duration", () => {
    const buffer = synthesizeMusic({
      key: "D",
      scale: "harmonic_minor",
      bpm: 140,
      durationSec: 3.0,
      volume: 0.9,
    });
    expect(buffer.length).toBeGreaterThan(2000);
  });
});
