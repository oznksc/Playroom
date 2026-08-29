package com.playroom.runtime.components;

public class Light2DComponent implements Component {
    public String kind = "point"; // point, spot
    public float range = 200f;
    public float intensity = 1f;
    public String color = "#ffffff";
}
