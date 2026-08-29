package com.playroom.runtime.lwjgl3

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration
import com.playroom.runtime.GameKitGame

object Lwjgl3Launcher {
    @JvmStatic
    fun main(args: Array<String>) {
        createApplication()
    }

    private fun createApplication(): Lwjgl3Application {
        return Lwjgl3Application(GameKitGame(), defaultConfiguration)
    }

    private val defaultConfiguration: Lwjgl3ApplicationConfiguration
        get() {
            val config = Lwjgl3ApplicationConfiguration()
            config.setTitle("Playroom Game (Kotlin)")
            config.useVsync(true)
            config.setForegroundFPS(60)
            config.setWindowedMode(480, 800)
            return config
        }
}
