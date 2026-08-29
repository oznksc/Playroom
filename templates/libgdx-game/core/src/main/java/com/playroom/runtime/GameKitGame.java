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
import com.playroom.runtime.systems.FollowPathSystem;
import com.playroom.runtime.systems.ParticleSystem;
import com.playroom.runtime.systems.StateMachineSystem;
import com.playroom.runtime.systems.TweenSystem;

public class GameKitGame implements ApplicationListener {
    private final GameServices services;
    private SpriteBatch batch;
    private OrthographicCamera camera;
    private Viewport viewport;

    private SceneLoader sceneLoader;
    private SceneData currentSceneData;
    private PhysicsSystem physicsSystem;
    private PlayerControllerSystem playerControllerSystem;
    private TweenSystem tweenSystem;
    private FollowPathSystem followPathSystem;
    private ParticleSystem particleSystem;
    private StateMachineSystem stateMachineSystem;
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

    public ParticleSystem getParticleSystem() {
        return particleSystem;
    }

    public StateMachineSystem getStateMachineSystem() {
        return stateMachineSystem;
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
        tweenSystem = new TweenSystem();
        followPathSystem = new FollowPathSystem();
        particleSystem = new ParticleSystem();
        stateMachineSystem = new StateMachineSystem();
        actionExecutor = new ActionExecutor(services);

        actionExecutor.triggerEvent(currentSceneData, "start");

        Gdx.app.log("GameKit", "Initialized Playroom libGDX runtime for: " + sceneLoader.getProjectName());
    }

    @Override
    public void resize(int width, int height) {
        viewport.update(width, height);
    }

    private long lastSceneMtime = 0L;
    private float mtimePollTimer = 0f;

    public void reloadScene() {
        if (sceneLoader == null) return;
        sceneLoader.loadProject("gamekit/project.json");
        String scenePath = "gamekit/scenes/" + sceneLoader.getActiveSceneFile();
        currentSceneData = sceneLoader.loadScene(scenePath);

        com.badlogic.gdx.files.FileHandle fh = Gdx.files.internal(scenePath);
        if (fh.exists()) {
            lastSceneMtime = fh.lastModified();
        }

        if (physicsSystem != null) {
            physicsSystem.init(currentSceneData);
        }
        if (actionExecutor != null) {
            actionExecutor.triggerEvent(currentSceneData, "start");
        }
        Gdx.app.log("GameKit", "Hot-reloaded scene: " + currentSceneData.name);
    }

    @Override
    public void render() {
        float delta = Gdx.graphics.getDeltaTime();

        // Hot-reload check: F5, Ctrl+R, or file change
        if (Gdx.input.isKeyJustPressed(com.badlogic.gdx.Input.Keys.F5) ||
            ((Gdx.input.isKeyPressed(com.badlogic.gdx.Input.Keys.CONTROL_LEFT) || Gdx.input.isKeyPressed(com.badlogic.gdx.Input.Keys.CONTROL_RIGHT)) &&
             Gdx.input.isKeyJustPressed(com.badlogic.gdx.Input.Keys.R))) {
            reloadScene();
        }

        mtimePollTimer += delta;
        if (mtimePollTimer >= 1.0f) {
            mtimePollTimer = 0f;
            if (sceneLoader != null) {
                String scenePath = "gamekit/scenes/" + sceneLoader.getActiveSceneFile();
                com.badlogic.gdx.files.FileHandle fh = Gdx.files.internal(scenePath);
                if (fh.exists()) {
                    long currentMtime = fh.lastModified();
                    if (lastSceneMtime > 0 && currentMtime > lastSceneMtime) {
                        reloadScene();
                    } else if (lastSceneMtime == 0) {
                        lastSceneMtime = currentMtime;
                    }
                }
            }
        }

        // 1. Process player controls
        playerControllerSystem.update(currentSceneData, physicsSystem, delta);

        // 2. Update tweens, path followers, particles & state machines
        tweenSystem.update(currentSceneData, delta);
        followPathSystem.update(currentSceneData, delta);
        particleSystem.update(currentSceneData, delta);
        stateMachineSystem.update(currentSceneData, delta, actionExecutor);

        // 3. Step Box2D simulation
        physicsSystem.update(delta);

        // 4. Update camera tracking
        entityRenderer.updateCamera(currentSceneData, camera, delta);
        camera.update();

        // 5. Render frame
        ScreenUtils.clear(currentSceneData.backgroundColor);
        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        entityRenderer.render(currentSceneData, batch, delta);
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
