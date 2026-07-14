import Phaser from "phaser";
import type { GameKitScene, SceneTransitionDef } from "@gamekit/schema";
import { GameKitPhaserScene } from "./scene.js";

export type GameKitGameOptions = {
  scene: GameKitScene;
  assets: Record<string, string>;
  container: HTMLElement;
  pixelArt?: boolean;
  debug?: boolean;
  transition?: SceneTransitionDef;
};

export function createGameKitGame(options: GameKitGameOptions): Phaser.Game {
  const { scene, assets, container, transition } = options;

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
        // Prefer player gravity when present — keeps jump arcs consistent
        gravity: {
          x: scene.gravity.x,
          y: (() => {
            for (const entity of scene.entities) {
              const pc = entity.components.find((c) => c.type === "PlayerController");
              if (pc && "gravity" in pc && typeof pc.gravity === "number") {
                return pc.gravity;
              }
            }
            return scene.gravity.y;
          })(),
        },
        debug: options.debug ?? false,
        // Reduce tunneling / floor jitter at platform seams
        overlapBias: 8,
        tileBias: 16,
      },
    },
    scene: [],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);
  game.scene.add("gamekit", new GameKitPhaserScene(scene, assets, transition), true);

  return game;
}
