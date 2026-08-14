import { describe, expect, it } from "vitest";
import {
  computeSpatialAudio,
  findAudioListenerPosition,
  DEFAULT_MIN_DISTANCE,
  DEFAULT_MAX_DISTANCE,
} from "../src/spatial-audio.js";
import { createEntity } from "@gamekit/schema";

const listener = { x: 0, y: 0 };
const source = { x: 0, y: 0, minDistance: 0, maxDistance: 1000 };

describe("computeSpatialAudio", () => {
  it("is full volume and centered at the listener", () => {
    const result = computeSpatialAudio(listener, source);
    expect(result.gain).toBe(1);
    expect(result.pan).toBe(0);
  });

  it("is silent beyond maxDistance", () => {
    const result = computeSpatialAudio(listener, { ...source, x: 2000, y: 0 });
    expect(result.gain).toBe(0);
  });

  it("attenuates linearly between min and max distance", () => {
    const result = computeSpatialAudio(listener, { ...source, x: 500, y: 0 });
    expect(result.gain).toBeCloseTo(0.5, 5);
  });

  it("keeps full gain within minDistance", () => {
    const result = computeSpatialAudio(listener, { ...source, minDistance: 100, x: 50 });
    expect(result.gain).toBe(1);
  });

  it("pans right for sources to the right", () => {
    const result = computeSpatialAudio(listener, { ...source, x: 500 });
    expect(result.pan).toBeCloseTo(0.5, 5);
  });

  it("pans left for sources to the left", () => {
    const result = computeSpatialAudio(listener, { ...source, x: -500 });
    expect(result.pan).toBeCloseTo(-0.5, 5);
  });

  it("clamps pan to -1..1", () => {
    const far = computeSpatialAudio(listener, { ...source, x: 5000 });
    expect(far.pan).toBe(1);
    const nearLeft = computeSpatialAudio(listener, { ...source, x: -5000 });
    expect(nearLeft.pan).toBe(-1);
  });

  it("uses defaults when fields are absent", () => {
    const result = computeSpatialAudio(listener, {
      x: 0,
      y: 0,
      minDistance: DEFAULT_MIN_DISTANCE,
      maxDistance: DEFAULT_MAX_DISTANCE,
    });
    expect(result.gain).toBe(1);
    expect(result.pan).toBe(0);
  });
});

describe("findAudioListenerPosition", () => {
  it("returns null when there is no listener", () => {
    const entity = createEntity("Speaker");
    expect(findAudioListenerPosition([entity])).toBeNull();
  });

  it("finds the first enabled listener's transform position", () => {
    const disabled = createEntity("Disabled");
    disabled.components.push({ type: "AudioListener", enabled: false });
    const listenerEntity = createEntity("Ear");
    listenerEntity.components.push({ type: "AudioListener", enabled: true });
    const transform = listenerEntity.components.find((c) => c.type === "Transform");
    transform!.position = { x: 12, y: 34 };

    const position = findAudioListenerPosition([disabled, listenerEntity]);
    expect(position).toEqual({ x: 12, y: 34 });
  });
});