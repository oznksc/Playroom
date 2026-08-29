package com.playroom.runtime.components;

public class ParticleSystemComponent implements Component {
    public int maxParticles = 32;
    public float emissionRate = 12f;
    public float lifetime = 0.8f;
    public float speed = 60f;
    public float gravityScale = 0.4f;
    public String colorStart = "#00f0ff";
    public String colorEnd = "#8b5cf6";
    public float sizeStart = 4f;
    public float sizeEnd = 0f;
    public String shape = "point";
    public float width = 0f;
    public float height = 0f;
    public boolean active = true;
}
