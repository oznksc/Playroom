import { describe, expect, it } from "vitest";
import {
  classifyDisplayObject,
  installDrawCallCounter,
  pushSample,
  samplePhaserProfiler,
  sparklinePath,
} from "./play-profiler.js";

describe("play profiler", () => {
  it("classifies display objects and samples a Phaser-like game", () => {
    expect(classifyDisplayObject("Sprite")).toBe("sprites");
    expect(classifyDisplayObject("BitmapText")).toBe("texts");
    expect(classifyDisplayObject("TilemapLayer")).toBe("tilemaps");

    const children = [
      { type: "Sprite", visible: true },
      { type: "Sprite", visible: false },
      { type: "Text", visible: true },
      { type: "Graphics", visible: true },
    ];
    let flushCount = 0;
    const game = {
      loop: { actualFps: 59.6, delta: 16.66 },
      renderer: {
        flush() {
          flushCount += 1;
        },
        drawCount: 3,
      },
      textures: { list: { hero: {}, ground: {}, __DEFAULT: {}, __MISSING: {} } },
      events: { on() {} },
      scene: {
        getScene() {
          return {
            sys: { displayList: { getChildren: () => children, length: children.length } },
            physics: { world: { bodies: { size: 4 }, staticBodies: { size: 7 } } },
            cameras: { cameras: [{}, {}] },
            lights: { lights: [{}] },
          };
        },
      },
    };
    const read = installDrawCallCounter(game);
    game.renderer.flush();
    game.renderer.flush();
    const sample = samplePhaserProfiler(game, read());
    expect(sample.fps).toBe(60);
    expect(sample.frameMs).toBe(16.7);
    expect(sample.drawCalls).toBe(2);
    expect(sample.displayList).toBe(4);
    expect(sample.visible).toBe(3);
    expect(sample.breakdown.sprites).toBe(2);
    expect(sample.breakdown.texts).toBe(1);
    expect(sample.textures).toBe(2);
    expect(sample.bodies).toBe(4);
    expect(sample.staticBodies).toBe(7);
    expect(sample.cameras).toBe(2);
    expect(flushCount).toBe(2);
  });

  it("builds sparkline paths and caps history", () => {
    expect(sparklinePath([], 80, 24)).toBe("");
    const path = sparklinePath([10, 20, 30], 100, 20);
    expect(path.startsWith("M")).toBe(true);
    expect(path.includes(" L")).toBe(true);
    expect(pushSample([1, 2], 3, 3)).toEqual([1, 2, 3]);
    expect(pushSample([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });
});
