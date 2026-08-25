import { encodeWav } from "./wav-encoder.js";

export type SfxWaveType = "square" | "sawtooth" | "sine" | "noise" | "triangle";

export type SfxPreset =
  | "jump"
  | "coin"
  | "laser"
  | "explosion"
  | "hit"
  | "powerup"
  | "hurt"
  | "ui_click"
  | "defeat"
  | "victory"
  | "step"
  | "whoosh"
  | "teleport"
  | "item_pickup";

export type SfxOptions = {
  preset?: SfxPreset;
  waveType?: SfxWaveType;
  startFreq?: number;
  endFreq?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  volume?: number;
  vibratoSpeed?: number;
  vibratoDepth?: number;
  dutyCycle?: number;
  noiseMix?: number;
  sampleRate?: number;
};

export const SFX_PRESETS: Record<SfxPreset, SfxOptions> = {
  jump: {
    waveType: "square",
    startFreq: 150,
    endFreq: 580,
    attack: 0.005,
    decay: 0.15,
    sustain: 0.2,
    release: 0.08,
    volume: 0.8,
    dutyCycle: 0.5,
  },
  coin: {
    waveType: "square",
    startFreq: 987.77, // B5
    endFreq: 1318.51, // E6
    attack: 0.005,
    decay: 0.12,
    sustain: 0.4,
    release: 0.25,
    volume: 0.75,
    dutyCycle: 0.35,
  },
  laser: {
    waveType: "sawtooth",
    startFreq: 1400,
    endFreq: 120,
    attack: 0.002,
    decay: 0.14,
    sustain: 0.1,
    release: 0.05,
    volume: 0.8,
    noiseMix: 0.1,
  },
  explosion: {
    waveType: "noise",
    startFreq: 180,
    endFreq: 30,
    attack: 0.01,
    decay: 0.35,
    sustain: 0.3,
    release: 0.45,
    volume: 0.9,
    noiseMix: 0.85,
  },
  hit: {
    waveType: "square",
    startFreq: 360,
    endFreq: 50,
    attack: 0.002,
    decay: 0.08,
    sustain: 0.1,
    release: 0.06,
    volume: 0.85,
    noiseMix: 0.4,
  },
  powerup: {
    waveType: "triangle",
    startFreq: 260,
    endFreq: 880,
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.35,
    volume: 0.8,
    vibratoSpeed: 12,
    vibratoDepth: 0.2,
  },
  hurt: {
    waveType: "sawtooth",
    startFreq: 240,
    endFreq: 70,
    attack: 0.005,
    decay: 0.12,
    sustain: 0.2,
    release: 0.1,
    volume: 0.85,
    noiseMix: 0.3,
  },
  ui_click: {
    waveType: "sine",
    startFreq: 1200,
    endFreq: 800,
    attack: 0.001,
    decay: 0.025,
    sustain: 0.0,
    release: 0.01,
    volume: 0.6,
  },
  defeat: {
    waveType: "sawtooth",
    startFreq: 380,
    endFreq: 85,
    attack: 0.02,
    decay: 0.3,
    sustain: 0.4,
    release: 0.5,
    volume: 0.8,
    vibratoSpeed: 6,
    vibratoDepth: 0.25,
  },
  victory: {
    waveType: "square",
    startFreq: 440,
    endFreq: 880,
    attack: 0.01,
    decay: 0.25,
    sustain: 0.6,
    release: 0.4,
    volume: 0.8,
    dutyCycle: 0.5,
    vibratoSpeed: 8,
    vibratoDepth: 0.1,
  },
  step: {
    waveType: "noise",
    startFreq: 120,
    endFreq: 40,
    attack: 0.005,
    decay: 0.03,
    sustain: 0.05,
    release: 0.03,
    volume: 0.5,
    noiseMix: 0.9,
  },
  whoosh: {
    waveType: "noise",
    startFreq: 300,
    endFreq: 600,
    attack: 0.08,
    decay: 0.12,
    sustain: 0.2,
    release: 0.15,
    volume: 0.7,
    noiseMix: 0.8,
  },
  teleport: {
    waveType: "sine",
    startFreq: 200,
    endFreq: 1200,
    attack: 0.01,
    decay: 0.2,
    sustain: 0.4,
    release: 0.2,
    volume: 0.75,
    vibratoSpeed: 24,
    vibratoDepth: 0.6,
  },
  item_pickup: {
    waveType: "triangle",
    startFreq: 523.25, // C5
    endFreq: 1046.5, // C6
    attack: 0.005,
    decay: 0.1,
    sustain: 0.4,
    release: 0.2,
    volume: 0.75,
  },
};

/**
 * Procedural Sound Effect (SFX) Synthesizer.
 * Generates an audio WAV buffer based on presets or fine-grained synthesis parameters.
 */
export function synthesizeSfx(options: SfxOptions = {}): Uint8Array {
  const presetDefaults = options.preset ? SFX_PRESETS[options.preset] || {} : {};
  const config = {
    waveType: options.waveType ?? presetDefaults.waveType ?? "square",
    startFreq: options.startFreq ?? presetDefaults.startFreq ?? 440,
    endFreq: options.endFreq ?? presetDefaults.endFreq ?? 220,
    attack: options.attack ?? presetDefaults.attack ?? 0.01,
    decay: options.decay ?? presetDefaults.decay ?? 0.15,
    sustain: options.sustain ?? presetDefaults.sustain ?? 0.3,
    release: options.release ?? presetDefaults.release ?? 0.1,
    volume: options.volume ?? presetDefaults.volume ?? 0.8,
    vibratoSpeed: options.vibratoSpeed ?? presetDefaults.vibratoSpeed ?? 0,
    vibratoDepth: options.vibratoDepth ?? presetDefaults.vibratoDepth ?? 0,
    dutyCycle: options.dutyCycle ?? presetDefaults.dutyCycle ?? 0.5,
    noiseMix: options.noiseMix ?? presetDefaults.noiseMix ?? 0,
    sampleRate: options.sampleRate ?? 44100,
  };

  const sampleRate = config.sampleRate;
  const totalDuration = Math.max(0.04, config.attack + config.decay + config.release);
  const totalSamples = Math.floor(totalDuration * sampleRate);
  const samples = new Float32Array(totalSamples);

  let phase = 0;
  let noiseVal = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Amplitude ADSR Envelope
    let amp = 0;
    if (t < config.attack) {
      amp = config.attack > 0 ? t / config.attack : 1;
    } else if (t < config.attack + config.decay) {
      const decayProgress = (t - config.attack) / Math.max(0.001, config.decay);
      amp = 1 - (1 - config.sustain) * decayProgress;
    } else {
      const releaseProgress = (t - config.attack - config.decay) / Math.max(0.001, config.release);
      amp = config.sustain * Math.max(0, 1 - releaseProgress);
    }

    // Exponential frequency slide
    const progress = t / totalDuration;
    let freq = config.startFreq * Math.pow(Math.max(0.001, config.endFreq / config.startFreq), progress);

    // Vibrato LFO
    if (config.vibratoDepth > 0 && config.vibratoSpeed > 0) {
      const lfo = Math.sin(2 * Math.PI * config.vibratoSpeed * t);
      freq += freq * config.vibratoDepth * lfo;
    }

    // Phase advance
    const phaseInc = (2 * Math.PI * Math.max(20, freq)) / sampleRate;
    phase = (phase + phaseInc) % (2 * Math.PI);

    // Oscillator waveform
    let osc = 0;
    switch (config.waveType) {
      case "sine":
        osc = Math.sin(phase);
        break;
      case "square":
        osc = phase < 2 * Math.PI * config.dutyCycle ? 1 : -1;
        break;
      case "triangle":
        osc = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      case "sawtooth":
        osc = 1 - (2 / (2 * Math.PI)) * phase;
        break;
      case "noise":
        if (i % 2 === 0) {
          noiseVal = Math.random() * 2 - 1;
        }
        osc = noiseVal;
        break;
    }

    // Blend noise if requested
    if (config.noiseMix > 0 && config.waveType !== "noise") {
      const randomNoise = Math.random() * 2 - 1;
      osc = (1 - config.noiseMix) * osc + config.noiseMix * randomNoise;
    }

    samples[i] = osc * amp * config.volume;
  }

  return encodeWav(samples, { sampleRate });
}
