# libGDX with Kotlin & LibKTX

## Overview

Using Kotlin with libGDX unlocks concise, type-safe game programming while preserving 100% JVM performance. The official [LibKTX](https://github.com/libktx/ktx) library suite provides Kotlin DSLs, extension functions, and coroutine utilities tailored for libGDX.

## Project Structure

```
project-root/
├── core/
│   ├── build.gradle              # plugins: kotlin("jvm"), deps: ktx-app, ktx-graphics, ktx-box2d, etc.
│   └── src/main/kotlin/          # Game logic, ECS, scene loading
├── lwjgl3/
│   ├── build.gradle              # Desktop launcher module
│   └── src/main/kotlin/          # Lwjgl3Launcher.kt
├── android/
│   ├── build.gradle              # Android Gradle plugin + kotlin-android
│   └── src/main/kotlin/          # AndroidLauncher.kt
├── assets/gamekit/               # Shared scenes, assets, prefabs, project.json
└── build.gradle                  # Root build script with kotlinVersion and ktxVersion
```

## LibKTX Core Modules

| Module | Purpose | Example Usage |
|---|---|---|
| `ktx-app` | Idiomatic application listeners and screens | `KtxGame<KtxScreen>()`, `KtxScreen` |
| `ktx-graphics` | Batch extensions, shape renderer DSL | `batch.use { it.draw(...) }`, `color(...)` |
| `ktx-box2d` | Type-safe Box2D body & fixture DSL | `world.body { box(...) { density = 1f } }` |
| `ktx-async` | Coroutine scopes, async asset loading | `KtxAsync.launch { ... }` |
| `ktx-actors` | Scene2D stage & actor extensions | `actor.onClick { ... }`, `actor.fadeIn()` |
| `ktx-math` | Operator overloading for Vector2/3 | `pos += velocity * delta` |

## Idiomatic Game Lifecycle with KTX

```kotlin
package com.playroom.game

import com.badlogic.gdx.graphics.g2d.SpriteBatch
import com.badlogic.gdx.utils.ScreenUtils
import io.github.libktx.app.KtxGame
import io.github.libktx.app.KtxScreen
import io.github.libktx.graphics.use

class MyGame : KtxGame<KtxScreen>() {
    override fun create() {
        val batch = SpriteBatch()
        addScreen(GameplayScreen(batch))
        setScreen<GameplayScreen>()
    }
}

class GameplayScreen(private val batch: SpriteBatch) : KtxScreen {
    override fun render(delta: Float) {
        ScreenUtils.clear(0.04f, 0.06f, 0.1f, 1f)
        batch.use {
            // Render entities and sprites safely without explicit begin()/end()
        }
    }

    override fun dispose() {
        batch.dispose()
    }
}
```

## Physics with `ktx-box2d` DSL

```kotlin
import com.badlogic.gdx.math.Vector2
import com.badlogic.gdx.physics.box2d.World
import com.badlogic.gdx.physics.box2d.BodyDef.BodyType
import io.github.libktx.box2d.body
import io.github.libktx.box2d.box
import io.github.libktx.box2d.circle

val world = World(Vector2(0f, -9.8f), true)

val playerBody = world.body(type = BodyType.DynamicBody) {
    position.set(5f, 10f)
    box(width = 1f, height = 2f) {
        density = 1f
        friction = 0.4f
        restitution = 0.1f
    }
    circle(radius = 0.5f, position = Vector2(0f, -1f)) {
        isSensor = true // Foot sensor for ground check
    }
}
```

## Coroutines for Scripting & Animations

```kotlin
import io.github.libktx.async.KtxAsync
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

fun triggerDialogueSequence() {
    KtxAsync.launch {
        showText("Approaching target area...")
        delay(2000L)
        playSfx("alert.wav")
        spawnBoss()
    }
}
```
