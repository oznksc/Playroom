# Playroom libGDX Runtime Architecture

## Architecture Overview

Playroom's libGDX runtime lives in `templates/libgdx-game/core` and provides a lightweight Entity-Component-System (ECS) engine in Java that loads standard Playroom `.scene.json` and `project.json` assets directly.

```
com.playroom.runtime/
├── GameKitGame.java             # Main ApplicationAdapter game loop & state
├── SceneLoader.java             # JSON scene & project parser
├── components/                  # Component definitions
│   ├── TransformComponent.java
│   ├── SpriteComponent.java
│   ├── RigidBodyComponent.java
│   ├── AabbColliderComponent.java
│   ├── CircleColliderComponent.java
│   ├── PolygonColliderComponent.java
│   ├── PlayerControllerComponent.java
│   ├── CameraFollowComponent.java
│   ├── TextComponent.java
│   ├── AudioSourceComponent.java
│   └── ScriptComponent.java
├── graphics/
│   └── EntityRenderer.java      # Batch rendering with coordinate mapping
├── physics/
│   └── PhysicsSystem.java       # Box2D simulation & contact handling
├── input/
│   └── PlayerControllerSystem.java # Desktop keyboard & virtual touch input
├── script/
│   └── ActionExecutor.java      # Declarative script event & action triggers
└── services/
    ├── GameServices.java        # Achievements & Leaderboards interface
    └── MockGameServices.java    # Local stub for desktop debugging
```

## Scene & Project Loading

`SceneLoader` reads the active scene and instantiates entities and components:

```java
SceneLoader loader = new SceneLoader();
loader.loadProject("gamekit/project.json");
SceneData scene = loader.loadScene("gamekit/scenes/main.scene.json");

for (Entity entity : scene.entities) {
    TransformComponent transform = entity.getComponent(TransformComponent.class);
    SpriteComponent sprite = entity.getComponent(SpriteComponent.class);
    // Bind to renderer and physics systems
}
```

## Custom Action Handlers in ActionExecutor

Playroom's visual scripting system uses declarative JSON actions (`achievement.unlock`, `sound.play`, `entity.destroy`, etc.). You can extend `ActionExecutor.java` to support custom game mechanics.

```java
package com.playroom.runtime.script;

import com.playroom.runtime.GameKitGame;
import com.playroom.runtime.components.ScriptComponent.ScriptAction;
import com.playroom.runtime.scene.Entity;

public class CustomActionExecutor {
    public static void execute(GameKitGame game, Entity entity, ScriptAction action) {
        String type = action.type;

        switch (type) {
            case "player.heal":
                int amount = Integer.parseInt(action.params.getOrDefault("amount", "10"));
                // Handle healing logic
                break;

            case "camera.shake":
                float intensity = Float.parseFloat(action.params.getOrDefault("intensity", "5.0"));
                float duration = Float.parseFloat(action.params.getOrDefault("duration", "0.3"));
                // Apply camera trauma shake
                break;

            case "services.unlockAchievement":
                String achievementId = action.params.get("achievementId");
                if (achievementId != null) {
                    game.getGameServices().unlockAchievement(achievementId);
                }
                break;

            default:
                // Fallback to standard ActionExecutor
                ActionExecutor.executeAction(game, entity, action);
                break;
        }
    }
}
```

## Google Play Games Services Integration

Playroom exports Google Play Games Services bindings out of the box.

```java
public interface GameServices {
    boolean isAvailable();
    void signIn(SignInCallback callback);
    void unlockAchievement(String achievementId);
    void incrementAchievement(String achievementId, int steps);
    void submitScore(String leaderboardId, long score);
    void showAchievements();
    void showLeaderboards();
}
```

### Manifest & Configuration Injection
When exporting with `gamekit export --platform libgdx`:
- `android/res/values/strings.xml` is automatically injected with `game_services_project_id` and `app_name`.
- `android/AndroidManifest.xml` screen orientation is automatically set from the scene viewport (`sensorLandscape` vs `portrait`).

## Development & Debugging Workflows

### 1. Instant Desktop Preview with Playroom CLI
```bash
pnpm gamekit play --platform libgdx
```
This syncs `.scene.json`, `project.json`, and `gamekit/assets/` to `.playroom/native` and launches the desktop LWJGL3 build with live log streaming.

### 2. Manual Desktop Run (Gradle)
```bash
./gradlew lwjgl3:run
```

### 3. Android APK Build & Install
```bash
./gradlew android:assembleDebug
./gradlew android:installDebug
```

## Live Debug MCP Agent

The runtime starts an HTTP debug agent on **port 17478** (override with `PLAYROOM_DEBUG_PORT`) at the end of `GameKitGame.create()`. It binds `0.0.0.0` so Android `adb reverse tcp:17478 tcp:17478` works. Every mutating route is executed on the libGDX render thread via `Gdx.app.postRunnable`.

`packages/mcp` exposes those routes plus Gradle/adb/simctl as MCP tools. Call `libgdx_capabilities` first.

| MCP tool | Debug route / host command |
|---|---|
| `run` / `stop` / `restart` | Gradle `lwjgl3:run` + `/health` poll |
| `pause` / `resume` / `step_frame` | `POST /control` |
| `inspect_world` / `inspect_entity` | `GET /world`, `GET /entity?id=` |
| `spawn_entity` / `despawn_entity` / `set_component` | live ECS (not scene JSON) |
| `get_fps` / `get_draw_calls` / `get_triangles` | `GET /perf` + `GLProfiler` |
| `list_shaders` / `reload_shader` / `set_render_mode` / `capture_frame` / `set_camera` | graphics routes |
| `build` / `compile` / `test` / `clean` / `dependencies` | Gradle |
| `list_android_devices` / `build_android` / `deploy_android` / `run_android` | adb + `android:assembleDebug` |
| `list_ios_devices` / `boot_ios_simulator` | `xcrun simctl` (no RoboVM module yet) |

`remove_entity` remains the **scene-JSON** editor tool. Live deletion is `despawn_entity`.

Hex/H3/territory APIs (`create_hex`, `load_h3_region`, …) are **not** part of this runtime.
