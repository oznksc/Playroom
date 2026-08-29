package com.playroom.runtime.live

import com.badlogic.gdx.Screen
import java.util.concurrent.ConcurrentHashMap

/**
 * Global Screen Registry enabling real-time discovery and screen switching
 * between Kotlin app and Playroom Studio.
 */
object ScreenRegistry {
    private val screens = ConcurrentHashMap<String, PlayroomScreen>()
    private var activeScreenName: String? = null

    fun register(name: String, screen: PlayroomScreen) {
        screens[name] = screen
        if (activeScreenName == null) {
            activeScreenName = name
        }
    }

    fun get(name: String): PlayroomScreen? = screens[name]

    fun listScreens(): List<String> = screens.keys().toList()

    fun getActiveScreen(): PlayroomScreen? = activeScreenName?.let { screens[it] }

    fun getActiveScreenName(): String? = activeScreenName

    fun setActiveScreen(name: String): Boolean {
        val target = screens[name] ?: return false
        activeScreenName = name
        target.show()
        return true
    }
}
