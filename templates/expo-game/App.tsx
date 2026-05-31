import { GameKitView, loadScene, SceneManager } from "@gamekit/runtime";
import { SafeAreaProvider } from "react-native-safe-area-context";
import sceneJson from "./gamekit/scenes/main.scene.json";
import { gamekitAssets } from "./gamekit/generated/assets";

const loaded = loadScene(sceneJson, gamekitAssets);

const sceneManager = new SceneManager(
  {
    scenes: {
      "main.scene.json": loaded
    },
    transition: {
      type: "fade",
      duration: 300
    }
  },
  [
    {
      id: "level-1",
      name: "Level 1",
      order: 1,
      sceneIds: ["main.scene.json"],
      unlocked: true
    }
  ]
);

export default function App() {
  const currentScene = sceneManager.getCurrentScene();

  if (!currentScene) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GameKitView
        scene={currentScene.scene}
        assets={currentScene.assets}
      />
    </SafeAreaProvider>
  );
}
