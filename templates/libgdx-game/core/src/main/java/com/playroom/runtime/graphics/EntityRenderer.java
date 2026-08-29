package com.playroom.runtime.graphics;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.files.FileHandle;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.NinePatch;
import com.playroom.runtime.components.AnimationComponent;
import com.playroom.runtime.components.CameraFollowComponent;
import com.playroom.runtime.components.NineSliceComponent;
import com.playroom.runtime.components.SpriteComponent;
import com.playroom.runtime.components.TextComponent;
import com.playroom.runtime.components.TilemapComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;
import java.util.HashMap;
import java.util.Map;

public class EntityRenderer {
    private final Map<String, Texture> textureCache = new HashMap<>();
    private final Map<String, NinePatch> ninePatchCache = new HashMap<>();
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

    public void render(SceneData sceneData, SpriteBatch batch, float delta) {
        for (Entity entity : sceneData.entities) {
            if (!entity.active) continue;

            TransformComponent tc = entity.getComponent(TransformComponent.class);
            if (tc == null) continue;

            TilemapComponent tmc = entity.getComponent(TilemapComponent.class);
            if (tmc != null) {
                renderTilemap(batch, tc, tmc, entity.name);
            }

            NineSliceComponent nsc = entity.getComponent(NineSliceComponent.class);
            if (nsc != null) {
                renderNineSlice(batch, tc, nsc, entity.name);
            }

            SpriteComponent sc = entity.getComponent(SpriteComponent.class);
            if (sc != null) {
                renderSprite(batch, tc, sc, entity.name);
            }

            AnimationComponent ac = entity.getComponent(AnimationComponent.class);
            if (ac != null && sc == null) {
                renderAnimation(batch, tc, ac, delta, entity.name);
            }

            TextComponent textComp = entity.getComponent(TextComponent.class);
            if (textComp != null && !textComp.text.isEmpty()) {
                renderText(batch, tc, textComp);
            }
        }
    }

    private void renderNineSlice(SpriteBatch batch, TransformComponent tc, NineSliceComponent nsc, String entityName) {
        Texture texture = getTexture(nsc.assetId, entityName);
        if (texture == null) texture = fallbackWhiteTexture;

        String key = nsc.assetId + "_" + nsc.leftWidth + "_" + nsc.rightWidth + "_" + nsc.topHeight + "_" + nsc.bottomHeight;
        NinePatch patch = ninePatchCache.get(key);
        if (patch == null) {
            patch = new NinePatch(texture, nsc.leftWidth, nsc.rightWidth, nsc.topHeight, nsc.bottomHeight);
            ninePatchCache.put(key, patch);
        }

        float drawX = tc.position.x - (nsc.width * 0.5f);
        float drawY = tc.position.y - (nsc.height * 0.5f);
        patch.draw(batch, drawX, drawY, nsc.width * tc.scale.x, nsc.height * tc.scale.y);
    }

    public void render(SceneData sceneData, SpriteBatch batch) {
        render(sceneData, batch, 0.016f);
    }

    private void renderTilemap(SpriteBatch batch, TransformComponent tc, TilemapComponent tmc, String entityName) {
        if (tmc.tiles == null || tmc.tiles.length == 0) return;
        Texture tileset = getTexture(tmc.tilesetId, entityName);
        if (tileset == null) tileset = fallbackWhiteTexture;

        int cols = tmc.columns > 0 ? tmc.columns : Math.max(1, tileset.getWidth() / tmc.tileWidth);

        for (int y = 0; y < tmc.gridHeight; y++) {
            for (int x = 0; x < tmc.gridWidth; x++) {
                int idx = y * tmc.gridWidth + x;
                if (idx >= tmc.tiles.length) break;

                int tileId = tmc.tiles[idx];
                if (tileId <= 0) continue;

                int tileIndex = tileId - 1;
                int srcX = (tileIndex % cols) * tmc.tileWidth;
                int srcY = (tileIndex / cols) * tmc.tileHeight;

                float drawX = tc.position.x + (x * tmc.tileWidth * tc.scale.x);
                float drawY = tc.position.y + (y * tmc.tileHeight * tc.scale.y);

                batch.draw(
                    tileset,
                    drawX, drawY,
                    0, 0,
                    tmc.tileWidth, tmc.tileHeight,
                    tc.scale.x, tc.scale.y,
                    tc.rotation,
                    srcX, srcY,
                    tmc.tileWidth, tmc.tileHeight,
                    false, false
                );
            }
        }
    }

    private void renderAnimation(SpriteBatch batch, TransformComponent tc, AnimationComponent ac, float delta, String entityName) {
        Texture sheet = getTexture(ac.assetId, entityName);
        if (sheet == null) sheet = fallbackWhiteTexture;

        ac.elapsedTime += delta;
        float frameDuration = 1.0f / Math.max(1f, ac.framesPerSecond);
        int total = Math.max(1, ac.totalFrames);

        int frameIndex;
        if (ac.loop) {
            frameIndex = (int) (ac.elapsedTime / frameDuration) % total;
        } else {
            frameIndex = Math.min((int) (ac.elapsedTime / frameDuration), total - 1);
        }
        ac.currentFrame = frameIndex;

        int cols = Math.max(1, (int) (sheet.getWidth() / ac.frameWidth));
        int srcX = (frameIndex % cols) * (int) ac.frameWidth;
        int srcY = (frameIndex / cols) * (int) ac.frameHeight;

        float originX = ac.frameWidth * 0.5f;
        float originY = ac.frameHeight * 0.5f;
        float drawX = tc.position.x - originX;
        float drawY = tc.position.y - originY;

        batch.draw(
            sheet,
            drawX, drawY,
            originX, originY,
            ac.frameWidth, ac.frameHeight,
            tc.scale.x, tc.scale.y,
            tc.rotation,
            srcX, srcY,
            (int) ac.frameWidth, (int) ac.frameHeight,
            false, false
        );
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
