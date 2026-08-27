package com.playroom.runtime.components;

import com.badlogic.gdx.math.Vector2;

public class TransformComponent extends Component {
    public final Vector2 position = new Vector2();
    public float rotation = 0f;
    public final Vector2 scale = new Vector2(1f, 1f);

    public TransformComponent() {
        super("Transform");
    }

    public TransformComponent(float x, float y) {
        super("Transform");
        this.position.set(x, y);
    }
}
