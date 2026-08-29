package com.playroom.runtime.save;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Preferences;
import java.util.HashSet;
import java.util.Set;

public class SaveSystem {
    private static final String PREFS_NAME = "playroom_game_save";
    private final Preferences prefs;

    public SaveSystem() {
        this.prefs = Gdx.app.getPreferences(PREFS_NAME);
    }

    public void setInt(String key, int value) {
        prefs.putInteger(key, value);
        prefs.flush();
    }

    public int getInt(String key, int defaultValue) {
        return prefs.getInteger(key, defaultValue);
    }

    public void setFloat(String key, float value) {
        prefs.putFloat(key, value);
        prefs.flush();
    }

    public float getFloat(String key, float defaultValue) {
        return prefs.getFloat(key, defaultValue);
    }

    public void setString(String key, String value) {
        prefs.putString(key, value);
        prefs.flush();
    }

    public String getString(String key, String defaultValue) {
        return prefs.getString(key, defaultValue);
    }

    public void setBoolean(String key, boolean value) {
        prefs.putBoolean(key, value);
        prefs.flush();
    }

    public boolean getBoolean(String key, boolean defaultValue) {
        return prefs.getBoolean(key, defaultValue);
    }

    public int getHighScore() {
        return prefs.getInteger("high_score", 0);
    }

    public void setHighScore(int score) {
        int current = getHighScore();
        if (score > current) {
            prefs.putInteger("high_score", score);
            prefs.flush();
            Gdx.app.log("SaveSystem", "New High Score saved: " + score);
        }
    }

    public void unlockLevel(String levelId) {
        if (levelId == null || levelId.isEmpty()) return;
        prefs.putBoolean("unlocked_level_" + levelId, true);
        prefs.flush();
        Gdx.app.log("SaveSystem", "Level unlocked: " + levelId);
    }

    public boolean isLevelUnlocked(String levelId) {
        if (levelId == null || levelId.isEmpty() || "level_1".equalsIgnoreCase(levelId) || "1".equals(levelId)) {
            return true;
        }
        return prefs.getBoolean("unlocked_level_" + levelId, false);
    }

    public void clear() {
        prefs.clear();
        prefs.flush();
        Gdx.app.log("SaveSystem", "Save data cleared.");
    }
}
