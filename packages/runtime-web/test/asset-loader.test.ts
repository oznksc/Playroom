import { describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { preloadEntityAssets, preloadGuiImageAssets } from "../src/asset-loader.js";

function createFakeLoader() {
  const image = vi.fn();
  const spritesheet = vi.fn();
  const audio = vi.fn();
  const loader = { image, spritesheet, audio } as unknown as Phaser.Loader.LoaderPlugin;
  return { loader, image, spritesheet, audio };
}

describe("asset-loader", () => {
  it("registers entity sprite assets under the bare assetId", () => {
    const { loader, image } = createFakeLoader();
    const loadedKeys = preloadEntityAssets(
      loader,
      [
        {
          id: "player",
          name: "Player",
          components: [
            { type: "Transform", position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
            {
              type: "Sprite",
              assetId: "player",
              width: 32,
              height: 32,
              anchor: { x: 0.5, y: 0.5 },
            },
          ],
        },
      ],
      { player: "player.svg" },
      new Map()
    );
    expect(image).toHaveBeenCalledTimes(1);
    expect(image).toHaveBeenCalledWith("player", "player.svg");
    expect(loadedKeys.has("player")).toBe(true);
  });

  it("preloads GUI Image assets under the bare assetId, from scene nodes and project guiComponents", () => {
    const { loader, image } = createFakeLoader();
    const loadedKeys = new Set<string>(["already"]);

    preloadGuiImageAssets(
      loader,
      {
        nodes: [{ id: "n1", type: "Image", x: 0, y: 0, width: 10, height: 10, assetId: "panel" }],
      },
      [
        {
          id: "hud",
          name: "HUD",
          nodes: [
            { id: "n2", type: "Image", x: 0, y: 0, width: 10, height: 10, assetId: "badge" },
            { id: "n3", type: "Image", x: 0, y: 0, width: 10, height: 10, assetId: "already" },
            { id: "n4", type: "Text", x: 0, y: 0, width: 10, height: 10, text: "hi" },
          ],
        },
      ],
      {
        panel: "panel.svg",
        badge: "badge.svg",
        already: "already.svg",
        unused: "unused.svg",
      },
      loadedKeys
    );

    expect(image).toHaveBeenCalledTimes(2);
    expect(image).toHaveBeenCalledWith("panel", "panel.svg");
    expect(image).toHaveBeenCalledWith("badge", "badge.svg");
    expect(image).not.toHaveBeenCalledWith("already", "already.svg");
    expect(image).not.toHaveBeenCalledWith("unused", "unused.svg");
    expect(loadedKeys.has("panel")).toBe(true);
    expect(loadedKeys.has("badge")).toBe(true);
  });
});
