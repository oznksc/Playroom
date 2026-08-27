package com.playroom.runtime;

import com.badlogic.gdx.ApplicationListener;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.ScreenUtils;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.playroom.runtime.graphics.EntityRenderer;
import com.playroom.runtime.input.PlayerControllerSystem;
import com.playroom.runtime.physics.PhysicsSystem;
import com.playroom.runtime.scene.SceneData;
import com.playroom.runtime.script.ActionExecutor;
import com.playroom.runtime.services.GameServices;
import com.playroom.runtime.services.MockGameServices;

public class GameKitGame implements ApplicationListener {
    private final GameServices services;
    private SpriteBatch batch;
    private OrthographicCamera camera;
    private Viewport viewport;

    private SceneLoader sceneLoader;
    private SceneData currentSceneData;
    private PhysicsSystem physicsSystem;
    private PlayerControllerSystem playerControllerSystem;
    private EntityRenderer entityRenderer;
    private ActionExecutor actionExecutor;

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

    public SceneData getCurrentSceneData() {
        return currentSceneData;
    }

    public PhysicsSystem getPhysicsSystem() {
        return physicsSystem;
    }

    public ActionExecutor getActionExecutor() {
        return actionExecutor;
    }

    @Override
    public void create() {
        batch = new SpriteBatch();
        entityRenderer = new EntityRenderer();
        entityRenderer.init();

        sceneLoader = new SceneLoader();
        sceneLoader.loadProject("gamekit/project.json");

        currentSceneData = sceneLoader.loadScene("gamekit/scenes/" + sceneLoader.getActiveSceneFile());

        camera = new OrthographicCamera();
        camera.setToOrtho(true, currentSceneData.viewportWidth, currentSceneData.viewportHeight);
        viewport = new FitViewport(currentSceneData.viewportWidth, currentSceneData.viewportHeight, camera);

        physicsSystem = new PhysicsSystem();
        physicsSystem.init(currentSceneData);

        playerControllerSystem = new PlayerControllerSystem();
        actionExecutor = new ActionExecutor(services);

        actionExecutor.triggerEvent(currentSceneData, "start");

        Gdx.app.log("GameKit", "Initialized Playroom libGDX runtime for: " + sceneLoader.getProjectName());
    }

    @Override
    public void resize(int width, int height) {
        viewport.update(width, height);
    }

    @Override
    public void render() {
        float delta = Gdx.graphics.getDeltaTime();

        // 1. Process player controls
        playerControllerSystem.update(currentSceneData, physicsSystem, delta);

        // 2. Step Box2D simulation
        physicsSystem.update(delta);

        // 3. Update camera tracking
        entityRenderer.updateCamera(currentSceneData, camera, delta);
        camera.update();

        // 4. Render frame
        ScreenUtils.clear(currentSceneData.backgroundColor);
        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        entityRenderer.render(currentSceneData, batch);
        batch.end();
    }

    @Override
    public void pause() {}

    @Override
    public void resume() {}

    @Override
    public void dispose() {
        if (batch != null) batch.dispose();
        if (entityRenderer != null) entityRenderer.dispose();
        if (physicsSystem != null) physicsSystem.dispose();
    }
}
