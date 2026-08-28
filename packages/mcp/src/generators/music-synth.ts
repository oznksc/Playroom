import { encodeWav } from "./wav-encoder.js";

export type MusicPreset =
  | "chiptune_adventure"
  | "boss_battle"
  | "chill_dungeon"
  | "cyberpunk_pulse"
  | "retro_menu"
  | "victory_fanfare"
  | "spooky_night";

export type MusicalScale = "major" | "minor" | "pentatonic" | "dorian" | "blues" | "harmonic_minor";
export type MusicalKey = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";

export type MusicOptions = {
  preset?: MusicPreset;
  bpm?: number;
  durationSec?: number;
  key?: MusicalKey;
  scale?: MusicalScale;
  volume?: number;
  leadWave?: "square" | "sawtooth" | "sine" | "triangle";
  bassWave?: "square" | "sawtooth" | "triangle";
  hasDrums?: boolean;
  sampleRate?: number;
};

const NOTE_SEMITONES: Record<MusicalKey, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const SCALE_INTERVALS: Record<MusicalScale, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
};

export const MUSIC_PRESETS: Record<MusicPreset, Required<Omit<MusicOptions, "preset">>> = {
  chiptune_adventure: {
    bpm: 130,
    durationSec: 7.38, // 4 bars at 130 BPM
    key: "C",
    scale: "major",
    volume: 0.8,
    leadWave: "square",
    bassWave: "triangle",
    hasDrums: true,
    sampleRate: 44100,
  },
  boss_battle: {
    bpm: 145,
    durationSec: 6.62, // 4 bars at 145 BPM
    key: "D",
    scale: "harmonic_minor",
    volume: 0.85,
    leadWave: "sawtooth",
    bassWave: "sawtooth",
    hasDrums: true,
    sampleRate: 44100,
  },
  chill_dungeon: {
    bpm: 92,
    durationSec: 10.43, // 4 bars at 92 BPM
    key: "E",
    scale: "dorian",
    volume: 0.75,
    leadWave: "sine",
    bassWave: "triangle",
    hasDrums: true,
    sampleRate: 44100,
  },
  cyberpunk_pulse: {
    bpm: 120,
    durationSec: 8.0, // 4 bars at 120 BPM
    key: "F",
    scale: "minor",
    volume: 0.8,
    leadWave: "sawtooth",
    bassWave: "sawtooth",
    hasDrums: true,
    sampleRate: 44100,
  },
  retro_menu: {
    bpm: 110,
    durationSec: 8.72, // 4 bars at 110 BPM
    key: "G",
    scale: "major",
    volume: 0.75,
    leadWave: "square",
    bassWave: "triangle",
    hasDrums: true,
    sampleRate: 44100,
  },
  victory_fanfare: {
    bpm: 125,
    durationSec: 7.68, // 4 bars at 125 BPM
    key: "C",
    scale: "major",
    volume: 0.85,
    leadWave: "square",
    bassWave: "square",
    hasDrums: true,
    sampleRate: 44100,
  },
  spooky_night: {
    bpm: 96,
    durationSec: 10.0, // 4 bars at 96 BPM
    key: "A",
    scale: "minor",
    volume: 0.75,
    leadWave: "triangle",
    bassWave: "sine" as any,
    hasDrums: false,
    sampleRate: 44100,
  },
};

/** Converts a MIDI note number to its frequency in Hertz */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Generates scale notes for a key, scale type, and base octave */
export function getScaleMidiNotes(key: MusicalKey, scale: MusicalScale, baseOctave = 4): number[] {
  const rootMidi = 12 * (baseOctave + 1) + NOTE_SEMITONES[key];
  const intervals = SCALE_INTERVALS[scale];
  const notes: number[] = [];
  for (let octave = 0; octave < 3; octave++) {
    for (const interval of intervals) {
      notes.push(rootMidi + octave * 12 + interval);
    }
  }
  return notes;
}

/**
 * Polyphonic BGM Synthesizer.
 * Generates an audio WAV buffer containing lead melody, harmony chords, bass, and percussion.
 */
export function synthesizeMusic(options: MusicOptions = {}): Uint8Array {
  const presetDefaults = options.preset
    ? MUSIC_PRESETS[options.preset] || MUSIC_PRESETS.chiptune_adventure
    : MUSIC_PRESETS.chiptune_adventure;
  const config = {
    bpm: options.bpm ?? presetDefaults.bpm,
    durationSec: options.durationSec ?? presetDefaults.durationSec,
    key: options.key ?? presetDefaults.key,
    scale: options.scale ?? presetDefaults.scale,
    volume: options.volume ?? presetDefaults.volume,
    leadWave: options.leadWave ?? presetDefaults.leadWave,
    bassWave: options.bassWave ?? presetDefaults.bassWave,
    hasDrums: options.hasDrums ?? presetDefaults.hasDrums,
    sampleRate: options.sampleRate ?? presetDefaults.sampleRate,
  };

  const sampleRate = config.sampleRate;
  const beatsPerSecond = config.bpm / 60;
  const secondsPerBeat = 1 / beatsPerSecond;
  const secondsPerSixteenth = secondsPerBeat / 4;

  // Compute number of 16th steps that fit into requested duration
  const totalSixteenths = Math.max(16, Math.round(config.durationSec / secondsPerSixteenth));
  const totalDuration = totalSixteenths * secondsPerSixteenth;
  const totalSamples = Math.floor(totalDuration * sampleRate);
  const mix = new Float32Array(totalSamples);

  const scaleNotes = getScaleMidiNotes(config.key, config.scale, 4);
  const bassNotes = getScaleMidiNotes(config.key, config.scale, 2);

  // Deterministic seed based on key/scale/preset for musical consistency
  let seed = (NOTE_SEMITONES[config.key] * 37 + totalSixteenths * 17) & 0xffff;
  function rand(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // Pre-generate a musical lead melody pattern (16-step bar motif repeated with variation)
  const barPatternLength = 16;
  const melodyMotif: Array<{ step: number; noteIdx: number; duration: number }> = [];
  for (let s = 0; s < barPatternLength; s += 2) {
    if (rand() > 0.15) {
      const noteIdx = Math.floor(rand() * 8) + 2; // Mid register
      const duration = rand() > 0.6 ? 2 : 1;
      melodyMotif.push({ step: s, noteIdx, duration });
    }
  }

  // 1. Render Lead Channel
  for (let bar = 0; bar < Math.ceil(totalSixteenths / barPatternLength); bar++) {
    for (const m of melodyMotif) {
      const stepIdx = bar * barPatternLength + m.step;
      if (stepIdx >= totalSixteenths) continue;

      const startTime = stepIdx * secondsPerSixteenth;
      const noteDuration = m.duration * secondsPerSixteenth * 0.9;
      // Slight pitch variation on second and fourth bars
      const noteIdxOffset = bar % 2 === 1 ? (rand() > 0.5 ? 1 : -1) : 0;
      const noteIdx = Math.max(0, Math.min(scaleNotes.length - 1, m.noteIdx + noteIdxOffset));
      const freq = midiToFreq(scaleNotes[noteIdx]);

      renderOscillatorNote(mix, {
        freq,
        startTime,
        duration: noteDuration,
        sampleRate,
        waveType: config.leadWave,
        volume: 0.35 * config.volume,
        attack: 0.01,
        decay: noteDuration * 0.4,
        sustain: 0.6,
        release: 0.04,
        vibrato: true,
      });
    }
  }

  // 2. Render Harmony / Arpeggio Chords
  const chordRoots = [0, 4, 5, 3]; // Classic I - V - vi - IV or i - v - VI - iv progression
  const chordStepsPerBar = 16;
  for (let step = 0; step < totalSixteenths; step++) {
    const barIdx = Math.floor(step / chordStepsPerBar);
    const chordProgIdx = barIdx % chordRoots.length;
    const rootIndex = chordRoots[chordProgIdx] % (scaleNotes.length - 7);

    // Arpeggiate 1st, 3rd, 5th, octave on every 16th note
    const arpOffset = [0, 2, 4, 7][step % 4];
    const arpNoteIdx = Math.min(scaleNotes.length - 1, rootIndex + arpOffset);
    const freq = midiToFreq(scaleNotes[arpNoteIdx]);
    const startTime = step * secondsPerSixteenth;
    const duration = secondsPerSixteenth * 0.85;

    renderOscillatorNote(mix, {
      freq,
      startTime,
      duration,
      sampleRate,
      waveType: "triangle",
      volume: 0.18 * config.volume,
      attack: 0.005,
      decay: duration * 0.5,
      sustain: 0.3,
      release: 0.02,
    });
  }

  // 3. Render Bassline Channel
  for (let step = 0; step < totalSixteenths; step += 2) {
    const barIdx = Math.floor(step / chordStepsPerBar);
    const chordProgIdx = barIdx % chordRoots.length;
    const rootIndex = chordRoots[chordProgIdx] % bassNotes.length;
    const freq = midiToFreq(bassNotes[rootIndex]);
    const startTime = step * secondsPerSixteenth;
    const duration = secondsPerSixteenth * 1.6;

    renderOscillatorNote(mix, {
      freq,
      startTime,
      duration,
      sampleRate,
      waveType: config.bassWave,
      volume: 0.4 * config.volume,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 0.05,
    });
  }

  // 4. Render Drum Channel (Kick, Snare, Hi-hat)
  if (config.hasDrums) {
    for (let step = 0; step < totalSixteenths; step++) {
      const startTime = step * secondsPerSixteenth;

      // Hi-hat on every 16th or 8th note
      renderHiHat(mix, startTime, sampleRate, 0.12 * config.volume, step % 2 === 0);

      // Kick on beat 1 and 3 (step 0, 8, 16...)
      if (step % 8 === 0) {
        renderKick(mix, startTime, sampleRate, 0.55 * config.volume);
      }
      // Snare on beat 2 and 4 (step 4, 12, 20...)
      if (step % 8 === 4) {
        renderSnare(mix, startTime, sampleRate, 0.35 * config.volume);
      }
    }
  }

  return encodeWav(mix, { sampleRate });
}

function renderOscillatorNote(
  buffer: Float32Array,
  opts: {
    freq: number;
    startTime: number;
    duration: number;
    sampleRate: number;
    waveType: "square" | "sawtooth" | "sine" | "triangle";
    volume: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    vibrato?: boolean;
  }
): void {
  const startSample = Math.floor(opts.startTime * opts.sampleRate);
  const noteSamples = Math.floor(opts.duration * opts.sampleRate);
  let phase = 0;

  for (let i = 0; i < noteSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;

    const t = i / opts.sampleRate;
    let amp = 0;
    if (t < opts.attack) {
      amp = opts.attack > 0 ? t / opts.attack : 1;
    } else if (t < opts.attack + opts.decay) {
      const dec = (t - opts.attack) / Math.max(0.001, opts.decay);
      amp = 1 - (1 - opts.sustain) * dec;
    } else {
      const rel = (t - opts.attack - opts.decay) / Math.max(0.001, opts.release);
      amp = opts.sustain * Math.max(0, 1 - rel);
    }

    let freq = opts.freq;
    if (opts.vibrato && t > 0.1) {
      freq += freq * 0.02 * Math.sin(2 * Math.PI * 6 * t);
    }

    const phaseInc = (2 * Math.PI * freq) / opts.sampleRate;
    phase = (phase + phaseInc) % (2 * Math.PI);

    let osc = 0;
    switch (opts.waveType) {
      case "sine":
        osc = Math.sin(phase);
        break;
      case "square":
        osc = phase < Math.PI ? 1 : -1;
        break;
      case "triangle":
        osc = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      case "sawtooth":
        osc = 1 - (2 / (2 * Math.PI)) * phase;
        break;
    }

    buffer[idx] += osc * amp * opts.volume;
  }
}

function renderKick(
  buffer: Float32Array,
  startTime: number,
  sampleRate: number,
  volume: number
): void {
  const startSample = Math.floor(startTime * sampleRate);
  const duration = 0.18;
  const numSamples = Math.floor(duration * sampleRate);
  let phase = 0;

  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;

    const t = i / sampleRate;
    const amp = Math.max(0, 1 - t / duration);
    // Pitch drops rapidly from 150Hz to 35Hz
    const freq = 150 * Math.pow(35 / 150, t / duration);
    phase += (2 * Math.PI * freq) / sampleRate;
    buffer[idx] += Math.sin(phase) * amp * volume;
  }
}

function renderSnare(
  buffer: Float32Array,
  startTime: number,
  sampleRate: number,
  volume: number
): void {
  const startSample = Math.floor(startTime * sampleRate);
  const duration = 0.15;
  const numSamples = Math.floor(duration * sampleRate);
  let phase = 0;

  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;

    const t = i / sampleRate;
    const amp = Math.max(0, 1 - t / duration);
    const noise = (Math.random() * 2 - 1) * 0.7;
    // Tonal body
    phase += (2 * Math.PI * 180) / sampleRate;
    const tone = Math.sin(phase) * 0.3;

    buffer[idx] += (noise + tone) * amp * volume;
  }
}

function renderHiHat(
  buffer: Float32Array,
  startTime: number,
  sampleRate: number,
  volume: number,
  accented: boolean
): void {
  const startSample = Math.floor(startTime * sampleRate);
  const duration = accented ? 0.04 : 0.025;
  const numSamples = Math.floor(duration * sampleRate);

  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;

    const t = i / sampleRate;
    const amp = Math.max(0, 1 - t / duration);
    const noise = Math.random() * 2 - 1;
    buffer[idx] += noise * amp * volume * (accented ? 1.0 : 0.6);
  }
}
