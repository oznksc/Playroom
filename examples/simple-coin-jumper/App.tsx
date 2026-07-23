// Native deps must load before Skia / GameKit (gesture-handler, reanimated 4 + worklets).
import "react-native-gesture-handler";
import "react-native-reanimated";

import { useMemo, useState, useCallback } from "react";
import { GameKitGame, loadScene, SceneManager, InMemoryStorage } from "@gamekit/runtime";
import { SafeAreaProvider } from "react-native-safe-area-context";
import projectJson from "./gamekit/project.json";
import menuJson from "./gamekit/scenes/menu.scene.json";
import settingsJson from "./gamekit/scenes/settings.scene.json";
import platformerJson from "./gamekit/scenes/platformer.scene.json";
import { gamekitAssets } from "./gamekit/generated/assets";

function buildManager() {
  const scenes: Record<string, ReturnType<typeof loadScene>> = {};
  const register = (file: string, raw: unknown) => {
    const loaded = loadScene(raw, gamekitAssets);
    const bare = file.replace(/\.scene\.json$/i, "");
    scenes[file] = loaded;
    scenes[bare] = loaded;
    scenes[loaded.scene.id] = loaded;
  };
  register("menu.scene.json", menuJson);
  register("settings.scene.json", settingsJson);
  register("platformer.scene.json", platformerJson);

  const manager = new SceneManager(
    { scenes, transition: { type: "fade", duration: 250 } },
    projectJson.levels ?? [],
    new InMemoryStorage(),
  );
  const entry =
    (projectJson as { activeScene?: string }).activeScene ?? "menu.scene.json";
  manager.switchScene(entry.replace(/\.scene\.json$/i, "")) ||
    manager.switchScene("menu") ||
    manager.switchScene("platformer");
  return manager;
}

/** Coin Jumper — simple platformer for Expo iOS. */
export default function App() {
  const manager = useMemo(() => buildManager(), []);
  const [, setTick] = useState(0);
  const remount = useCallback(() => setTick((t) => t + 1), []);

  const current = manager.getCurrentScene();
  if (!current) return null;

  const guiComponents = projectJson.guiComponents ?? [];
  const sceneId = current.scene.id;
  const showControls = sceneId === "platformer" || sceneId === "main";

  return (
    <SafeAreaProvider>
      <GameKitGame
        key={sceneId}
        scene={current.scene}
        assets={current.assets}
        showControls={showControls}
        guiComponents={guiComponents}
        sceneManager={{
          switchScene: (id) => {
            const ok = manager.switchScene(id);
            if (ok) remount();
            return ok;
          },
          nextScene: () => {
            const ok = manager.nextScene();
            if (ok) remount();
            return ok;
          },
          nextLevel: () => {
            const ok = manager.nextLevel();
            if (ok) remount();
            return ok;
          },
          unlockLevel: (id) => manager.unlockLevel(id),
          completeLevel: (id) => manager.completeLevel(id),
          getState: () => ({ currentLevelId: manager.getState().currentLevelId }),
          setPersistentVar: (k, v) => manager.setPersistentVar(k, v),
          getPersistentVar: (k, d) => manager.getPersistentVar(k, d),
        }}
      />
    </SafeAreaProvider>
  );
}
