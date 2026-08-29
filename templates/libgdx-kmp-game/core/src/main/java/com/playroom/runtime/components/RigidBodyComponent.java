package com.playroom.runtime.components;

import com.badlogic.gdx.math.Vector2;

public class RigidBodyComponent extends Component {
    public final Vector2 velocity = new Vector2();
    public float angularVelocity = 0f;
    public float mass = 1f;
    public float drag = 0f;
    public boolean isKinematic = false;
    public float gravityScale = 1f;
    public boolean useGravity = true;

    public RigidBodyComponent() {
        super("RigidBody");
    }
}
