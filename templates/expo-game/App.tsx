import { GameKitGame, loadScene } from "@gamekit/runtime";
import { SafeAreaProvider } from "react-native-safe-area-context";
import sceneJson from "./gamekit/scenes/main.scene.json";
import { gamekitAssets } from "./gamekit/generated/assets";

const loaded = loadScene(sceneJson, gamekitAssets);

/** Expo starter: landscape platformer with virtual on-screen controls. */
export default function App() {
  return (
    <SafeAreaProvider>
      <GameKitGame scene={loaded.scene} assets={loaded.assets} showControls />
    </SafeAreaProvider>
  );
}