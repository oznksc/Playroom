package com.playroom.runtime;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.utils.JsonReader;
import com.badlogic.gdx.utils.JsonValue;

public class SceneLoader {
    private String projectName = "Playroom Game";
    private String activeScene = "main.scene.json";
    private JsonValue projectJson;
    private JsonValue currentSceneJson;

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
                        activeScene = projectJson.getString("activeScene");
                    }
                }
            } catch (Exception e) {
                Gdx.app.error("SceneLoader", "Failed to parse project json at: " + path, e);
            }
        } else {
            Gdx.app.log("SceneLoader", "Project file not found at " + path + ", using default configuration");
        }
    }

    public void loadScene(String scenePath) {
        FileHandle file = Gdx.files.internal(scenePath);
        if (file.exists()) {
            try {
                JsonReader reader = new JsonReader();
                currentSceneJson = reader.parse(file);
                Gdx.app.log("SceneLoader", "Loaded scene: " + scenePath);
            } catch (Exception e) {
                Gdx.app.error("SceneLoader", "Failed to parse scene json at: " + scenePath, e);
            }
        }
    }

    public String getProjectName() {
        return projectName;
    }

    public String getActiveScene() {
        return activeScene;
    }

    public JsonValue getProjectJson() {
        return projectJson;
    }

    public JsonValue getCurrentSceneJson() {
        return currentSceneJson;
    }
}
