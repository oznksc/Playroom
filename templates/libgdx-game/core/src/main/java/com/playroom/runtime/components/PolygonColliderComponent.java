package com.playroom.runtime.components;

public class PolygonColliderComponent extends ColliderComponent {
    public float[] vertices = new float[0];

    public PolygonColliderComponent() {
        super("PolygonCollider");
    }
}
