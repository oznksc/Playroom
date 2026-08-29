package com.playroom.runtime.scene;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.playroom.runtime.GameKitGame;
import java.util.Stack;

public class SceneManager {
    public enum TransitionState {
        NONE,
        FADING_OUT,
        FADING_IN
    }

    private final GameKitGame game;
    private final Stack<String> sceneHistory = new Stack<String>();
    private String currentSceneId = "main";
    private String nextSceneId = null;

    private TransitionState transitionState = TransitionState.NONE;
    private float transitionTimer = 0f;
    private float transitionDuration = 0.4f;
    private float fadeAlpha = 0f;
    private Texture fadeTexture;

    public SceneManager(GameKitGame game) {
        this.game = game;
        createFadeTexture();
    }

    private void createFadeTexture() {
        Pixmap pix = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
        pix.setColor(Color.BLACK);
        pix.fill();
        fadeTexture = new Texture(pix);
        pix.dispose();
    }

    public String getCurrentSceneId() {
        return currentSceneId;
    }

    public void switchScene(String sceneId) {
        switchScene(sceneId, "fade", 0.3f);
    }

    public void switchScene(String sceneId, String transitionType, float duration) {
        if (sceneId == null || sceneId.isEmpty()) return;

        if ("instant".equalsIgnoreCase(transitionType) || duration <= 0f) {
            executeSceneSwitch(sceneId);
        } else {
            nextSceneId = sceneId;
            transitionDuration = duration;
            transitionTimer = 0f;
            transitionState = TransitionState.FADING_OUT;
        }
    }

    public void pushScene(String sceneId) {
        if (currentSceneId != null) {
            sceneHistory.push(currentSceneId);
        }
        switchScene(sceneId);
    }

    public void popScene() {
        if (!sceneHistory.isEmpty()) {
            String prev = sceneHistory.pop();
            switchScene(prev);
        }
    }

    public void restartScene() {
        switchScene(currentSceneId);
    }

    private void executeSceneSwitch(String sceneId) {
        currentSceneId = sceneId;
        String fileName = sceneId.endsWith(".scene.json") ? sceneId : (sceneId + ".scene.json");
        try {
            game.loadSceneById(fileName);
            Gdx.app.log("SceneManager", "Switched to scene: " + sceneId);
        } catch (Exception e) {
            Gdx.app.error("SceneManager", "Failed to switch to scene: " + sceneId, e);
        }
    }

    public void update(float delta) {
        if (transitionState == TransitionState.NONE) return;

        transitionTimer += delta;
        float progress = Math.min(1f, transitionTimer / (transitionDuration * 0.5f));

        if (transitionState == TransitionState.FADING_OUT) {
            fadeAlpha = progress;
            if (progress >= 1f) {
                executeSceneSwitch(nextSceneId);
                nextSceneId = null;
                transitionTimer = 0f;
                transitionState = TransitionState.FADING_IN;
            }
        } else if (transitionState == TransitionState.FADING_IN) {
            fadeAlpha = 1f - progress;
            if (progress >= 1f) {
                fadeAlpha = 0f;
                transitionState = TransitionState.NONE;
            }
        }
    }

    public void renderTransitionOverlay(SpriteBatch batch, float screenWidth, float screenHeight) {
        if (fadeAlpha <= 0f || fadeTexture == null) return;

        batch.setColor(0f, 0f, 0f, fadeAlpha);
        batch.draw(fadeTexture, 0f, 0f, screenWidth, screenHeight);
        batch.setColor(Color.WHITE);
    }

    public void dispose() {
        if (fadeTexture != null) {
            fadeTexture.dispose();
            fadeTexture = null;
        }
    }
}
