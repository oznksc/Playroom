import type { GameKitScene } from "@gamekit/schema";
import { parseScene } from "@gamekit/schema";

export type AssetRegistry = Record<string, unknown>;

export type LoadedScene = {
  scene: GameKitScene;
  assets: AssetRegistry;
};

export function loadScene(input: unknown, assets: AssetRegistry = {}): LoadedScene {
  return {
    scene: parseScene(input),
    assets
  };
}
