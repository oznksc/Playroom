package com.playroom.runtime.debug;

import com.badlogic.gdx.Application;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Graphics;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.Preferences;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.PixmapIO;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShaderProgram;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.Body;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.badlogic.gdx.physics.box2d.RayCastCallback;
import com.badlogic.gdx.physics.box2d.World;
import com.badlogic.gdx.utils.Base64Coder;
import com.badlogic.gdx.utils.JsonReader;
import com.badlogic.gdx.utils.JsonValue;
import com.playroom.runtime.GameKitGame;
import com.playroom.runtime.SceneLoader;
import com.playroom.runtime.audio.AudioSystem;
import com.playroom.runtime.components.*;
import com.playroom.runtime.graphics.EntityRenderer;
import com.playroom.runtime.physics.PhysicsSystem;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;
import com.playroom.runtime.systems.GameRulesSystem;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class DebugApi {
    private final GameKitGame game;

    public DebugApi(GameKitGame game) {
        this.game = game;
    }

    public String handle(String method, String path, Map<String, String> query, String body) {
        String m = method == null ? "GET" : method.toUpperCase(Locale.US);
        if (path == null || path.isEmpty()) path = "/";

        switch (path) {
            case "/health":
                return ok("health", health());
            case "/capabilities":
                return ok("capabilities", capabilities());
            case "/application":
                return ok("application", application());
            case "/world":
                return ok("world", world(query.get("detail")));
            case "/entity":
                return inspectEntity(query.get("id"));
            case "/entity/spawn":
                return requirePost(m, () -> spawnEntity(body));
            case "/entity/remove":
                return requirePost(m, () -> removeEntity(body, query.get("id")));
            case "/component/set":
                return requirePost(m, () -> setComponent(body));
            case "/control":
                return requirePost(m, () -> control(body));
            case "/perf":
                return ok("perf", perf());
            case "/graphics":
                return ok("graphics", graphics());
            case "/gl":
                return ok("gl", gl());
            case "/shaders":
                return ok("shaders", shaders());
            case "/shaders/reload":
                return requirePost(m, () -> reloadShader(body));
            case "/render-mode":
                return requirePost(m, () -> setRenderMode(body, query.get("mode")));
            case "/camera":
                return "POST".equals(m) ? setCamera(body) : ok("camera", cameraJson());
            case "/capture":
                return requirePost(m, this::captureFrame);
            case "/input":
                return "POST".equals(m) ? injectInput(body) : ok("input", inputState());
            case "/audio":
                return ok("audio", audioState());
            case "/physics":
                return ok("physics", physicsState());
            case "/physics/gravity":
                return requirePost(m, () -> setGravity(body));
            case "/physics/raycast":
                return requirePost(m, () -> raycast(body));
            case "/files":
                return ok("files", listFiles(query.get("path")));
            case "/preferences":
                return "POST".equals(m) ? setPreference(body) : ok("preferences", getPreferences(query.get("name")));
            case "/display":
                return ok("display", display());
            default:
                return err("Unknown debug route: " + m + " " + path);
        }
    }

    private String requirePost(String method, SupplierEx supplier) {
        if (!"POST".equals(method)) return err("Method not allowed, use POST");
        try {
            return supplier.get();
        } catch (Exception e) {
            return err(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        }
    }

    private interface SupplierEx {
        String get() throws Exception;
    }

    private String ok(String key, String payload) {
        return DebugJson.obj("ok", true, key, DebugJson.raw(payload));
    }

    private String err(String message) {
        return DebugJson.obj("ok", false, "error", message);
    }

    private JsonValue parseBody(String body) {
        if (body == null || body.isBlank()) return new JsonValue(JsonValue.ValueType.object);
        try {
            JsonValue v = new JsonReader().parse(body);
            return v != null ? v : new JsonValue(JsonValue.ValueType.object);
        } catch (Exception e) {
            return new JsonValue(JsonValue.ValueType.object);
        }
    }

    private String health() {
        DebugController d = DebugController.get();
        return DebugJson.obj(
            "status", "ok",
            "port", d.port,
            "paused", d.paused,
            "pendingSteps", d.pendingSteps,
            "frameIndex", d.frameIndex,
            "fps", d.lastFps,
            "scene", game.getCurrentSceneData() != null ? game.getCurrentSceneData().name : "",
            "appType", Gdx.app != null ? Gdx.app.getType().toString() : "unknown",
            "uptimeMs", System.currentTimeMillis() - d.startedAtMs
        );
    }

    private String capabilities() {
        List<String> routes = List.of(
            "GET /health",
            "GET /capabilities",
            "GET /application",
            "GET /world?detail=full|summary",
            "GET /entity?id=",
            "POST /entity/spawn",
            "POST /entity/remove",
            "POST /component/set",
            "POST /control {action:pause|resume|step|restart|reload}",
            "GET /perf",
            "GET /graphics",
            "GET /gl",
            "GET /shaders",
            "POST /shaders/reload",
            "POST /render-mode",
            "GET|POST /camera",
            "POST /capture",
            "GET|POST /input",
            "GET /audio",
            "GET /physics",
            "POST /physics/gravity",
            "POST /physics/raycast",
            "GET /files?path=",
            "GET|POST /preferences",
            "GET /display"
        );
        return DebugJson.obj(
            "engine", "libGDX",
            "gdxVersion", "1.13.1",
            "playroomRuntime", "GameKitGame",
            "routes", DebugJson.raw(DebugJson.arr(routes)),
            "renderModes", DebugJson.raw(DebugJson.arr(List.of("default", "colliders", "overdraw", "wireframe", "no_sprites", "physics"))),
            "notes", "All mutating routes run on the libGDX render thread. Hex/H3/territory APIs are not part of this runtime."
        );
    }

    private String application() {
        Application app = Gdx.app;
        return DebugJson.obj(
            "type", app.getType().toString(),
            "version", app.getVersion(),
            "javaHeap", app.getJavaHeap(),
            "nativeHeap", app.getNativeHeap(),
            "logLevel", app.getLogLevel(),
            "os", System.getProperty("os.name", ""),
            "osVersion", System.getProperty("os.version", ""),
            "javaVersion", System.getProperty("java.version", ""),
            "projectName", game.getSceneLoader() != null ? game.getSceneLoader().getProjectName() : "",
            "activeSceneFile", game.getSceneLoader() != null ? game.getSceneLoader().getActiveSceneFile() : "",
            "lifecyclePaused", DebugController.get().lifecyclePaused
        );
    }

    private String world(String detail) {
        SceneData scene = game.getCurrentSceneData();
        if (scene == null) return DebugJson.obj("error", "no scene loaded");
        boolean full = "full".equalsIgnoreCase(detail);
        List<String> entities = new ArrayList<>();
        for (Entity e : scene.entities) {
            entities.add(full ? entityJson(e, true) : entitySummary(e));
        }
        GameRulesSystem rules = game.getGameRulesSystem();
        return DebugJson.obj(
            "id", scene.id,
            "name", scene.name,
            "viewport", DebugJson.obj("width", scene.viewportWidth, "height", scene.viewportHeight),
            "background", "#" + scene.backgroundColor.toString(),
            "gravity", DebugJson.obj("x", scene.gravity.x, "y", scene.gravity.y),
            "entityCount", scene.entities.size(),
            "paused", DebugController.get().paused,
            "renderMode", DebugController.get().renderMode,
            "gameRules", rules == null ? DebugJson.obj() : DebugJson.obj(
                "score", rules.score,
                "lives", rules.lives,
                "gameOver", rules.gameOver,
                "gameWon", rules.gameWon,
                "fallDeathEnabled", rules.fallDeathEnabled,
                "fallDeathY", rules.fallDeathY
            ),
            "entities", DebugJson.raw(DebugJson.rawArr(entities.toArray(new String[0])))
        );
    }

    private String inspectEntity(String id) {
        if (id == null || id.isBlank()) return err("id is required");
        SceneData scene = game.getCurrentSceneData();
        if (scene == null) return err("no scene loaded");
        Entity entity = scene.findEntityById(id);
        if (entity == null) return err("entity not found: " + id);
        return ok("entity", entityJson(entity, true));
    }

    private String entitySummary(Entity e) {
        TransformComponent tc = e.getComponent(TransformComponent.class);
        List<String> types = new ArrayList<>();
        for (Component c : e.getComponents()) types.add(c.getType());
        Body body = game.getPhysicsSystem() != null ? game.getPhysicsSystem().getBody(e) : null;
        return DebugJson.obj(
            "id", e.id,
            "name", e.name,
            "active", e.active,
            "position", tc == null ? DebugJson.obj() : DebugJson.obj("x", tc.position.x, "y", tc.position.y),
            "rotation", tc == null ? 0f : tc.rotation,
            "components", DebugJson.raw(DebugJson.arr(types)),
            "hasPhysicsBody", body != null
        );
    }

    private String entityJson(Entity e, boolean includeComponents) {
        TransformComponent tc = e.getComponent(TransformComponent.class);
        List<String> comps = new ArrayList<>();
        if (includeComponents) {
            for (Component c : e.getComponents()) comps.add(componentJson(c));
        } else {
            for (Component c : e.getComponents()) comps.add(DebugJson.quote(c.getType()));
        }
        Body body = game.getPhysicsSystem() != null ? game.getPhysicsSystem().getBody(e) : null;
        return DebugJson.obj(
            "id", e.id,
            "name", e.name,
            "active", e.active,
            "transform", tc == null ? DebugJson.obj() : DebugJson.obj(
                "position", DebugJson.obj("x", tc.position.x, "y", tc.position.y),
                "rotation", tc.rotation,
                "scale", DebugJson.obj("x", tc.scale.x, "y", tc.scale.y)
            ),
            "components", DebugJson.raw("[" + String.join(",", comps) + "]"),
            "physics", body == null ? DebugJson.obj("present", false) : bodyJson(e, body)
        );
    }

    private String bodyJson(Entity entity, Body body) {
        Vector2 pos = body.getPosition();
        Vector2 vel = body.getLinearVelocity();
        return DebugJson.obj(
            "present", true,
            "type", body.getType().toString(),
            "positionMeters", DebugJson.obj("x", pos.x, "y", pos.y),
            "positionPixels", DebugJson.obj("x", pos.x * PhysicsSystem.PPM, "y", pos.y * PhysicsSystem.PPM),
            "velocityMeters", DebugJson.obj("x", vel.x, "y", vel.y),
            "angleDeg", Math.toDegrees(body.getAngle()),
            "awake", body.isAwake(),
            "active", body.isActive(),
            "mass", body.getMass(),
            "gravityScale", body.getGravityScale(),
            "fixtureCount", body.getFixtureList().size
        );
    }

    private String componentJson(Component c) {
        if (c instanceof TransformComponent tc) {
            return DebugJson.obj("type", "Transform", "position", DebugJson.obj("x", tc.position.x, "y", tc.position.y),
                "rotation", tc.rotation, "scale", DebugJson.obj("x", tc.scale.x, "y", tc.scale.y));
        }
        if (c instanceof SpriteComponent sc) {
            return DebugJson.obj("type", "Sprite", "assetId", sc.assetId, "width", sc.width, "height", sc.height,
                "flipX", sc.flipX, "flipY", sc.flipY, "tint", "#" + sc.tint.toString(),
                "anchor", DebugJson.obj("x", sc.anchor.x, "y", sc.anchor.y));
        }
        if (c instanceof RigidBodyComponent rb) {
            return DebugJson.obj("type", "RigidBody", "velocity", DebugJson.obj("x", rb.velocity.x, "y", rb.velocity.y),
                "angularVelocity", rb.angularVelocity, "mass", rb.mass, "drag", rb.drag,
                "isKinematic", rb.isKinematic, "gravityScale", rb.gravityScale, "useGravity", rb.useGravity);
        }
        if (c instanceof AabbColliderComponent a) {
            return DebugJson.obj("type", "AabbCollider", "offset", DebugJson.obj("x", a.offset.x, "y", a.offset.y),
                "size", DebugJson.obj("x", a.size.x, "y", a.size.y), "isStatic", a.isStatic, "isTrigger", a.isTrigger,
                "layer", a.layer, "mask", a.mask);
        }
        if (c instanceof CircleColliderComponent cc) {
            return DebugJson.obj("type", "CircleCollider", "offset", DebugJson.obj("x", cc.offset.x, "y", cc.offset.y),
                "radius", cc.radius, "isStatic", cc.isStatic, "isTrigger", cc.isTrigger, "layer", cc.layer, "mask", cc.mask);
        }
        if (c instanceof PolygonColliderComponent pc) {
            return DebugJson.obj("type", "PolygonCollider", "vertexCount", pc.vertices == null ? 0 : pc.vertices.length / 2,
                "isStatic", pc.isStatic, "isTrigger", pc.isTrigger);
        }
        if (c instanceof PlayerControllerComponent p) {
            return DebugJson.obj("type", "PlayerController", "speed", p.speed, "jumpVelocity", p.jumpVelocity, "gravity", p.gravity);
        }
        if (c instanceof CameraFollowComponent cf) {
            return DebugJson.obj("type", "CameraFollow", "targetId", cf.targetId, "smoothing", cf.smoothing,
                "offset", DebugJson.obj("x", cf.offset.x, "y", cf.offset.y));
        }
        if (c instanceof TextComponent t) {
            return DebugJson.obj("type", "Text", "text", t.text, "size", t.size, "align", t.align, "fontAssetId", t.fontAssetId);
        }
        if (c instanceof AudioSourceComponent a) {
            return DebugJson.obj("type", "AudioSource", "assetId", a.assetId, "volume", a.volume, "loop", a.loop, "playOnStart", a.playOnStart);
        }
        if (c instanceof AudioListenerComponent a) {
            return DebugJson.obj("type", "AudioListener", "enabled", a.enabled);
        }
        if (c instanceof AnimationComponent a) {
            return DebugJson.obj("type", "Animation", "assetId", a.assetId, "frameWidth", a.frameWidth, "frameHeight", a.frameHeight,
                "totalFrames", a.totalFrames, "framesPerSecond", a.framesPerSecond, "loop", a.loop, "currentFrame", a.currentFrame);
        }
        if (c instanceof TilemapComponent t) {
            return DebugJson.obj("type", "Tilemap", "tilesetId", t.tilesetId, "tileWidth", t.tileWidth, "tileHeight", t.tileHeight,
                "gridWidth", t.gridWidth, "gridHeight", t.gridHeight, "solid", t.solid,
                "tileCount", t.tiles == null ? 0 : t.tiles.length);
        }
        if (c instanceof TweenComponent t) {
            return DebugJson.obj("type", "Tween", "property", t.property, "startValue", t.startValue, "endValue", t.endValue,
                "duration", t.duration, "easing", t.easing, "loop", t.loop, "pingPong", t.pingPong, "elapsed", t.elapsed, "active", t.active);
        }
        if (c instanceof FollowPathComponent f) {
            return DebugJson.obj("type", "FollowPath", "speed", f.speed, "loop", f.loop, "pointCount", f.points.size(),
                "currentPointIndex", f.currentPointIndex);
        }
        if (c instanceof Light2DComponent l) {
            return DebugJson.obj("type", "Light2D", "kind", l.kind, "range", l.range, "intensity", l.intensity, "color", l.color);
        }
        if (c instanceof NineSliceComponent n) {
            return DebugJson.obj("type", "NineSlice", "assetId", n.assetId, "width", n.width, "height", n.height);
        }
        if (c instanceof ParticleSystemComponent p) {
            return DebugJson.obj("type", "ParticleSystem", "maxParticles", p.maxParticles, "emissionRate", p.emissionRate,
                "lifetime", p.lifetime, "active", p.active);
        }
        if (c instanceof StateMachineComponent s) {
            return DebugJson.obj("type", "StateMachine", "initialState", s.initialState, "currentState", s.currentState,
                "stateTimer", s.stateTimer, "stateCount", s.states.size());
        }
        if (c instanceof ScriptComponent s) {
            return DebugJson.obj("type", "Script", "handlerCount", s.handlers.size());
        }
        return DebugJson.obj("type", c.getType());
    }

    private String spawnEntity(String body) {
        SceneData scene = game.getCurrentSceneData();
        if (scene == null) return err("no scene loaded");
        JsonValue json = parseBody(body);
        SceneLoader loader = game.getSceneLoader();
        Entity entity = loader.parseEntity(json);
        if (entity == null) return err("could not parse entity JSON");
        if (entity.id == null || entity.id.isBlank()) {
            entity.id = "e-" + System.currentTimeMillis();
        }
        if (scene.findEntityById(entity.id) != null) {
            entity.id = entity.id + "-" + System.currentTimeMillis();
        }
        if (entity.getComponent(TransformComponent.class) == null) {
            float x = json.has("x") ? json.getFloat("x") : 0f;
            float y = json.has("y") ? json.getFloat("y") : 0f;
            entity.addComponent(new TransformComponent(x, y));
        }
        scene.entities.add(entity);
        if (game.getPhysicsSystem() != null) game.getPhysicsSystem().addEntity(entity);
        return ok("entity", entityJson(entity, true));
    }

    private String removeEntity(String body, String queryId) {
        SceneData scene = game.getCurrentSceneData();
        if (scene == null) return err("no scene loaded");
        JsonValue json = parseBody(body);
        String id = queryId;
        if ((id == null || id.isBlank()) && json.has("id")) id = json.getString("id");
        if ((id == null || id.isBlank()) && json.has("entityId")) id = json.getString("entityId");
        if (id == null || id.isBlank()) return err("id is required");
        Entity entity = scene.findEntityById(id);
        if (entity == null) return err("entity not found: " + id);
        if (game.getPhysicsSystem() != null) game.getPhysicsSystem().removeEntity(entity);
        scene.entities.remove(entity);
        return DebugJson.obj("ok", true, "removedId", id);
    }

    private String setComponent(String body) {
        JsonValue json = parseBody(body);
        String id = json.getString("entityId", json.getString("id", ""));
        if (id.isBlank()) return err("entityId is required");
        SceneData scene = game.getCurrentSceneData();
        if (scene == null) return err("no scene loaded");
        Entity entity = scene.findEntityById(id);
        if (entity == null) return err("entity not found: " + id);
        JsonValue componentJson = json.get("component");
        if (componentJson == null) return err("component object is required");
        Component component = game.getSceneLoader().parseComponent(componentJson);
        if (component == null) return err("unknown or invalid component type");
        entity.setComponent(component);
        boolean physicsRelated = component instanceof RigidBodyComponent
            || component instanceof ColliderComponent
            || component instanceof TransformComponent
            || component instanceof TilemapComponent
            || component instanceof PlayerControllerComponent;
        if (physicsRelated && game.getPhysicsSystem() != null) {
            game.getPhysicsSystem().rebuildEntity(entity);
        }
        return ok("entity", entityJson(entity, true));
    }

    private String control(String body) {
        JsonValue json = parseBody(body);
        String action = json.getString("action", json.getString("command", ""));
        DebugController d = DebugController.get();
        switch (action) {
            case "pause":
                d.paused = true;
                break;
            case "resume":
                d.paused = false;
                d.pendingSteps = 0;
                break;
            case "step":
                d.requestStep(json.getInt("frames", 1));
                break;
            case "reload":
            case "restart":
                game.reloadScene();
                d.paused = "restart".equals(action) ? false : d.paused;
                d.pendingSteps = 0;
                break;
            default:
                return err("unknown action '" + action + "' (pause|resume|step|reload|restart)");
        }
        return DebugJson.obj(
            "ok", true,
            "action", action,
            "paused", d.paused,
            "pendingSteps", d.pendingSteps,
            "scene", game.getCurrentSceneData() != null ? game.getCurrentSceneData().name : ""
        );
    }

    private String perf() {
        DebugController d = DebugController.get();
        EntityRenderer renderer = game.getRenderer();
        SpriteBatch batch = game.getBatch();
        float triangles = d.lastVertexCount > 0 ? d.lastVertexCount / 3f : 0f;
        return DebugJson.obj(
            "fps", d.lastFps,
            "frameTimeMs", d.lastDelta * 1000f,
            "delta", d.lastDelta,
            "frameIndex", d.frameIndex,
            "glDrawCalls", d.lastDrawCalls,
            "glCalls", d.lastCalls,
            "shaderSwitches", d.lastShaderSwitches,
            "textureBindings", d.lastTextureBindings,
            "vertexCount", d.lastVertexCount,
            "triangles", triangles,
            "batchRenderCalls", d.lastBatchRenderCalls,
            "spriteBatchMaxSpritesInBatch", batch != null ? batch.maxSpritesInBatch : 0,
            "estimatedPrimitiveDraws", renderer != null ? renderer.getLastDrawCallsEstimate() : 0,
            "spriteDraws", renderer != null ? renderer.getLastSpriteDraws() : 0,
            "tileDraws", renderer != null ? renderer.getLastTileDraws() : 0,
            "textDraws", renderer != null ? renderer.getLastTextDraws() : 0,
            "animDraws", renderer != null ? renderer.getLastAnimDraws() : 0,
            "nineSliceDraws", renderer != null ? renderer.getLastNineSliceDraws() : 0,
            "javaHeap", Gdx.app.getJavaHeap(),
            "nativeHeap", Gdx.app.getNativeHeap()
        );
    }

    private String graphics() {
        Graphics g = Gdx.graphics;
        DebugController d = DebugController.get();
        EntityRenderer renderer = game.getRenderer();
        List<String> textures = new ArrayList<>();
        if (renderer != null) textures.addAll(renderer.getCachedTextureIds());
        return DebugJson.obj(
            "width", g.getWidth(),
            "height", g.getHeight(),
            "backBufferWidth", g.getBackBufferWidth(),
            "backBufferHeight", g.getBackBufferHeight(),
            "deltaTime", g.getDeltaTime(),
            "fps", g.getFramesPerSecond(),
            "density", g.getDensity(),
            "ppcX", g.getPpcX(),
            "ppcY", g.getPpcY(),
            "ppiX", g.getPpiX(),
            "ppiY", g.getPpiY(),
            "safeInsetLeft", g.getSafeInsetLeft(),
            "safeInsetRight", g.getSafeInsetRight(),
            "safeInsetTop", g.getSafeInsetTop(),
            "safeInsetBottom", g.getSafeInsetBottom(),
            "gl30", g.isGL30Available(),
            "glVersion", g.getGLVersion() != null ? g.getGLVersion().getDebugVersionString() : "",
            "renderMode", d.renderMode,
            "cachedTextures", DebugJson.raw(DebugJson.arr(textures))
        );
    }

    private String gl() {
        DebugController d = DebugController.get();
        return DebugJson.obj(
            "profilerEnabled", d.profiler != null && d.profiler.isEnabled(),
            "calls", d.lastCalls,
            "drawCalls", d.lastDrawCalls,
            "shaderSwitches", d.lastShaderSwitches,
            "textureBindings", d.lastTextureBindings,
            "vertexCount", d.lastVertexCount,
            "triangles", d.lastVertexCount / 3f
        );
    }

    private String shaders() {
        DebugController d = DebugController.get();
        String def = DebugJson.obj(
            "name", "spritebatch-default",
            "kind", "SpriteBatch built-in",
            "compiled", true,
            "active", "spritebatch-default".equals(d.customShaderName)
        );
        String custom = DebugJson.obj(
            "name", d.customShaderName,
            "vertPath", d.customShaderVertPath,
            "fragPath", d.customShaderFragPath,
            "compiled", d.customShaderCompiled,
            "log", d.customShaderLog
        );
        return DebugJson.obj("shaders", DebugJson.raw("[" + def + "," + custom + "]"));
    }

    private String reloadShader(String body) {
        JsonValue json = parseBody(body);
        String vertPath = json.getString("vertPath", json.getString("vertex", ""));
        String fragPath = json.getString("fragPath", json.getString("fragment", ""));
        String name = json.getString("name", "custom");
        DebugController d = DebugController.get();
        if (vertPath.isBlank() || fragPath.isBlank()) {
            game.getBatch().setShader(null);
            d.customShaderName = "spritebatch-default";
            d.customShaderCompiled = true;
            d.customShaderLog = "reverted to SpriteBatch default shader";
            return ok("shader", DebugJson.obj("name", d.customShaderName, "compiled", true, "log", d.customShaderLog));
        }
        ShaderProgram.pedantic = false;
        ShaderProgram shader = new ShaderProgram(Gdx.files.internal(vertPath), Gdx.files.internal(fragPath));
        d.customShaderName = name;
        d.customShaderVertPath = vertPath;
        d.customShaderFragPath = fragPath;
        d.customShaderCompiled = shader.isCompiled();
        d.customShaderLog = shader.getLog() == null ? "" : shader.getLog();
        if (shader.isCompiled()) {
            game.getBatch().setShader(shader);
        }
        return DebugJson.obj(
            "ok", shader.isCompiled(),
            "shader", DebugJson.obj(
                "name", name,
                "compiled", shader.isCompiled(),
                "log", d.customShaderLog,
                "vertPath", vertPath,
                "fragPath", fragPath
            )
        );
    }

    private String setRenderMode(String body, String queryMode) {
        JsonValue json = parseBody(body);
        String mode = queryMode;
        if (mode == null || mode.isBlank()) mode = json.getString("mode", "default");
        DebugController.get().renderMode = mode;
        if (game.getRenderer() != null) game.getRenderer().setRenderMode(mode);
        return DebugJson.obj("ok", true, "mode", mode);
    }

    private String cameraJson() {
        OrthographicCamera cam = game.getCamera();
        if (cam == null) return DebugJson.obj("error", "camera not ready");
        return DebugJson.obj(
            "x", cam.position.x,
            "y", cam.position.y,
            "z", cam.position.z,
            "zoom", cam.zoom,
            "up", DebugJson.obj("x", cam.up.x, "y", cam.up.y, "z", cam.up.z),
            "viewportWidth", cam.viewportWidth,
            "viewportHeight", cam.viewportHeight,
            "near", cam.near,
            "far", cam.far
        );
    }

    private String setCamera(String body) {
        OrthographicCamera cam = game.getCamera();
        if (cam == null) return err("camera not ready");
        JsonValue json = parseBody(body);
        if (json.has("x")) cam.position.x = json.getFloat("x");
        if (json.has("y")) cam.position.y = json.getFloat("y");
        if (json.has("zoom")) cam.zoom = json.getFloat("zoom");
        cam.update();
        return ok("camera", cameraJson());
    }

    private String captureFrame() {
        DebugController d = DebugController.get();
        try {
            int w = Gdx.graphics.getBackBufferWidth();
            int h = Gdx.graphics.getBackBufferHeight();
            Pixmap fb = Pixmap.createFromFrameBuffer(0, 0, w, h);
            Pixmap flipped = new Pixmap(w, h, fb.getFormat());
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    flipped.drawPixel(x, y, fb.getPixel(x, h - y - 1));
                }
            }
            fb.dispose();
            String name = "playroom-captures/frame-" + System.currentTimeMillis() + ".png";
            FileHandle out = Gdx.files.local(name);
            out.parent().mkdirs();
            PixmapIO.writePNG(out, flipped);
            byte[] bytes = out.readBytes();
            String b64 = "";
            if (bytes != null && bytes.length > 0 && bytes.length < 1_500_000) {
                b64 = new String(Base64Coder.encode(bytes));
            }
            d.lastCapturePath = out.file() != null ? out.file().getAbsolutePath() : out.path();
            d.lastCaptureBase64 = b64;
            d.lastCaptureWidth = w;
            d.lastCaptureHeight = h;
            d.lastCaptureError = "";
            flipped.dispose();
            return DebugJson.obj(
                "ok", true,
                "path", d.lastCapturePath,
                "width", w,
                "height", h,
                "bytes", bytes == null ? 0 : bytes.length,
                "base64", b64.isEmpty() ? "" : b64
            );
        } catch (Exception e) {
            d.lastCaptureError = e.getMessage();
            return err("capture failed: " + e.getMessage());
        }
    }

    private String inputState() {
        Input in = Gdx.input;
        DebugController d = DebugController.get();
        int[] held = d.heldKeyArray();
        List<Integer> heldList = new ArrayList<>();
        for (int k : held) heldList.add(k);
        return DebugJson.obj(
            "x", in.getX(),
            "y", in.getY(),
            "deltaX", in.getDeltaX(),
            "deltaY", in.getDeltaY(),
            "touched", in.isTouched(),
            "justTouched", in.justTouched(),
            "maxPointers", in.getMaxPointers(),
            "accelerometerAvailable", in.isPeripheralAvailable(Input.Peripheral.Accelerometer),
            "accelerometer", DebugJson.obj("x", in.getAccelerometerX(), "y", in.getAccelerometerY(), "z", in.getAccelerometerZ()),
            "gyroscopeAvailable", in.isPeripheralAvailable(Input.Peripheral.Gyroscope),
            "compassAvailable", in.isPeripheralAvailable(Input.Peripheral.Compass),
            "vibratorAvailable", in.isPeripheralAvailable(Input.Peripheral.Vibrator),
            "nativeOrientation", in.getNativeOrientation().toString(),
            "rotation", in.getRotation(),
            "left", in.isKeyPressed(Input.Keys.LEFT) || in.isKeyPressed(Input.Keys.A) || DebugController.isKeyHeld(Input.Keys.LEFT),
            "right", in.isKeyPressed(Input.Keys.RIGHT) || in.isKeyPressed(Input.Keys.D) || DebugController.isKeyHeld(Input.Keys.RIGHT),
            "jump", in.isKeyPressed(Input.Keys.SPACE) || in.isKeyPressed(Input.Keys.W) || in.isKeyPressed(Input.Keys.UP),
            "injectedHeldKeycodes", DebugJson.raw(DebugJson.arr(heldList))
        );
    }

    private String injectInput(String body) {
        JsonValue json = parseBody(body);
        DebugController d = DebugController.get();
        if (json.getBoolean("clear", false)) d.clearInput();
        if (json.has("left")) d.holdKey(Input.Keys.LEFT, json.getBoolean("left"));
        if (json.has("right")) d.holdKey(Input.Keys.RIGHT, json.getBoolean("right"));
        if (json.has("jump") && json.getBoolean("jump")) d.tapKey(Input.Keys.SPACE);
        if (json.has("keycode")) {
            int code = json.getInt("keycode");
            boolean down = json.getBoolean("down", true);
            if (json.getBoolean("tap", false)) d.tapKey(code);
            else d.holdKey(code, down);
        }
        if (json.has("key")) {
            int code = Input.Keys.valueOf(json.getString("key"));
            if (code != -1) {
                if (json.getBoolean("tap", false)) d.tapKey(code);
                else d.holdKey(code, json.getBoolean("down", true));
            }
        }
        return ok("input", inputState());
    }

    private String audioState() {
        AudioSystem audio = game.getAudioSystem();
        if (audio == null) return DebugJson.obj("available", false);
        List<String> cached = new ArrayList<>(audio.getCachedSoundIds());
        List<String> active = new ArrayList<>();
        for (Map.Entry<String, Long> e : audio.getActiveSoundInstances().entrySet()) {
            active.add(DebugJson.obj("entityId", e.getKey(), "soundId", e.getValue()));
        }
        return DebugJson.obj(
            "available", Gdx.audio != null,
            "hasListener", audio.hasListener(),
            "listener", DebugJson.obj("x", audio.getListenerPos().x, "y", audio.getListenerPos().y),
            "cachedSounds", DebugJson.raw(DebugJson.arr(cached)),
            "activeInstances", DebugJson.raw("[" + String.join(",", active) + "]")
        );
    }

    private String physicsState() {
        PhysicsSystem physics = game.getPhysicsSystem();
        if (physics == null || physics.getWorld() == null) return DebugJson.obj("available", false);
        World world = physics.getWorld();
        List<String> bodies = new ArrayList<>();
        for (Map.Entry<Entity, Body> e : physics.getEntityBodies().entrySet()) {
            bodies.add(DebugJson.obj(
                "entityId", e.getKey().id,
                "entityName", e.getKey().name,
                "body", DebugJson.raw(bodyJson(e.getKey(), e.getValue()))
            ));
        }
        Vector2 g = world.getGravity();
        return DebugJson.obj(
            "available", true,
            "ppm", PhysicsSystem.PPM,
            "bodyCount", physics.getBodyCount(),
            "autoClearForces", world.getAutoClearForces(),
            "gravityMeters", DebugJson.obj("x", g.x, "y", g.y),
            "gravityPixels", DebugJson.obj("x", g.x * PhysicsSystem.PPM, "y", g.y * PhysicsSystem.PPM),
            "bodies", DebugJson.raw("[" + String.join(",", bodies) + "]")
        );
    }

    private String setGravity(String body) {
        JsonValue json = parseBody(body);
        float x = json.getFloat("x", 0f);
        float y = json.getFloat("y", 1800f);
        SceneData scene = game.getCurrentSceneData();
        if (scene != null) scene.gravity.set(x, y);
        if (game.getPhysicsSystem() != null) game.getPhysicsSystem().setGravityPixels(x, y);
        return DebugJson.obj("ok", true, "gravity", DebugJson.obj("x", x, "y", y, "units", "pixels-per-second-squared"));
    }

    private String raycast(String body) {
        PhysicsSystem physics = game.getPhysicsSystem();
        if (physics == null || physics.getWorld() == null) return err("physics world not ready");
        JsonValue json = parseBody(body);
        float x1 = json.getFloat("x1", 0f) * PhysicsSystem.PPM_INV;
        float y1 = json.getFloat("y1", 0f) * PhysicsSystem.PPM_INV;
        float x2 = json.getFloat("x2", 0f) * PhysicsSystem.PPM_INV;
        float y2 = json.getFloat("y2", 0f) * PhysicsSystem.PPM_INV;
        final String[] hit = { DebugJson.obj("hit", false) };
        RayCastCallback cb = (fixture, point, normal, fraction) -> {
            Object user = fixture.getBody().getUserData();
            String entityId = user instanceof Entity ? ((Entity) user).id : "";
            hit[0] = DebugJson.obj(
                "hit", true,
                "fraction", fraction,
                "entityId", entityId,
                "pointPixels", DebugJson.obj("x", point.x * PhysicsSystem.PPM, "y", point.y * PhysicsSystem.PPM),
                "normal", DebugJson.obj("x", normal.x, "y", normal.y),
                "sensor", fixture.isSensor()
            );
            return fraction;
        };
        physics.getWorld().rayCast(cb, x1, y1, x2, y2);
        return DebugJson.obj("ok", true, "raycast", DebugJson.raw(hit[0]));
    }

    private String listFiles(String path) {
        String p = path == null || path.isBlank() ? "gamekit" : path;
        FileHandle handle = Gdx.files.internal(p);
        if (!handle.exists()) handle = Gdx.files.local(p);
        if (!handle.exists()) return DebugJson.obj("path", p, "exists", false, "entries", DebugJson.raw("[]"));
        List<String> entries = new ArrayList<>();
        if (handle.isDirectory()) {
            FileHandle[] children = handle.list();
            if (children != null) {
                for (FileHandle child : children) {
                    entries.add(DebugJson.obj(
                        "name", child.name(),
                        "path", child.path(),
                        "directory", child.isDirectory(),
                        "length", child.isDirectory() ? 0 : child.length()
                    ));
                }
            }
        } else {
            entries.add(DebugJson.obj("name", handle.name(), "path", handle.path(), "directory", false, "length", handle.length()));
        }
        return DebugJson.obj("path", p, "exists", true, "directory", handle.isDirectory(),
            "entries", DebugJson.raw("[" + String.join(",", entries) + "]"));
    }

    private String getPreferences(String name) {
        String n = name == null || name.isBlank() ? "playroom" : name;
        Preferences prefs = Gdx.app.getPreferences(n);
        return DebugJson.obj("name", n, "keys", DebugJson.raw(DebugJson.arr(prefs.get().keySet())));
    }

    private String setPreference(String body) {
        JsonValue json = parseBody(body);
        String name = json.getString("name", "playroom");
        String key = json.getString("key", "");
        if (key.isBlank()) return err("key is required");
        Preferences prefs = Gdx.app.getPreferences(name);
        if (json.has("value")) prefs.putString(key, json.getString("value"));
        prefs.flush();
        return DebugJson.obj("ok", true, "name", name, "key", key, "value", prefs.getString(key, ""));
    }

    private String display() {
        Graphics g = Gdx.graphics;
        Graphics.DisplayMode current = g.getDisplayMode();
        Graphics.DisplayMode[] modes = g.getDisplayModes();
        List<String> list = new ArrayList<>();
        if (modes != null) {
            for (Graphics.DisplayMode mode : modes) {
                list.add(DebugJson.obj("width", mode.width, "height", mode.height, "refreshRate", mode.refreshRate, "bitsPerPixel", mode.bitsPerPixel));
            }
        }
        return DebugJson.obj(
            "current", current == null ? DebugJson.obj() : DebugJson.obj("width", current.width, "height", current.height, "refreshRate", current.refreshRate),
            "fullscreen", g.isFullscreen(),
            "modes", DebugJson.raw("[" + String.join(",", list) + "]")
        );
    }
}
