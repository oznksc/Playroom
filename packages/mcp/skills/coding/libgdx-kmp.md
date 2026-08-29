# libGDX Kotlin Multiplatform (KMP) Architecture

## Overview

Kotlin Multiplatform (KMP) allows sharing core gameplay logic, state machines, math, data models, and ECS components across Desktop (JVM), Android, iOS (Kotlin/Native), and Web (Wasm/JS) while utilizing target-specific libGDX backends.

## Multiplatform Project Hierarchy

```
project-root/
├── core/                         # Shared multiplatform module
│   ├── build.gradle              # plugins: id("org.jetbrains.kotlin.multiplatform")
│   └── src/
│       ├── commonMain/           # Pure Kotlin logic, scene models, state machines
│       ├── desktopMain/          # JVM / LWJGL3 bridge
│       ├── androidMain/          # Android platform bridge
│       ├── iosMain/              # iOS native bridge (GameCenter, Metal/GL)
│       └── wasmJsMain/           # Web target bridge
├── lwjgl3/                       # Desktop LWJGL 3 application launcher
├── android/                      # Android application launcher
├── assets/gamekit/               # Shared scenes and game assets
└── build.gradle                  # Root build configuration
```

## `expect` / `actual` Pattern for Platform Bridges

Define common contracts in `commonMain`:

```kotlin
// commonMain/kotlin/com/playroom/platform/PlatformBridge.kt
package com.playroom.platform

enum class PlatformKind { DESKTOP, ANDROID, IOS, WEB }

expect class PlatformServices() {
    val platformKind: PlatformKind
    fun log(tag: String, message: String)
    fun getSavedString(key: String, default: String): String
    fun saveString(key: String, value: String)
    fun showToast(message: String)
    fun vibrate(durationMs: Long)
}
```

Implement platform-specific behaviors:

```kotlin
// desktopMain/kotlin/com/playroom/platform/PlatformServices.jvm.kt
package com.playroom.platform

actual class PlatformServices actual constructor() {
    actual val platformKind: PlatformKind = PlatformKind.DESKTOP
    private val prefs = java.util.prefs.Preferences.userRoot().node("playroom")

    actual fun log(tag: String, message: String) = println("[$tag] $message")
    actual fun getSavedString(key: String, default: String): String = prefs.get(key, default)
    actual fun saveString(key: String, value: String) { prefs.put(key, value); prefs.flush() }
    actual fun showToast(message: String) = println("[Toast] $message")
    actual fun vibrate(durationMs: Long) = Unit
}
```

## Shared ECS & Scene Data in `commonMain`

Because `commonMain` is pure Kotlin, game data models (`SceneData`, `Entity`, `TransformComponent`, `PlayerControllerComponent`) are compiled to every target:

```kotlin
package com.playroom.runtime.common

data class Vector2D(var x: Float = 0f, var y: Float = 0f) {
    operator fun plus(other: Vector2D) = Vector2D(x + other.x, y + other.y)
    operator fun times(scale: Float) = Vector2D(x * scale, y * scale)
}

data class Entity(
    val id: String,
    val name: String,
    var position: Vector2D,
    val components: MutableList<Any> = mutableListOf()
)
```

## Gradle Multiplatform Configuration

```gradle
plugins {
    id 'org.jetbrains.kotlin.multiplatform'
}

kotlin {
    jvm("desktop")
    androidTarget()
    
    sourceSets {
        commonMain {
            dependencies {
                implementation "org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1"
            }
        }
        desktopMain {
            dependencies {
                implementation project(':core')
            }
        }
    }
}
```
