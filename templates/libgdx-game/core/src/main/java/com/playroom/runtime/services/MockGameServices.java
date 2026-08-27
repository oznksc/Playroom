package com.playroom.runtime.services;

import com.badlogic.gdx.Gdx;
import java.util.HashMap;
import java.util.Map;

public class MockGameServices implements GameServices {
    private boolean authenticated = true;
    private final Map<String, Integer> achievementProgress = new HashMap<>();

    @Override
    public boolean isAuthenticated() {
        return authenticated;
    }

    @Override
    public void signIn(SignInCallback callback) {
        authenticated = true;
        Gdx.app.log("GameServices", "[Mock] Signed in successfully");
        if (callback != null) {
            callback.onResult(true);
        }
    }

    @Override
    public void unlockAchievement(String logicalId) {
        Gdx.app.log("GameServices", "[Mock] Unlocked achievement: " + logicalId);
    }

    @Override
    public void incrementAchievement(String logicalId, int steps) {
        int current = achievementProgress.getOrDefault(logicalId, 0) + steps;
        achievementProgress.put(logicalId, current);
        Gdx.app.log("GameServices", "[Mock] Incremented achievement: " + logicalId + " by " + steps + " (total: " + current + ")");
    }

    @Override
    public void setAchievementSteps(String logicalId, int steps) {
        achievementProgress.put(logicalId, steps);
        Gdx.app.log("GameServices", "[Mock] Set achievement progress: " + logicalId + " to " + steps);
    }

    @Override
    public void showAchievements() {
        Gdx.app.log("GameServices", "[Mock] Show achievements UI requested");
    }

    @Override
    public void submitScore(String leaderboardId, long score) {
        Gdx.app.log("GameServices", "[Mock] Submitted score to " + leaderboardId + ": " + score);
    }

    @Override
    public void showLeaderboard(String leaderboardId) {
        Gdx.app.log("GameServices", "[Mock] Show leaderboard UI requested for: " + leaderboardId);
    }
}
