package com.playroom.runtime.graphics;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.MathUtils;
import com.playroom.runtime.components.CameraFollowComponent;
import com.playroom.runtime.components.SpriteComponent;
import com.playroom.runtime.components.TextComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;
import java.util.HashMap;
import java.util.Map;

public class EntityRenderer {
    private final Map<String, Texture> textureCache = new HashMap<>();
    private Texture fallbackWhiteTexture;
    private BitmapFont font;

    public void init() {
        Pixmap pixmap = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
        pixmap.setColor(Color.WHITE);
        pixmap.fill();
        fallbackWhiteTexture = new Texture(pixmap);
        pixmap.dispose();

        font = new BitmapFont();
        font.setUseIntegerPositions(false);
    }

    public void updateCamera(SceneData sceneData, OrthographicCamera camera, float delta) {
        for (Entity entity : sceneData.entities) {
            CameraFollowComponent cfc = entity.getComponent(CameraFollowComponent.class);
            if (cfc == null || cfc.targetId.isEmpty()) continue;

            Entity target = sceneData.findEntityById(cfc.targetId);
            if (target == null) target = entity;

            TransformComponent tc = target.getComponent(TransformComponent.class);
            if (tc != null) {
                float targetX = tc.position.x + cfc.offset.x;
                float targetY = tc.position.y + cfc.offset.y;
                float lerpFactor = MathUtils.clamp(cfc.smoothing * delta * 10f, 0.01f, 1f);

                camera.position.x = MathUtils.lerp(camera.position.x, targetX, lerpFactor);
                camera.position.y = MathUtils.lerp(camera.position.y, targetY, lerpFactor);
            }
        }
    }

    public void render(SceneData sceneData, SpriteBatch batch) {
        for (Entity entity : sceneData.entities) {
            if (!entity.active) continue;

            TransformComponent tc = entity.getComponent(TransformComponent.class);
            if (tc == null) continue;

            SpriteComponent sc = entity.getComponent(SpriteComponent.class);
            if (sc != null) {
                renderSprite(batch, tc, sc, entity.name);
            }

            TextComponent textComp = entity.getComponent(TextComponent.class);
            if (textComp != null && !textComp.text.isEmpty()) {
                renderText(batch, tc, textComp);
            }
        }
    }

    private void renderSprite(SpriteBatch batch, TransformComponent tc, SpriteComponent sc, String entityName) {
        Texture texture = getTexture(sc.assetId, entityName);
        if (texture == null) texture = fallbackWhiteTexture;

        float originX = sc.width * sc.anchor.x;
        float originY = sc.height * sc.anchor.y;
        float drawX = tc.position.x - originX;
        float drawY = tc.position.y - originY;

        batch.setColor(sc.tint);
        batch.draw(
            texture,
            drawX, drawY,
            originX, originY,
            sc.width, sc.height,
            tc.scale.x * (sc.flipX ? -1f : 1f),
            tc.scale.y * (sc.flipY ? -1f : 1f),
            tc.rotation,
            0, 0,
            texture.getWidth(), texture.getHeight(),
            false, false
        );
        batch.setColor(Color.WHITE);
    }

    private void renderText(SpriteBatch batch, TransformComponent tc, TextComponent textComp) {
        font.setColor(textComp.color);
        font.draw(batch, textComp.text, tc.position.x, tc.position.y);
    }

    private Texture getTexture(String assetId, String entityName) {
        if (assetId == null || assetId.isEmpty()) {
            return getProceduralFallback(entityName);
        }

        if (textureCache.containsKey(assetId)) {
            return textureCache.get(assetId);
        }

        // Check if file exists under gamekit/assets/
        String path = "gamekit/assets/" + assetId;
        FileHandle handle = Gdx.files.internal(path);

        if (handle.exists() && !assetId.toLowerCase().endsWith(".svg")) {
            try {
                Texture tex = new Texture(handle);
                textureCache.put(assetId, tex);
                return tex;
            } catch (Exception e) {
                Gdx.app.error("EntityRenderer", "Failed to load raster texture: " + assetId, e);
            }
        }

        // For SVG or placeholder files, create procedural fallback texture
        Texture procedural = getProceduralFallback(assetId + "_" + entityName);
        textureCache.put(assetId, procedural);
        return procedural;
    }

    private Texture getProceduralFallback(String key) {
        if (textureCache.containsKey(key)) {
            return textureCache.get(key);
        }

        Pixmap pix = new Pixmap(32, 32, Pixmap.Format.RGBA8888);
        Color baseColor = Color.valueOf("#00f0ff"); // Cyber Cyan default
        String lower = key.toLowerCase();
        if (lower.contains("player") || lower.contains("hero")) {
            baseColor = Color.valueOf("#00f0ff");
        } else if (lower.contains("ground") || lower.contains("platform")) {
            baseColor = Color.valueOf("#10b981"); // Emerald green
        } else if (lower.contains("crate") || lower.contains("box") || lower.contains("obstacle")) {
            baseColor = Color.valueOf("#f59e0b"); // Amber
        } else if (lower.contains("goal") || lower.contains("target") || lower.contains("coin")) {
            baseColor = Color.valueOf("#8b5cf6"); // Engine violet
        }

        pix.setColor(baseColor);
        pix.fill();
        pix.setColor(Color.WHITE);
        pix.drawRectangle(0, 0, 32, 32);

        Texture tex = new Texture(pix);
        pix.dispose();
        textureCache.put(key, tex);
        return tex;
    }

    public void dispose() {
        if (fallbackWhiteTexture != null) fallbackWhiteTexture.dispose();
        if (font != null) font.dispose();
        for (Texture tex : textureCache.values()) {
            if (tex != null) tex.dispose();
        }
        textureCache.clear();
    }
}
