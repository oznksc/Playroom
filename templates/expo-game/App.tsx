import { GameKitGame, loadScene } from "@gamekit/runtime";
import { SafeAreaProvider } from "react-native-safe-area-context";
import sceneJson from "./gamekit/scenes/main.scene.json";
import { gamekitAssets } from "./gamekit/generated/assets";

const loaded = loadScene(sceneJson, gamekitAssets);

export default function App() {
  return (
    <SafeAreaProvider>
      <GameKitGame scene={loaded.scene} assets={loaded.assets} />
    </SafeAreaProvider>
  );
}