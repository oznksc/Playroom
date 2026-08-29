package com.playroom.runtime;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.utils.JsonReader;
import com.badlogic.gdx.utils.JsonValue;
import com.playroom.runtime.components.*;
import com.playroom.runtime.gui.GuiNode;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;

public class SceneLoader {
    private String projectName = "Playroom Game";
    private String activeSceneFile = "main.scene.json";
    private JsonValue projectJson;

    public void loadProject(String path) {
        FileHandle file = Gdx.files.internal(path);
        if (file.exists()) {
            try {
                JsonReader reader = new JsonReader();
                projectJson = reader.parse(file);
                if (projectJson != null) {
                    if (projectJson.has("name")) {
                        projectName = projectJson.getString("name");
                    }
                    if (projectJson.has("activeScene")) {
                        activeSceneFile = projectJson.getString("activeScene");
                    }
                }
            } catch (Exception e) {
                Gdx.app.error("SceneLoader", "Failed to parse project json at: " + path, e);
            }
        }
    }

    public SceneData loadScene(String scenePath) {
        SceneData sceneData = new SceneData();
        FileHandle file = Gdx.files.internal(scenePath);
        if (!file.exists()) {
            Gdx.app.log("SceneLoader", "Scene file not found at " + scenePath + ", returning empty scene");
            return sceneData;
        }

        try {
            JsonReader reader = new JsonReader();
            JsonValue root = reader.parse(file);
            if (root == null) return sceneData;

            if (root.has("id")) sceneData.id = root.getString("id");
            if (root.has("name")) sceneData.name = root.getString("name");

            if (root.has("viewport")) {
                JsonValue vp = root.get("viewport");
                if (vp.has("width")) sceneData.viewportWidth = vp.getFloat("width");
                if (vp.has("height")) sceneData.viewportHeight = vp.getFloat("height");
                if (vp.has("background")) {
                    try {
                        sceneData.backgroundColor = Color.valueOf(vp.getString("background"));
                    } catch (Exception ignored) {}
                }
            }

            if (root.has("gravity")) {
                JsonValue grav = root.get("gravity");
                float gx = grav.has("x") ? grav.getFloat("x") : 0f;
                float gy = grav.has("y") ? grav.getFloat("y") : 1800f;
                sceneData.gravity.set(gx, gy);
            }

            if (root.has("entities")) {
                JsonValue entitiesArray = root.get("entities");
                for (JsonValue entityJson = entitiesArray.child; entityJson != null; entityJson = entityJson.next) {
                    Entity entity = parseEntity(entityJson);
                    if (entity != null) {
                        sceneData.entities.add(entity);
                    }
                }
            }

            if (root.has("guiNodes") || root.has("gui")) {
                JsonValue guiArray = root.has("guiNodes") ? root.get("guiNodes") : root.get("gui");
                for (JsonValue gJson = guiArray.child; gJson != null; gJson = gJson.next) {
                    GuiNode node = parseGuiNode(gJson);
                    if (node != null) {
                        sceneData.guiNodes.add(node);
                    }
                }
            }

            Gdx.app.log("SceneLoader", "Successfully loaded scene: " + sceneData.name + " (" + sceneData.entities.size() + " entities, " + sceneData.guiNodes.size() + " gui nodes)");
        } catch (Exception e) {
            Gdx.app.error("SceneLoader", "Error loading scene from: " + scenePath, e);
        }

        return sceneData;
    }

    public Entity parseEntityJson(String json) {
        if (json == null || json.isBlank()) return null;
        return parseEntity(new JsonReader().parse(json));
    }

    public Component parseComponentJson(String json) {
        if (json == null || json.isBlank()) return null;
        return parseComponent(new JsonReader().parse(json));
    }

    public Entity parseEntity(JsonValue json) {
        String id = json.has("id") ? json.getString("id") : "entity";
        String name = json.has("name") ? json.getString("name") : id;
        Entity entity = new Entity(id, name);

        if (json.has("components")) {
            JsonValue comps = json.get("components");
            for (JsonValue compJson = comps.child; compJson != null; compJson = compJson.next) {
                Component comp = parseComponent(compJson);
                if (comp != null) {
                    entity.addComponent(comp);
                }
            }
        }

        return entity;
    }

    public Component parseComponent(JsonValue json) {
        if (!json.has("type")) return null;
        String type = json.getString("type");

        switch (type) {
            case "Transform": {
                TransformComponent tc = new TransformComponent();
                if (json.has("position")) {
                    JsonValue pos = json.get("position");
                    tc.position.set(pos.getFloat("x", 0f), pos.getFloat("y", 0f));
                }
                tc.rotation = json.getFloat("rotation", 0f);
                if (json.has("scale")) {
                    JsonValue sc = json.get("scale");
                    tc.scale.set(sc.getFloat("x", 1f), sc.getFloat("y", 1f));
                }
                return tc;
            }
            case "Sprite": {
                SpriteComponent sc = new SpriteComponent();
                sc.assetId = json.getString("assetId", "");
                sc.width = json.getFloat("width", 32f);
                sc.height = json.getFloat("height", 32f);
                if (json.has("anchor")) {
                    JsonValue anc = json.get("anchor");
                    sc.anchor.set(anc.getFloat("x", 0.5f), anc.getFloat("y", 0.5f));
                }
                if (json.has("tint")) {
                    try { sc.tint = Color.valueOf(json.getString("tint")); } catch (Exception ignored) {}
                }
                sc.flipX = json.getBoolean("flipX", false);
                sc.flipY = json.getBoolean("flipY", false);
                return sc;
            }
            case "RigidBody": {
                RigidBodyComponent rbc = new RigidBodyComponent();
                if (json.has("velocity")) {
                    JsonValue vel = json.get("velocity");
                    rbc.velocity.set(vel.getFloat("x", 0f), vel.getFloat("y", 0f));
                }
                rbc.angularVelocity = json.getFloat("angularVelocity", 0f);
                rbc.mass = json.getFloat("mass", 1f);
                rbc.drag = json.getFloat("drag", 0f);
                rbc.isKinematic = json.getBoolean("isKinematic", false);
                rbc.gravityScale = json.getFloat("gravityScale", 1f);
                rbc.useGravity = json.getBoolean("useGravity", true);
                return rbc;
            }
            case "AabbCollider": {
                AabbColliderComponent ac = new AabbColliderComponent();
                if (json.has("offset")) {
                    JsonValue off = json.get("offset");
                    ac.offset.set(off.getFloat("x", 0f), off.getFloat("y", 0f));
                }
                if (json.has("size")) {
                    JsonValue sz = json.get("size");
                    ac.size.set(sz.getFloat("x", 32f), sz.getFloat("y", 32f));
                }
                ac.isStatic = json.getBoolean("isStatic", false);
                ac.isTrigger = json.getBoolean("isTrigger", false);
                ac.layer = json.getInt("layer", 1);
                ac.mask = json.getInt("mask", 1);
                return ac;
            }
            case "CircleCollider": {
                CircleColliderComponent cc = new CircleColliderComponent();
                if (json.has("offset")) {
                    JsonValue off = json.get("offset");
                    cc.offset.set(off.getFloat("x", 0f), off.getFloat("y", 0f));
                }
                cc.radius = json.getFloat("radius", 16f);
                cc.isStatic = json.getBoolean("isStatic", false);
                cc.isTrigger = json.getBoolean("isTrigger", false);
                cc.layer = json.getInt("layer", 1);
                cc.mask = json.getInt("mask", 1);
                return cc;
            }
            case "PolygonCollider": {
                PolygonColliderComponent pc = new PolygonColliderComponent();
                if (json.has("offset")) {
                    JsonValue off = json.get("offset");
                    pc.offset.set(off.getFloat("x", 0f), off.getFloat("y", 0f));
                }
                if (json.has("points")) {
                    JsonValue pts = json.get("points");
                    float[] verts = new float[pts.size * 2];
                    int i = 0;
                    for (JsonValue pt = pts.child; pt != null; pt = pt.next) {
                        verts[i++] = pt.getFloat("x", 0f);
                        verts[i++] = pt.getFloat("y", 0f);
                    }
                    pc.vertices = verts;
                }
                pc.isStatic = json.getBoolean("isStatic", false);
                pc.isTrigger = json.getBoolean("isTrigger", false);
                pc.layer = json.getInt("layer", 1);
                pc.mask = json.getInt("mask", 1);
                return pc;
            }
            case "PlayerController": {
                PlayerControllerComponent pcc = new PlayerControllerComponent();
                pcc.speed = json.getFloat("speed", 180f);
                pcc.jumpVelocity = json.getFloat("jumpVelocity", 420f);
                pcc.gravity = json.getFloat("gravity", 1200f);
                return pcc;
            }
            case "CameraFollow": {
                CameraFollowComponent cfc = new CameraFollowComponent();
                cfc.targetId = json.getString("targetId", "");
                cfc.smoothing = json.getFloat("smoothing", 0.2f);
                if (json.has("offset")) {
                    JsonValue off = json.get("offset");
                    cfc.offset.set(off.getFloat("x", 0f), off.getFloat("y", 0f));
                }
                return cfc;
            }
            case "Text": {
                TextComponent tc = new TextComponent();
                tc.text = json.getString("text", "");
                tc.fontAssetId = json.getString("fontAssetId", "");
                tc.size = json.getFloat("size", 16f);
                tc.align = json.getString("align", "left");
                if (json.has("color")) {
                    try { tc.color = Color.valueOf(json.getString("color")); } catch (Exception ignored) {}
                }
                return tc;
            }
            case "AudioSource": {
                AudioSourceComponent asc = new AudioSourceComponent();
                asc.assetId = json.getString("assetId", "");
                asc.volume = json.getFloat("volume", 1f);
                asc.loop = json.getBoolean("loop", false);
                asc.playOnStart = json.getBoolean("playOnStart", false);
                return asc;
            }
            case "AudioListener": {
                AudioListenerComponent alc = new AudioListenerComponent();
                alc.enabled = json.getBoolean("enabled", true);
                return alc;
            }
            case "Animation": {
                AnimationComponent ac = new AnimationComponent();
                ac.assetId = json.getString("assetId", "");
                ac.frameWidth = json.getFloat("frameWidth", 32f);
                ac.frameHeight = json.getFloat("frameHeight", 32f);
                ac.totalFrames = json.getInt("totalFrames", 1);
                ac.framesPerSecond = json.getFloat("framesPerSecond", 10f);
                ac.loop = json.getBoolean("loop", true);
                ac.currentFrame = json.getInt("currentFrame", 0);
                return ac;
            }
            case "Tilemap": {
                TilemapComponent tmc = new TilemapComponent();
                tmc.tilesetId = json.getString("tilesetId", "");
                tmc.tileWidth = json.getInt("tileWidth", 32);
                tmc.tileHeight = json.getInt("tileHeight", 32);
                tmc.columns = json.getInt("columns", 8);
                tmc.gridWidth = json.getInt("gridWidth", 10);
                tmc.gridHeight = json.getInt("gridHeight", 10);
                tmc.solid = json.getBoolean("solid", false);
                if (json.has("tiles")) {
                    JsonValue tilesArray = json.get("tiles");
                    int[] tileList = new int[tilesArray.size];
                    int idx = 0;
                    for (JsonValue t = tilesArray.child; t != null; t = t.next) {
                        tileList[idx++] = t.asInt();
                    }
                    tmc.tiles = tileList;
                }
                return tmc;
            }
            case "Tween": {
                TweenComponent tc = new TweenComponent();
                tc.property = json.getString("property", "position.x");
                tc.startValue = json.getFloat("startValue", 0f);
                tc.endValue = json.getFloat("endValue", 0f);
                tc.duration = json.getFloat("duration", 1f);
                tc.easing = json.getString("easing", "linear");
                tc.loop = json.getBoolean("loop", false);
                tc.pingPong = json.getBoolean("pingPong", false);
                tc.elapsed = json.getFloat("elapsed", 0f);
                tc.active = json.getBoolean("active", true);
                return tc;
            }
            case "FollowPath": {
                FollowPathComponent fpc = new FollowPathComponent();
                fpc.speed = json.getFloat("speed", 100f);
                fpc.loop = json.getBoolean("loop", true);
                fpc.currentPointIndex = json.getInt("currentPointIndex", 0);
                fpc.targetPointIndex = json.getInt("targetPointIndex", 0);
                if (json.has("points")) {
                    JsonValue pts = json.get("points");
                    for (JsonValue pt = pts.child; pt != null; pt = pt.next) {
                        fpc.points.add(new com.badlogic.gdx.math.Vector2(pt.getFloat("x", 0f), pt.getFloat("y", 0f)));
                    }
                }
                return fpc;
            }
            case "Script": {
                ScriptComponent sc = new ScriptComponent();
                if (json.has("handlers")) {
                    JsonValue handlersJson = json.get("handlers");
                    for (JsonValue h = handlersJson.child; h != null; h = h.next) {
                        ScriptComponent.ScriptHandler handler = new ScriptComponent.ScriptHandler();
                        handler.event = h.getString("event", "start");
                        if (h.has("actions")) {
                            JsonValue actionsJson = h.get("actions");
                            for (JsonValue a = actionsJson.child; a != null; a = a.next) {
                                String actType = a.getString("type", "");
                                ScriptComponent.ScriptAction action = new ScriptComponent.ScriptAction(actType);
                                for (JsonValue prop = a.child; prop != null; prop = prop.next) {
                                    if (!"type".equals(prop.name)) {
                                        action.params.put(prop.name, prop.asString());
                                    }
                                }
                                handler.actions.add(action);
                            }
                        }
                        sc.handlers.add(handler);
                    }
                }
                return sc;
            }
            case "ParticleSystem": {
                ParticleSystemComponent psc = new ParticleSystemComponent();
                psc.maxParticles = json.getInt("maxParticles", 32);
                psc.emissionRate = json.getFloat("emissionRate", 12f);
                psc.lifetime = json.getFloat("lifetime", 0.8f);
                psc.speed = json.getFloat("speed", 60f);
                psc.gravityScale = json.getFloat("gravityScale", 0.4f);
                psc.colorStart = json.getString("colorStart", "#00f0ff");
                psc.colorEnd = json.getString("colorEnd", "#8b5cf6");
                psc.sizeStart = json.getFloat("sizeStart", 4f);
                psc.sizeEnd = json.getFloat("sizeEnd", 0f);
                psc.shape = json.getString("shape", "point");
                psc.width = json.getFloat("width", 0f);
                psc.height = json.getFloat("height", 0f);
                psc.active = json.getBoolean("active", true);
                return psc;
            }
            case "NineSlice": {
                NineSliceComponent nsc = new NineSliceComponent();
                nsc.assetId = json.getString("assetId", "");
                nsc.width = json.getFloat("width", 100f);
                nsc.height = json.getFloat("height", 100f);
                nsc.leftWidth = json.getInt("leftWidth", 10);
                nsc.rightWidth = json.getInt("rightWidth", 10);
                nsc.topHeight = json.getInt("topHeight", 10);
                nsc.bottomHeight = json.getInt("bottomHeight", 10);
                return nsc;
            }
            case "Light2D": {
                Light2DComponent l2c = new Light2DComponent();
                l2c.kind = json.getString("kind", "point");
                l2c.range = json.getFloat("range", 200f);
                l2c.intensity = json.getFloat("intensity", 1f);
                l2c.color = json.getString("color", "#ffffff");
                return l2c;
            }
            case "StateMachine": {
                StateMachineComponent smc = new StateMachineComponent();
                smc.initialState = json.getString("initialState", "");
                smc.currentState = json.getString("currentState", smc.initialState);
                if (json.has("states")) {
                    JsonValue statesJson = json.get("states");
                    for (JsonValue s = statesJson.child; s != null; s = s.next) {
                        StateMachineComponent.State state = new StateMachineComponent.State();
                        state.name = s.getString("name", "");
                        if (s.has("duration")) state.duration = s.getFloat("duration");
                        if (s.has("then")) state.thenState = s.getString("then");
                        if (s.has("on")) {
                            JsonValue onJson = s.get("on");
                            for (JsonValue t = onJson.child; t != null; t = t.next) {
                                state.transitions.put(t.name, t.asString());
                            }
                        }
                        smc.states.add(state);
                    }
                }
                return smc;
            }
            default:
                return null;
        }
    }

    private GuiNode parseGuiNode(JsonValue json) {
        if (json == null) return null;
        String type = json.getString("type", "Text");
        String id = json.getString("id", "gui_node");
        float x = json.getFloat("x", 0f);
        float y = json.getFloat("y", 0f);
        float width = json.getFloat("width", 100f);
        float height = json.getFloat("height", 40f);
        float anchorX = json.getFloat("anchorX", 0f);
        float anchorY = json.getFloat("anchorY", 0f);
        boolean visible = json.getBoolean("visible", true);
        boolean interactive = json.getBoolean("interactive", false);

        if ("Button".equalsIgnoreCase(type)) {
            GuiNode.GuiButtonNode btn = new GuiNode.GuiButtonNode();
            btn.id = id;
            btn.x = x;
            btn.y = y;
            btn.width = width;
            btn.height = height;
            btn.anchorX = anchorX;
            btn.anchorY = anchorY;
            btn.visible = visible;
            btn.interactive = interactive;
            btn.text = json.getString("text", "Button");
            btn.action = json.getString("action", "");
            btn.fontSize = json.getFloat("fontSize", 16f);
            if (json.has("color")) {
                try { btn.color = Color.valueOf(json.getString("color")); } catch (Exception ignored) {}
            }
            if (json.has("backgroundColor")) {
                try { btn.backgroundColor = Color.valueOf(json.getString("backgroundColor")); } catch (Exception ignored) {}
            }
            return btn;
        } else if ("Image".equalsIgnoreCase(type)) {
            GuiNode.GuiImageNode img = new GuiNode.GuiImageNode();
            img.id = id;
            img.x = x;
            img.y = y;
            img.width = width;
            img.height = height;
            img.anchorX = anchorX;
            img.anchorY = anchorY;
            img.visible = visible;
            img.interactive = interactive;
            img.assetId = json.getString("assetId", "");
            return img;
        } else if ("Panel".equalsIgnoreCase(type)) {
            GuiNode.GuiPanelNode panel = new GuiNode.GuiPanelNode();
            panel.id = id;
            panel.x = x;
            panel.y = y;
            panel.width = width;
            panel.height = height;
            panel.anchorX = anchorX;
            panel.anchorY = anchorY;
            panel.visible = visible;
            panel.interactive = interactive;
            if (json.has("backgroundColor")) {
                try { panel.backgroundColor = Color.valueOf(json.getString("backgroundColor")); } catch (Exception ignored) {}
            }
            if (json.has("borderColor")) {
                try { panel.borderColor = Color.valueOf(json.getString("borderColor")); } catch (Exception ignored) {}
            }
            panel.borderWidth = json.getFloat("borderWidth", 1f);
            panel.borderRadius = json.getFloat("borderRadius", 4f);
            return panel;
        } else if ("ProgressBar".equalsIgnoreCase(type)) {
            GuiNode.GuiProgressBarNode bar = new GuiNode.GuiProgressBarNode();
            bar.id = id;
            bar.x = x;
            bar.y = y;
            bar.width = width;
            bar.height = height;
            bar.anchorX = anchorX;
            bar.anchorY = anchorY;
            bar.visible = visible;
            bar.interactive = interactive;
            bar.value = json.getFloat("value", 100f);
            bar.maxValue = json.getFloat("maxValue", 100f);
            if (json.has("fillColor")) {
                try { bar.fillColor = Color.valueOf(json.getString("fillColor")); } catch (Exception ignored) {}
            }
            if (json.has("backgroundColor")) {
                try { bar.backgroundColor = Color.valueOf(json.getString("backgroundColor")); } catch (Exception ignored) {}
            }
            bar.showLabel = json.getBoolean("showLabel", true);
            return bar;
        } else if ("Joystick".equalsIgnoreCase(type)) {
            GuiNode.GuiJoystickNode joy = new GuiNode.GuiJoystickNode();
            joy.id = id;
            joy.x = x;
            joy.y = y;
            joy.width = width;
            joy.height = height;
            joy.anchorX = anchorX;
            joy.anchorY = anchorY;
            joy.visible = visible;
            joy.interactive = interactive;
            joy.action = json.getString("action", "player.move");
            joy.radius = json.getFloat("radius", 40f);
            joy.deadzone = json.getFloat("deadzone", 5f);
            if (json.has("baseColor")) {
                try { joy.baseColor = Color.valueOf(json.getString("baseColor")); } catch (Exception ignored) {}
            }
            if (json.has("knobColor")) {
                try { joy.knobColor = Color.valueOf(json.getString("knobColor")); } catch (Exception ignored) {}
            }
            return joy;
        } else {
            GuiNode.GuiTextNode txt = new GuiNode.GuiTextNode();
            txt.id = id;
            txt.x = x;
            txt.y = y;
            txt.width = width;
            txt.height = height;
            txt.anchorX = anchorX;
            txt.anchorY = anchorY;
            txt.visible = visible;
            txt.interactive = interactive;
            txt.text = json.getString("text", "");
            txt.fontSize = json.getFloat("fontSize", 16f);
            txt.align = json.getString("align", "left");
            if (json.has("color")) {
                try { txt.color = Color.valueOf(json.getString("color")); } catch (Exception ignored) {}
            }
            return txt;
        }
    }

    public String getProjectName() {
        return projectName;
    }

    public String getActiveSceneFile() {
        return activeSceneFile;
    }

    public JsonValue getProjectJson() {
        return projectJson;
    }
}
