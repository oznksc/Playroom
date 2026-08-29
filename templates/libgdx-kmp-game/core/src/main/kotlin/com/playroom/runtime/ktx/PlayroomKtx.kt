package com.playroom.runtime.ktx

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.g2d.Batch
import com.badlogic.gdx.math.Vector2
import com.badlogic.gdx.physics.box2d.Body
import com.badlogic.gdx.physics.box2d.World
import com.playroom.runtime.GameKitGame
import com.playroom.runtime.components.Component
import com.playroom.runtime.scene.Entity
import com.playroom.runtime.scene.SceneData
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Idiomatic Kotlin & LibKTX extensions for Playroom GameKit Runtime.
 */

inline fun <reified T : Component> Entity.getComponent(): T? {
    for (component in this.components) {
        if (component is T) return component
    }
    return null
}

inline fun <reified T : Component> Entity.hasComponent(): Boolean = getComponent<T>() != null

fun Entity.position(): Vector2 = Vector2(this.x, this.y)

fun SceneData.findEntity(id: String): Entity? {
    return this.entities.firstOrNull { it.id == id }
}

fun SceneData.filterByTag(tag: String): List<Entity> {
    return this.entities.filter { entity ->
        entity.components.any { it.type == "Tag" && it.name == tag }
    }
}

/**
 * Coroutine helper for running asynchronous game actions.
 */
fun GameKitGame.launchAsync(block: suspend CoroutineScope.() -> Unit) {
    CoroutineScope(Dispatchers.Default).launch {
        block()
    }
}

/**
 * Safe LibKTX color builder.
 */
fun hexColor(hex: String): Color {
    val clean = hex.removePrefix("#")
    return when (clean.length) {
        6 -> Color(
            clean.substring(0, 2).toInt(16) / 255f,
            clean.substring(2, 4).toInt(16) / 255f,
            clean.substring(4, 6).toInt(16) / 255f,
            1f
        )
        8 -> Color(
            clean.substring(0, 2).toInt(16) / 255f,
            clean.substring(2, 4).toInt(16) / 255f,
            clean.substring(4, 6).toInt(16) / 255f,
            clean.substring(6, 8).toInt(16) / 255f
        )
        else -> Color.WHITE
    }
}
