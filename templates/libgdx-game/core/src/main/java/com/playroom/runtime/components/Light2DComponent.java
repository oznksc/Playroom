package com.playroom.runtime.components;

public class Light2DComponent extends Component {
    public Light2DComponent() {
        super("Light2D");
    }

    public String kind = "point"; // point, spot
    public float range = 200f;
    public float intensity = 1f;
    public String color = "#ffffff";
}
