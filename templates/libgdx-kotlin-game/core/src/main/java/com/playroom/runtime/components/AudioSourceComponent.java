package com.playroom.runtime.components;

public class AudioSourceComponent extends Component {
    public String assetId = "";
    public float volume = 1f;
    public boolean loop = false;
    public boolean playOnStart = false;
    public float minDistance = 100f;
    public float maxDistance = 1000f;

    public AudioSourceComponent() {
        super("AudioSource");
    }
}
