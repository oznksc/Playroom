package com.playroom.runtime.components;

import com.badlogic.gdx.graphics.Color;

public class TextComponent extends Component {
    public String text = "";
    public String fontAssetId = "";
    public float size = 16f;
    public Color color = new Color(Color.WHITE);
    public String align = "left";

    public TextComponent() {
        super("Text");
    }
}
