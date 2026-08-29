package com.playroom.runtime.systems;

import com.badlogic.gdx.Gdx;
import com.playroom.runtime.components.PlayerControllerComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;
import com.playroom.runtime.script.ActionExecutor;

public class GameRulesSystem {
    public int score = 0;
    public int lives = 3;
    public boolean gameOver = false;
    public boolean gameWon = false;
    public boolean fallDeathEnabled = true;
    public float fallDeathY = 1000f;

    public void init(SceneData scene) {
        score = 0;
        lives = 3;
        gameOver = false;
        gameWon = false;
    }

    public void update(SceneData scene, float dt, ActionExecutor executor) {
        if (gameOver || gameWon) return;

        // Check fall death for player
        for (Entity entity : scene.entities) {
            PlayerControllerComponent player = entity.getComponent(PlayerControllerComponent.class);
            TransformComponent transform = entity.getComponent(TransformComponent.class);
            if (player == null || transform == null || !entity.active) continue;

            if (fallDeathEnabled && transform.y > fallDeathY) {
                handlePlayerDeath(entity, executor);
            }
        }
    }

    public void addScore(int amount) {
        score += amount;
        Gdx.app.log("GameRules", "Score: " + score);
    }

    public void handlePlayerDeath(Entity playerEntity, ActionExecutor executor) {
        lives--;
        Gdx.app.log("GameRules", "Player died! Lives remaining: " + lives);

        if (lives <= 0) {
            gameOver = true;
            Gdx.app.log("GameRules", "GAME OVER!");
        }
    }
}
