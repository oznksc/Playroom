import Phaser from "phaser";
import type { GameKitScene } from "@gamekit/schema";
import { GameKitPhaserScene } from "./scene.js";

export type GameKitGameOptions = {
  scene: GameKitScene;
  assets: Record<string, string>;
  container: HTMLElement;
  pixelArt?: boolean;
  debug?: boolean;
};

export function createGameKitGame(options: GameKitGameOptions): Phaser.Game {
  const { scene, assets, container } = options;

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: container,
    width: scene.viewport.width,
    height: scene.viewport.height,
    backgroundColor: scene.viewport.background,
    pixelArt: options.pixelArt ?? true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: scene.gravity.x, y: scene.gravity.y },
        debug: options.debug ?? false,
      },
    },
    scene: [],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);
  game.scene.add("gamekit", new GameKitPhaserScene(scene, assets), true);

  return game;
}
