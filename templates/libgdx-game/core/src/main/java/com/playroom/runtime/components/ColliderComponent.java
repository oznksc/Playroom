package com.playroom.runtime.components;

import com.badlogic.gdx.math.Vector2;

public abstract class ColliderComponent extends Component {
    public final Vector2 offset = new Vector2();
    public boolean isStatic = false;
    public boolean isTrigger = false;
    public int layer = 1;
    public int mask = 1;

    protected ColliderComponent(String type) {
        super(type);
    }
}
