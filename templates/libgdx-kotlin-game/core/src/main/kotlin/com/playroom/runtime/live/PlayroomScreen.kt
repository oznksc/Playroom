package com.playroom.runtime.live

import com.badlogic.gdx.Screen
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.math.Vector2
import com.playroom.runtime.GameKitGame
import com.playroom.runtime.components.Component
import com.playroom.runtime.components.SpriteComponent
import com.playroom.runtime.components.TextComponent
import com.playroom.runtime.components.TransformComponent
import com.playroom.runtime.ktx.getComponent
import com.playroom.runtime.ktx.position
import com.playroom.runtime.scene.Entity
import com.playroom.runtime.scene.SceneData
import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

/**
 * Base class for Kotlin Multiplatform screens that bind bi-directionally
 * to a visual Playroom (.scene.json) scene.
 */
abstract class PlayroomScreen(
    val sceneName: String,
    val game: GameKitGame
) : Screen {

    val sceneData: SceneData?
        get() = game.currentScene

    val entities: List<Entity>
        get() = sceneData?.entities ?: emptyList()

    private val clickHandlers = mutableMapOf<String, () -> Unit>()

    open fun onSceneReady() {}

    fun findEntity(id: String): Entity? {
        return entities.firstOrNull { it.id == id || it.name == id }
    }

    /**
     * Bind an entity's TextComponent.text reactively to a Kotlin property.
     */
    fun bindText(entityId: String, defaultText: String = ""): ReadWriteProperty<Any?, String> {
        return object : ReadWriteProperty<Any?, String> {
            override fun getValue(thisRef: Any?, property: KProperty<*>): String {
                val entity = findEntity(entityId)
                val textComp = entity?.getComponent<TextComponent>()
                return textComp?.text ?: defaultText
            }

            override fun setValue(thisRef: Any?, property: KProperty<*>, value: String) {
                val entity = findEntity(entityId)
                val textComp = entity?.getComponent<TextComponent>()
                if (textComp != null) {
                    textComp.text = value
                }
            }
        }
    }

    /**
     * Bind an entity's TransformComponent position to a Kotlin property.
     */
    fun bindTransform(entityId: String): ReadWriteProperty<Any?, Vector2> {
        return object : ReadWriteProperty<Any?, Vector2> {
            override fun getValue(thisRef: Any?, property: KProperty<*>): Vector2 {
                val entity = findEntity(entityId)
                return entity?.position() ?: Vector2.Zero
            }

            override fun setValue(thisRef: Any?, property: KProperty<*>, value: Vector2) {
                val entity = findEntity(entityId)
                val t = entity?.getComponent<TransformComponent>()
                t?.position?.set(value)
            }
        }
    }

    /**
     * Register click or touch listener on an entity.
     */
    fun onEntityClick(entityId: String, action: () -> Unit) {
        clickHandlers[entityId] = action
    }

    fun dispatchEntityClick(entityId: String) {
        clickHandlers[entityId]?.invoke()
    }

    override fun show() {
        onSceneReady()
    }

    override fun render(delta: Float) {
        // Handled by GameKitGame render loop
    }

    override fun resize(width: Int, height: Int) {}
    override fun pause() {}
    override fun resume() {}
    override fun hide() {}
    override fun dispose() {
        clickHandlers.clear()
    }
}
