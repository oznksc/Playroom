package com.playroom.runtime.components;

public class TweenComponent implements Component {
    public String property = "position.x";
    public float startValue = 0f;
    public float endValue = 0f;
    public float duration = 1f;
    public String easing = "linear";
    public boolean loop = false;
    public boolean pingPong = false;
    public float elapsed = 0f;
    public boolean active = true;
    public boolean forward = true;
}
