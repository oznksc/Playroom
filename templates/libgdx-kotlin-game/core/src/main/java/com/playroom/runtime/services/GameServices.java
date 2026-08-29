package com.playroom.runtime.services;

public interface GameServices {
    boolean isAuthenticated();
    void signIn(SignInCallback callback);
    void unlockAchievement(String logicalId);
    void incrementAchievement(String logicalId, int steps);
    void setAchievementSteps(String logicalId, int steps);
    void showAchievements();
    void submitScore(String leaderboardId, long score);
    void showLeaderboard(String leaderboardId);

    interface SignInCallback {
        void onResult(boolean success);
    }
}
