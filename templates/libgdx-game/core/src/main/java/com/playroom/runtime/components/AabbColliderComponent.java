package com.playroom.runtime.components;

import com.badlogic.gdx.math.Vector2;

public class AabbColliderComponent extends ColliderComponent {
    public final Vector2 size = new Vector2(32f, 32f);

    public AabbColliderComponent() {
        super("AabbCollider");
    }
}
