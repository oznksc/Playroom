package com.playroom.runtime.android;

import android.app.Activity;
import com.badlogic.gdx.Gdx;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.playroom.runtime.services.GameServices;
import java.util.HashMap;
import java.util.Map;

public class PlayGamesServicesV2 implements GameServices {
    private final Activity activity;
    private final Map<String, String> achievementMap = new HashMap<>();
    private final Map<String, String> leaderboardMap = new HashMap<>();

    public PlayGamesServicesV2(Activity activity) {
        this.activity = activity;
        try {
            PlayGamesSdk.initialize(activity);
        } catch (Exception e) {
            Gdx.app.error("PlayGamesV2", "Failed to initialize PlayGamesSdk", e);
        }
    }

    public void registerAchievement(String logicalId, String googlePlayId) {
        achievementMap.put(logicalId, googlePlayId);
    }

    public void registerLeaderboard(String logicalId, String googlePlayId) {
        leaderboardMap.put(logicalId, googlePlayId);
    }

    @Override
    public boolean isAuthenticated() {
        return false;
    }

    @Override
    public void signIn(SignInCallback callback) {
        PlayGames.getGamesSignInClient(activity)
            .isAuthenticated()
            .addOnCompleteListener(task -> {
                boolean isAuth = task.isSuccessful() && task.getResult().isAuthenticated();
                if (isAuth) {
                    if (callback != null) {
                        callback.onResult(true);
                    }
                } else {
                    PlayGames.getGamesSignInClient(activity)
                        .signIn()
                        .addOnCompleteListener(signInTask -> {
                            boolean ok = signInTask.isSuccessful() && signInTask.getResult().isAuthenticated();
                            if (callback != null) {
                                callback.onResult(ok);
                            }
                        });
                }
            });
    }

    @Override
    public void unlockAchievement(String logicalId) {
        String id = achievementMap.getOrDefault(logicalId, logicalId);
        PlayGames.getAchievementsClient(activity).unlock(id);
    }

    @Override
    public void incrementAchievement(String logicalId, int steps) {
        String id = achievementMap.getOrDefault(logicalId, logicalId);
        PlayGames.getAchievementsClient(activity).increment(id, steps);
    }

    @Override
    public void setAchievementSteps(String logicalId, int steps) {
        String id = achievementMap.getOrDefault(logicalId, logicalId);
        PlayGames.getAchievementsClient(activity).setSteps(id, steps);
    }

    @Override
    public void showAchievements() {
        PlayGames.getAchievementsClient(activity)
            .getAchievementsIntent()
            .addOnSuccessListener(intent -> activity.startActivityForResult(intent, 9001));
    }

    @Override
    public void submitScore(String leaderboardId, long score) {
        String id = leaderboardMap.getOrDefault(leaderboardId, leaderboardId);
        PlayGames.getLeaderboardsClient(activity).submitScore(id, score);
    }

    @Override
    public void showLeaderboard(String leaderboardId) {
        String id = leaderboardMap.getOrDefault(leaderboardId, leaderboardId);
        PlayGames.getLeaderboardsClient(activity)
            .getLeaderboardIntent(id)
            .addOnSuccessListener(intent -> activity.startActivityForResult(intent, 9002));
    }
}
