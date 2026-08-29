package com.playroom.runtime.gui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Vector3;
import com.playroom.runtime.gui.GuiNode.GuiButtonNode;
import com.playroom.runtime.gui.GuiNode.GuiImageNode;
import com.playroom.runtime.gui.GuiNode.GuiTextNode;
import com.playroom.runtime.scene.SceneData;
import com.playroom.runtime.script.ActionExecutor;
import com.playroom.runtime.script.ScriptAction;

import java.util.HashMap;
import java.util.Map;

public class GuiRenderer {
    private OrthographicCamera uiCamera;
    private BitmapFont font;
    private Texture whiteTexture;
    private final Vector3 touchPoint = new Vector3();
    private final Map<String, Texture> imageCache = new HashMap<String, Texture>();

    public void init(float viewportWidth, float viewportHeight) {
        uiCamera = new OrthographicCamera();
        uiCamera.setToOrtho(true, viewportWidth, viewportHeight);

        font = new BitmapFont();
        font.setUseIntegerPositions(false);

        Pixmap pix = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
        pix.setColor(Color.WHITE);
        pix.fill();
        whiteTexture = new Texture(pix);
        pix.dispose();
    }

    public void resize(float width, float height) {
        if (uiCamera != null) {
            uiCamera.setToOrtho(true, width, height);
            uiCamera.update();
        }
    }

    public void updateAndRender(SceneData scene, SpriteBatch batch, ActionExecutor executor) {
        if (scene.guiNodes.isEmpty()) return;

        uiCamera.update();
        batch.setProjectionMatrix(uiCamera.combined);
        batch.begin();

        boolean isTouching = Gdx.input.isTouched();
        boolean isJustTouched = Gdx.input.justTouched();
        if (isTouching || isJustTouched) {
            touchPoint.set(Gdx.input.getX(), Gdx.input.getY(), 0);
            uiCamera.unproject(touchPoint);
        }

        for (GuiNode node : scene.guiNodes) {
            if (!node.visible) continue;

            float drawX = node.x - (node.width * node.anchorX);
            float drawY = node.y - (node.height * node.anchorY);

            if (node instanceof GuiButtonNode) {
                GuiButtonNode btn = (GuiButtonNode) node;
                boolean hit = isTouching && (touchPoint.x >= drawX && touchPoint.x <= drawX + btn.width &&
                                            touchPoint.y >= drawY && touchPoint.y <= drawY + btn.height);
                btn.isPressed = hit;

                if (hit && isJustTouched && !btn.action.isEmpty() && executor != null) {
                    executor.execute(new ScriptAction(btn.action), null);
                }

                // Draw button background
                batch.setColor(btn.isPressed ? btn.backgroundColor.cpy().mul(0.8f, 0.8f, 0.8f, 1f) : btn.backgroundColor);
                batch.draw(whiteTexture, drawX, drawY, btn.width, btn.height);
                batch.setColor(Color.WHITE);

                // Draw button text
                font.setColor(btn.color);
                font.draw(batch, btn.text, drawX + 10f, drawY + (btn.height * 0.65f));
            } else if (node instanceof GuiTextNode) {
                GuiTextNode txt = (GuiTextNode) node;
                font.setColor(txt.color);
                font.draw(batch, txt.text, drawX, drawY + (txt.height * 0.7f));
            } else if (node instanceof GuiImageNode) {
                GuiImageNode img = (GuiImageNode) node;
                Texture tex = getImageTexture(img.assetId);
                if (tex != null) {
                    batch.draw(tex, drawX, drawY, img.width, img.height);
                }
            } else if (node instanceof GuiNode.GuiPanelNode) {
                GuiNode.GuiPanelNode panel = (GuiNode.GuiPanelNode) node;
                if (panel.borderWidth > 0) {
                    batch.setColor(panel.borderColor);
                    batch.draw(whiteTexture, drawX, drawY, panel.width, panel.height);
                    batch.setColor(panel.backgroundColor);
                    batch.draw(whiteTexture, drawX + panel.borderWidth, drawY + panel.borderWidth,
                               panel.width - (panel.borderWidth * 2), panel.height - (panel.borderWidth * 2));
                } else {
                    batch.setColor(panel.backgroundColor);
                    batch.draw(whiteTexture, drawX, drawY, panel.width, panel.height);
                }
                batch.setColor(Color.WHITE);
            } else if (node instanceof GuiNode.GuiProgressBarNode) {
                GuiNode.GuiProgressBarNode bar = (GuiNode.GuiProgressBarNode) node;
                float pct = bar.maxValue > 0 ? Math.max(0f, Math.min(1f, bar.value / bar.maxValue)) : 0f;

                // Track
                batch.setColor(bar.backgroundColor);
                batch.draw(whiteTexture, drawX, drawY, bar.width, bar.height);

                // Fill
                if (pct > 0) {
                    batch.setColor(bar.fillColor);
                    batch.draw(whiteTexture, drawX + 1f, drawY + 1f, (bar.width - 2f) * pct, bar.height - 2f);
                }
                batch.setColor(Color.WHITE);

                // Optional label
                if (bar.showLabel) {
                    font.setColor(Color.WHITE);
                    String label = Math.round(pct * 100) + "%";
                    font.draw(batch, label, drawX + (bar.width * 0.4f), drawY + (bar.height * 0.65f));
                }
            } else if (node instanceof GuiNode.GuiJoystickNode) {
                GuiNode.GuiJoystickNode joy = (GuiNode.GuiJoystickNode) node;
                float cx = drawX + joy.width / 2f;
                float cy = drawY + joy.height / 2f;

                if (isTouching) {
                    float dx = touchPoint.x - cx;
                    float dy = touchPoint.y - cy;
                    float dist = (float) Math.sqrt(dx * dx + dy * dy);
                    if (dist <= joy.radius * 1.5f || joy.isDragging) {
                        joy.isDragging = true;
                        float maxD = joy.radius;
                        if (dist > maxD) {
                            dx = (dx / dist) * maxD;
                            dy = (dy / dist) * maxD;
                        }
                        joy.knobX = dx;
                        joy.knobY = dy;
                    }
                } else {
                    joy.isDragging = false;
                    joy.knobX = 0f;
                    joy.knobY = 0f;
                }

                // Base circle approximation
                batch.setColor(joy.baseColor);
                batch.draw(whiteTexture, cx - joy.radius, cy - joy.radius, joy.radius * 2, joy.radius * 2);

                // Knob
                batch.setColor(joy.knobColor);
                float knobRadius = joy.radius * 0.4f;
                batch.draw(whiteTexture, cx + joy.knobX - knobRadius, cy + joy.knobY - knobRadius, knobRadius * 2, knobRadius * 2);
                batch.setColor(Color.WHITE);
            }
        }

        batch.end();
    }

    private Texture getImageTexture(String assetId) {
        if (assetId == null || assetId.isEmpty()) return whiteTexture;
        if (imageCache.containsKey(assetId)) return imageCache.get(assetId);

        try {
            com.badlogic.gdx.files.FileHandle fh = Gdx.files.internal("gamekit/assets/" + assetId);
            if (fh.exists()) {
                Texture tex = new Texture(fh);
                imageCache.put(assetId, tex);
                return tex;
            }
        } catch (Exception e) {
            Gdx.app.error("GuiRenderer", "Failed to load GUI image: " + assetId, e);
        }
        return whiteTexture;
    }

    public void dispose() {
        if (font != null) font.dispose();
        if (whiteTexture != null) whiteTexture.dispose();
        for (Texture tex : imageCache.values()) {
            if (tex != null && tex != whiteTexture) tex.dispose();
        }
        imageCache.clear();
    }
}
