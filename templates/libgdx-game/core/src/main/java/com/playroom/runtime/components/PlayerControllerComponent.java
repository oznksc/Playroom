package com.playroom.runtime.components;

public class PlayerControllerComponent extends Component {
    public float speed = 180f;
    public float jumpVelocity = 420f;
    public float gravity = 1200f;

    public PlayerControllerComponent() {
        super("PlayerController");
    }
}
