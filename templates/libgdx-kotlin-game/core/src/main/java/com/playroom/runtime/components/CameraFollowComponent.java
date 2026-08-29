package com.playroom.runtime.components;

import com.badlogic.gdx.math.Vector2;

public class CameraFollowComponent extends Component {
    public String targetId = "";
    public float smoothing = 0.2f;
    public final Vector2 offset = new Vector2();

    public CameraFollowComponent() {
        super("CameraFollow");
    }
}
