package com.playroom.runtime.lwjgl3;

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;
import com.playroom.runtime.GameKitGame;
import com.playroom.runtime.services.MockGameServices;

public class Lwjgl3Launcher {
    public static void main(String[] args) {
        Lwjgl3ApplicationConfiguration config = new Lwjgl3ApplicationConfiguration();
        config.setTitle("Playroom Game");
        config.setWindowedMode(390, 844);
        config.useVsync(true);
        config.setForegroundFPS(60);
        new Lwjgl3Application(new GameKitGame(new MockGameServices()), config);
    }
}
