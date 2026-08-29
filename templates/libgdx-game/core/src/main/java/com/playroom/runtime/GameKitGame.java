package com.playroom.runtime;

import com.badlogic.gdx.ApplicationListener;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.ScreenUtils;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.playroom.runtime.audio.AudioSystem;
import com.playroom.runtime.debug.DebugApi;
import com.playroom.runtime.debug.DebugController;
import com.playroom.runtime.debug.DebugHttpServer;
import com.playroom.runtime.debug.DebugOverlay;
import com.badlogic.gdx.graphics.profiling.GLProfiler;
import com.playroom.runtime.graphics.EntityRenderer;
import com.playroom.runtime.gui.GuiRenderer;
import com.playroom.runtime.input.PlayerControllerSystem;
import com.playroom.runtime.physics.PhysicsSystem;
import com.playroom.runtime.save.SaveSystem;
import com.playroom.runtime.scene.SceneData;
import com.playroom.runtime.scene.SceneManager;
import com.playroom.runtime.script.ActionExecutor;
import com.playroom.runtime.services.GameServices;
import com.playroom.runtime.services.MockGameServices;
import com.playroom.runtime.systems.FollowPathSystem;
import com.playroom.runtime.systems.GameRulesSystem;
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
    private AudioSystem audioSystem;
    private GameRulesSystem gameRulesSystem;
    private SceneManager sceneManager;
    private SaveSystem saveSystem;
    private GuiRenderer guiRenderer;
    private EntityRenderer entityRenderer;
    private ActionExecutor actionExecutor;
    private DebugHttpServer debugServer;
    private DebugOverlay debugOverlay;

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

    public AudioSystem getAudioSystem() {
        return audioSystem;
    }

    public GameRulesSystem getGameRulesSystem() {
        return gameRulesSystem;
    }

    public OrthographicCamera getCamera() {
        return camera;
    }

    public Viewport getViewport() {
        return viewport;
    }

    public SpriteBatch getBatch() {
        return batch;
    }

    public EntityRenderer getRenderer() {
        return entityRenderer;
    }

    public SceneManager getSceneManager() {
        return sceneManager;
    }

    public SaveSystem getSaveSystem() {
        return saveSystem;
    }

    public GuiRenderer getGuiRenderer() {
        return guiRenderer;
    }

    @Override
    public void create() {
        batch = new SpriteBatch();
        entityRenderer = new EntityRenderer();
        entityRenderer.init();

        guiRenderer = new GuiRenderer();
        saveSystem = new SaveSystem();
        sceneManager = new SceneManager(this);

        sceneLoader = new SceneLoader();
        sceneLoader.loadProject("gamekit/project.json");

        currentSceneData = sceneLoader.loadScene("gamekit/scenes/" + sceneLoader.getActiveSceneFile());

        camera = new OrthographicCamera();
        camera.setToOrtho(true, currentSceneData.viewportWidth, currentSceneData.viewportHeight);
        viewport = new FitViewport(currentSceneData.viewportWidth, currentSceneData.viewportHeight, camera);
        guiRenderer.init(currentSceneData.viewportWidth, currentSceneData.viewportHeight);

        physicsSystem = new PhysicsSystem();
        physicsSystem.init(currentSceneData);

        playerControllerSystem = new PlayerControllerSystem();
        tweenSystem = new TweenSystem();
        followPathSystem = new FollowPathSystem();
        particleSystem = new ParticleSystem();
        stateMachineSystem = new StateMachineSystem();
        audioSystem = new AudioSystem();
        gameRulesSystem = new GameRulesSystem();
        gameRulesSystem.init(currentSceneData);

        actionExecutor = new ActionExecutor(services);
        actionExecutor.setAudioSystem(audioSystem);
        actionExecutor.setGameRulesSystem(gameRulesSystem);
        actionExecutor.setSceneManager(sceneManager);
        actionExecutor.setSaveSystem(saveSystem);

        actionExecutor.triggerEvent(currentSceneData, "start");

        DebugController debug = DebugController.get();
        debug.startedAtMs = System.currentTimeMillis();
        debug.profiler = new GLProfiler(Gdx.graphics);
        debug.profiler.enable();
        debugOverlay = new DebugOverlay();
        debugOverlay.init();
        debugServer = new DebugHttpServer(new DebugApi(this));
        debugServer.start();

        Gdx.app.log("GameKit", "Initialized Playroom libGDX runtime for: " + sceneLoader.getProjectName());
    }

    @Override
    public void resize(int width, int height) {
        viewport.update(width, height);
        if (guiRenderer != null) {
            guiRenderer.resize(width, height);
        }
    }

    private long lastSceneMtime = 0L;
    private float mtimePollTimer = 0f;

    public void loadSceneById(String sceneFileName) {
        if (sceneLoader == null) return;
        String scenePath = sceneFileName.startsWith("gamekit/scenes/") ? sceneFileName : ("gamekit/scenes/" + sceneFileName);
        currentSceneData = sceneLoader.loadScene(scenePath);

        camera.setToOrtho(true, currentSceneData.viewportWidth, currentSceneData.viewportHeight);
        viewport.setWorldSize(currentSceneData.viewportWidth, currentSceneData.viewportHeight);
        viewport.update(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());

        if (physicsSystem != null) {
            physicsSystem.init(currentSceneData);
        }
        if (gameRulesSystem != null) {
            gameRulesSystem.init(currentSceneData);
        }
        if (actionExecutor != null) {
            actionExecutor.triggerEvent(currentSceneData, "start");
        }
    }

    public void reloadScene() {
        if (sceneLoader == null) return;
        sceneLoader.loadProject("gamekit/project.json");
        String scenePath = "gamekit/scenes/" + sceneLoader.getActiveSceneFile();
        loadSceneById(scenePath);

        com.badlogic.gdx.files.FileHandle fh = Gdx.files.internal(scenePath);
        if (fh.exists()) {
            lastSceneMtime = fh.lastModified();
        }
        Gdx.app.log("GameKit", "Hot-reloaded scene: " + currentSceneData.name);
    }

    @Override
    public void render() {
        DebugController debug = DebugController.get();
        if (debug.profiler != null) debug.profiler.reset();

        boolean simulate = debug.consumeStep();
        float delta = simulate ? Gdx.graphics.getDeltaTime() : 0f;

        if (simulate) {
            // Hot-reload check: F5, Ctrl+R, or file change
            if (Gdx.input.isKeyJustPressed(com.badlogic.gdx.Input.Keys.F5) ||
                ((Gdx.input.isKeyPressed(com.badlogic.gdx.Input.Keys.CONTROL_LEFT) || Gdx.input.isKeyPressed(com.badlogic.gdx.Input.Keys.CONTROL_RIGHT)) &&
                 Gdx.input.isKeyJustPressed(com.badlogic.gdx.Input.Keys.R))) {
                reloadScene();
            }

            mtimePollTimer += Math.max(Gdx.graphics.getDeltaTime(), 0f);
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

            playerControllerSystem.update(currentSceneData, physicsSystem, delta);
            tweenSystem.update(currentSceneData, delta);
            followPathSystem.update(currentSceneData, delta);
            particleSystem.update(currentSceneData, delta);
            stateMachineSystem.update(currentSceneData, delta, actionExecutor);
            gameRulesSystem.update(currentSceneData, delta, actionExecutor);
            sceneManager.update(delta);
            physicsSystem.update(delta);
            entityRenderer.updateCamera(currentSceneData, camera, delta);
        }

        camera.update();
        com.badlogic.gdx.math.Vector2 camPos = new com.badlogic.gdx.math.Vector2(camera.position.x, camera.position.y);
        audioSystem.update(currentSceneData, camPos);

        ScreenUtils.clear(currentSceneData.backgroundColor);
        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        entityRenderer.render(currentSceneData, batch, delta);
        batch.end();

        if (debugOverlay != null) {
            debugOverlay.render(currentSceneData, camera, physicsSystem, debug.renderMode);
        }

        guiRenderer.updateAndRender(currentSceneData, batch, actionExecutor);

        batch.begin();
        sceneManager.renderTransitionOverlay(batch, currentSceneData.viewportWidth, currentSceneData.viewportHeight);
        batch.end();

        if (debug.profiler != null) {
            debug.lastCalls = debug.profiler.getCalls();
            debug.lastDrawCalls = debug.profiler.getDrawCalls();
            debug.lastShaderSwitches = debug.profiler.getShaderSwitches();
            debug.lastTextureBindings = debug.profiler.getTextureBindings();
            debug.lastVertexCount = debug.profiler.getVertexCount().total;
        }
        debug.lastFps = Gdx.graphics.getFramesPerSecond();
        debug.lastDelta = Gdx.graphics.getDeltaTime();
        debug.lastBatchRenderCalls = batch != null ? batch.renderCalls : 0;
        debug.frameIndex++;
        debug.endFrame();
    }

    @Override
    public void pause() {
        DebugController.get().lifecyclePaused = true;
    }

    @Override
    public void resume() {
        DebugController.get().lifecyclePaused = false;
    }

    @Override
    public void dispose() {
        if (debugServer != null) debugServer.stop();
        if (debugOverlay != null) debugOverlay.dispose();
        if (batch != null) batch.dispose();
        if (entityRenderer != null) entityRenderer.dispose();
        if (guiRenderer != null) guiRenderer.dispose();
        if (sceneManager != null) sceneManager.dispose();
        if (physicsSystem != null) physicsSystem.dispose();
        if (audioSystem != null) audioSystem.dispose();
    }
}
