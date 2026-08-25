import { describe, it, expect } from "vitest";
import { synthesizeSfx, SFX_PRESETS, type SfxPreset } from "../src/generators/sfx-synth.js";

describe("SFX Synthesizer", () => {
  it("synthesizes valid WAV buffer for all presets", () => {
    const presets = Object.keys(SFX_PRESETS) as SfxPreset[];
    expect(presets.length).toBeGreaterThan(5);

    for (const preset of presets) {
      const buffer = synthesizeSfx({ preset });
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(44); // Greater than header size

      // Verify RIFF and WAVE header
      const header = Buffer.from(buffer.subarray(0, 12)).toString("ascii");
      expect(header.startsWith("RIFF")).toBe(true);
      expect(header.endsWith("WAVE")).toBe(true);

      // Verify format subchunk
      const fmt = Buffer.from(buffer.subarray(12, 16)).toString("ascii");
      expect(fmt).toBe("fmt ");
    }
  });

  it("supports custom waveform and frequency parameters", () => {
    const buffer = synthesizeSfx({
      waveType: "sine",
      startFreq: 880,
      endFreq: 440,
      attack: 0.05,
      decay: 0.1,
      sustain: 0.5,
      release: 0.1,
      volume: 0.7,
    });
    expect(buffer.length).toBeGreaterThan(100);
  });
});
