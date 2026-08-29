package com.playroom.runtime.gui;

import com.badlogic.gdx.graphics.Color;

public class GuiNode {
    public String id = "";
    public String type = "Text"; // Text, Button, Image
    public float x = 0f;
    public float y = 0f;
    public float width = 100f;
    public float height = 40f;
    public float anchorX = 0f;
    public float anchorY = 0f;
    public boolean visible = true;
    public boolean interactive = false;

    public static class GuiTextNode extends GuiNode {
        public String text = "";
        public float fontSize = 16f;
        public Color color = Color.WHITE;
        public String align = "left"; // left, center, right

        public GuiTextNode() {
            this.type = "Text";
        }
    }

    public static class GuiButtonNode extends GuiNode {
        public String text = "";
        public String action = "";
        public float fontSize = 16f;
        public Color color = Color.WHITE;
        public Color backgroundColor = Color.valueOf("#00f0ff");
        public boolean isPressed = false;

        public GuiButtonNode() {
            this.type = "Button";
            this.interactive = true;
        }
    }

    public static class GuiImageNode extends GuiNode {
        public String assetId = "";

        public GuiImageNode() {
            this.type = "Image";
        }
    }

    public static class GuiPanelNode extends GuiNode {
        public Color backgroundColor = Color.valueOf("#161b22");
        public Color borderColor = Color.valueOf("#30363d");
        public float borderWidth = 1f;
        public float borderRadius = 4f;

        public GuiPanelNode() {
            this.type = "Panel";
        }
    }

    public static class GuiProgressBarNode extends GuiNode {
        public float value = 100f;
        public float maxValue = 100f;
        public Color fillColor = Color.valueOf("#00f0ff");
        public Color backgroundColor = Color.valueOf("#1a1f2c");
        public boolean showLabel = true;

        public GuiProgressBarNode() {
            this.type = "ProgressBar";
        }
    }

    public static class GuiJoystickNode extends GuiNode {
        public String action = "player.move";
        public float radius = 40f;
        public float deadzone = 5f;
        public Color baseColor = new Color(1f, 1f, 1f, 0.2f);
        public Color knobColor = Color.valueOf("#00f0ff");
        public float knobX = 0f;
        public float knobY = 0f;
        public boolean isDragging = false;

        public GuiJoystickNode() {
            this.type = "Joystick";
            this.interactive = true;
        }
    }
}
