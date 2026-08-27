package com.playroom.runtime;

import com.badlogic.gdx.ApplicationListener;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.ScreenUtils;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.playroom.runtime.services.GameServices;
import com.playroom.runtime.services.MockGameServices;

public class GameKitGame implements ApplicationListener {
    private final GameServices services;
    private SpriteBatch batch;
    private OrthographicCamera camera;
    private Viewport viewport;
    private SceneLoader sceneLoader;

    public GameKitGame() {
        this(new MockGameServices());
    }

    public GameKitGame(GameServices services) {
        this.services = services != null ? services : new MockGameServices();
    }

    public GameServices getGameServices() {
        return services;
    }

    public SceneLoader getSceneLoader() {
        return sceneLoader;
    }

    @Override
    public void create() {
        batch = new SpriteBatch();
        camera = new OrthographicCamera();
        viewport = new FitViewport(390, 844, camera);
        sceneLoader = new SceneLoader();
        sceneLoader.loadProject("gamekit/project.json");
        sceneLoader.loadScene("gamekit/scenes/" + sceneLoader.getActiveScene());

        Gdx.app.log("GameKit", "Initialized Playroom libGDX runtime for project: " + sceneLoader.getProjectName());
    }

    @Override
    public void resize(int width, int height) {
        viewport.update(width, height, true);
    }

    @Override
    public void render() {
        ScreenUtils.clear(Color.valueOf("#101820"));
        camera.update();
        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        // Playroom entity render loop (Phase 3 will bind components here)
        batch.end();
    }

    @Override
    public void pause() {}

    @Override
    public void resume() {}

    @Override
    public void dispose() {
        if (batch != null) {
            batch.dispose();
        }
    }
}
