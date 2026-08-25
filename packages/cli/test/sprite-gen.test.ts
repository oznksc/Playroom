import { describe, it, expect } from "vitest";
import { generateSprite } from "../src/generators/sprite-gen.js";
import { generateCharacterSpritesheet } from "../src/generators/spritesheet-gen.js";

describe("Sprite & Spritesheet Generator", () => {
  it("generates valid PNG sprites with correct dimensions and dataUrl", () => {
    const sprite = generateSprite({
      archetype: "hero",
      category: "character",
      palette: "cyberpunk",
      size: 32,
    });

    expect(sprite.width).toBe(32);
    expect(sprite.height).toBe(32);
    expect(sprite.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(sprite.buffer.length).toBeGreaterThan(50);

    // PNG signature check
    expect(sprite.buffer[0]).toBe(137);
    expect(sprite.buffer[1]).toBe(80); // 'P'
    expect(sprite.buffer[2]).toBe(78); // 'N'
    expect(sprite.buffer[3]).toBe(71); // 'G'
  });

  it("generates multi-frame animated character spritesheet", () => {
    const sheet = generateCharacterSpritesheet({
      archetype: "knight",
      animation: "walk",
      frameCount: 4,
      frameSize: 32,
      fps: 8,
      palette: "pico8",
    });

    expect(sheet.frameWidth).toBe(32);
    expect(sheet.frameHeight).toBe(32);
    expect(sheet.totalFrames).toBe(4);
    expect(sheet.sheetWidth).toBe(128); // 32 * 4
    expect(sheet.sheetHeight).toBe(32);
    expect(sheet.framesPerSecond).toBe(8);
    expect(sheet.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(sheet.buffer.length).toBeGreaterThan(100);
  });
});
