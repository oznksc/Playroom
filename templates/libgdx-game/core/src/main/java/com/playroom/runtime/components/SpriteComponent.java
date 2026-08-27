package com.playroom.runtime.components;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.Vector2;

public class SpriteComponent extends Component {
    public String assetId = "";
    public float width = 32f;
    public float height = 32f;
    public final Vector2 anchor = new Vector2(0.5f, 0.5f);
    public Color tint = new Color(Color.WHITE);
    public boolean flipX = false;
    public boolean flipY = false;

    public SpriteComponent() {
        super("Sprite");
    }
}
