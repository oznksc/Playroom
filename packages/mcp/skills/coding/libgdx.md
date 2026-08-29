# libGDX Architecture & Best Practices

## Project Architecture

libGDX uses a multi-platform architecture where common game logic lives in the `core` module, while platform-specific launcher modules (`lwjgl3`, `android`, `ios`, `html`) bootstrap the application.

```
project-root/
├── core/                  # Engine & gameplay logic (Java / Kotlin)
│   └── src/main/java/     # Shared ECS, scene loaders, systems
├── lwjgl3/                # Desktop launcher (LWJGL 3, OpenGL 3.2+)
│   └── src/main/java/     # Lwjgl3Application initialization
├── android/               # Android launcher (Android Gradle Plugin)
│   ├── AndroidManifest.xml
│   └── src/main/java/     # AndroidApplication activity
├── assets/                # Shared assets directory (linked across modules)
└── build.gradle           # Root Gradle build script
```

## Application Lifecycle

The core entry point implements `ApplicationListener` (or extends `ApplicationAdapter` / `Game`).

```java
package com.playroom.game;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;

public class MyGame extends ApplicationAdapter {
    private SpriteBatch batch;

    @Override
    public void create() {
        // Initialization: allocate GPU resources, load assets
        batch = new SpriteBatch();
    }

    @Override
    public void resize(int width, int height) {
        // Handle window or orientation resize (update Viewport)
    }

    @Override
    public void render() {
        // Delta time in seconds
        float delta = Gdx.graphics.getDeltaTime();

        // Clear screen buffer
        Gdx.gl.glClearColor(0.02f, 0.04f, 0.08f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);

        // Update & render loop
    }

    @Override
    public void pause() {
        // Android / iOS app focus lost (save state, pause audio)
    }

    @Override
    public void resume() {
        // App regained focus (reload unmanaged OpenGL textures if needed)
    }

    @Override
    public void dispose() {
        // Cleanup all native/GPU resources (SpriteBatch, Textures, Shaders)
        if (batch != null) batch.dispose();
    }
}
```

## Viewport Strategies

Always use a `Viewport` with an `OrthographicCamera` to decouple game world resolution from the display's physical pixel count.

```java
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;

public class GameScreen {
    public static final float VIRTUAL_WIDTH = 800f;
    public static final float VIRTUAL_HEIGHT = 450f;

    private OrthographicCamera camera;
    private Viewport viewport;

    public void init() {
        camera = new OrthographicCamera();
        // FitViewport maintains aspect ratio with black letterboxing
        viewport = new FitViewport(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, camera);
        viewport.apply();
        camera.position.set(VIRTUAL_WIDTH / 2f, VIRTUAL_HEIGHT / 2f, 0);
    }

    public void resize(int width, int height) {
        // Center camera on resize
        viewport.update(width, height, true);
    }
}
```

### Viewport Selection Guide
- **`FitViewport`**: Keeps exact aspect ratio, letterboxes remaining space. Ideal for pixel art and fixed-field games (puzzles, platformers).
- **`ExtendViewport`**: Keeps world scale constant and extends the visible world horizontally or vertically without black bars.
- **`ScreenViewport`**: 1 world unit = 1 pixel. Ideal for crisp UI and editor tools.

## Asset Management (`AssetManager`)

Never instantiate `new Texture()` directly inside gameplay loops. Use `AssetManager` for asynchronous loading and lifecycle tracking.

```java
import com.badlogic.gdx.assets.AssetManager;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.audio.Sound;
import com.badlogic.gdx.audio.Music;

public class AssetService {
    private final AssetManager manager = new AssetManager();

    public void queueAssets() {
        manager.load("assets/player.png", Texture.class);
        manager.load("assets/jump.wav", Sound.class);
        manager.load("assets/theme.ogg", Music.class);
    }

    public boolean updateLoading() {
        // Returns true when all queued assets finish loading
        return manager.update();
    }

    public Texture getTexture(String path) {
        return manager.get(path, Texture.class);
    }

    public void dispose() {
        manager.dispose();
    }
}
```

## Memory Management & Native Disposal Rules

libGDX wraps C/C++ native objects (OpenGL textures, OpenAL buffers, Box2D worlds). Java's garbage collector **will not free native memory**.

1. **Dispose Everything Disposable**: Any class implementing `Disposable` (`Texture`, `SpriteBatch`, `ShapeRenderer`, `BitmapFont`, `World`, `Sound`, `Music`, `ShaderProgram`) **must** be disposed in `dispose()`.
2. **Avoid Object Allocations in `render()`**:
   - Do NOT do `new Vector2()` or `new Color()` in the render/update loop.
   - Use reusable pooled instances or class fields to avoid GC pauses.
   - Use libGDX collections (`Array`, `ObjectMap`, `IntArray`, `Pool`) instead of `java.util.*` to minimize boxing overhead.
