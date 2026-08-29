package com.playroom.runtime.components;

public class AnimationComponent extends Component {
    public AnimationComponent() {
        super("Animation");
    }

    public String assetId = "";
    public float frameWidth = 32f;
    public float frameHeight = 32f;
    public int totalFrames = 1;
    public float framesPerSecond = 10f;
    public boolean loop = true;
    public int currentFrame = 0;
    public float elapsedTime = 0f;
}
