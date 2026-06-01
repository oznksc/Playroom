import { createGameKitGame } from "@gamekit/runtime-web";
import sceneJson from "../gamekit/scenes/main.scene.json";
import { gamekitAssets } from "../gamekit/generated/assets";

createGameKitGame({
  scene: sceneJson as Parameters<typeof createGameKitGame>[0]["scene"],
  assets: gamekitAssets,
  container: document.getElementById("game")!,
});
