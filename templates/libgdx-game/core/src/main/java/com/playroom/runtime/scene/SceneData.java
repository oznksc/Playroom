package com.playroom.runtime.scene;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.Vector2;
import com.playroom.runtime.gui.GuiNode;
import java.util.ArrayList;
import java.util.List;

public class SceneData {
    public String id = "main";
    public String name = "Main Scene";
    public float viewportWidth = 390f;
    public float viewportHeight = 844f;
    public Color backgroundColor = Color.valueOf("#101820");
    public final Vector2 gravity = new Vector2(0f, 1800f);
    public final List<Entity> entities = new ArrayList<>();
    public final List<GuiNode> guiNodes = new ArrayList<>();

    public Entity findEntityById(String id) {
        if (id == null) return null;
        for (Entity e : entities) {
            if (id.equals(e.id)) return e;
        }
        return null;
    }
}
