import { GameKitView, loadScene } from "@gamekit/runtime";
import sceneJson from "./gamekit/scenes/main.scene.json";
import { gamekitAssets } from "./gamekit/generated/assets";

const loaded = loadScene(sceneJson, gamekitAssets);

export default function App() {
  return <GameKitView scene={loaded.scene} assets={loaded.assets} />;
}
