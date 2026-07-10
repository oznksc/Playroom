import { describe, expect, it } from "vitest";
import { createEntity } from "@gamekit/schema";
import { collectAudioSources, createAudioController } from "../src/audio.js";

describe("audio controller", () => {
  it("collects AudioSource components from entities", () => {
    const entity = createEntity("Speaker");
    entity.components.push({
      type: "AudioSource",
      assetId: "jump",
      volume: 0.8,
      loop: false,
      playOnStart: true,
    });
    const sources = collectAudioSources([entity]);
    expect(sources).toHaveLength(1);
    expect(sources[0].assetId).toBe("jump");
  });

  it("creates controller entries and resolves urls", () => {
    const entity = createEntity("Speaker");
    entity.components.push({
      type: "AudioSource",
      assetId: "bgm",
      volume: 0.5,
      loop: true,
      playOnStart: false,
    });
    const controller = createAudioController([entity], (id) =>
      id === "bgm" ? "https://example.com/bgm.mp3" : undefined,
    );
    expect(controller.sources).toHaveLength(1);
    expect(controller.sources[0].url).toBe("https://example.com/bgm.mp3");
    controller.dispose();
    expect(controller.sources).toHaveLength(0);
  });
});
