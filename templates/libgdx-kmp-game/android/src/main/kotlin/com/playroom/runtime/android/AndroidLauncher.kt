package com.playroom.runtime.android

import android.os.Bundle
import com.badlogic.gdx.backends.android.AndroidApplication
import com.badlogic.gdx.backends.android.AndroidApplicationConfiguration
import com.playroom.runtime.GameKitGame

class AndroidLauncher : AndroidApplication() {
    private var playGamesServices: PlayGamesServicesV2? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val config = AndroidApplicationConfiguration().apply {
            useImmersiveMode = true
            useAccelerometer = false
            useCompass = false
        }
        playGamesServices = PlayGamesServicesV2(this).apply {
            init()
        }
        initialize(GameKitGame(playGamesServices), config)
    }
}
