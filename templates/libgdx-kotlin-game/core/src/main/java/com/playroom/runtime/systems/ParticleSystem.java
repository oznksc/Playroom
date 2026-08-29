package com.playroom.runtime.systems;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.playroom.runtime.components.ParticleSystemComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class ParticleSystem {
    public static class Particle {
        public float x, y;
        public float vx, vy;
        public float age, lifetime;
        public float size;
        public Color color = new Color();
        public boolean alive = false;
    }

    private final List<Particle> pool = new ArrayList<Particle>();
    private final Random random = new Random();
    private float emissionAccumulator = 0f;

    public ParticleSystem() {
        for (int i = 0; i < 512; i++) {
            pool.add(new Particle());
        }
    }

    private Color parseHexColor(String hex) {
        if (hex == null || !hex.startsWith("#")) return new Color(1f, 1f, 1f, 1f);
        try {
            return Color.valueOf(hex.substring(1));
        } catch (Exception e) {
            return new Color(1f, 1f, 1f, 1f);
        }
    }

    public void update(SceneData scene, float dt) {
        for (Entity entity : scene.entities) {
            ParticleSystemComponent pComp = entity.getComponent(ParticleSystemComponent.class);
            TransformComponent transform = entity.getComponent(TransformComponent.class);
            if (pComp == null || !pComp.active || transform == null) continue;

            // Emission
            emissionAccumulator += pComp.emissionRate * dt;
            int countToEmit = (int) emissionAccumulator;
            emissionAccumulator -= countToEmit;

            Color startCol = parseHexColor(pComp.colorStart);
            Color endCol = parseHexColor(pComp.colorEnd);

            for (int i = 0; i < countToEmit; i++) {
                Particle p = allocateParticle();
                if (p == null) break;

                float startX = transform.position.x;
                float startY = transform.position.y;
                if ("box".equals(pComp.shape)) {
                    startX += (random.nextFloat() - 0.5f) * pComp.width;
                    startY += (random.nextFloat() - 0.5f) * pComp.height;
                }

                p.x = startX;
                p.y = startY;
                float angle = random.nextFloat() * (float) Math.PI * 2f;
                float speed = pComp.speed * (0.8f + random.nextFloat() * 0.4f);
                p.vx = (float) Math.cos(angle) * speed;
                p.vy = (float) Math.sin(angle) * speed;
                p.age = 0f;
                p.lifetime = pComp.lifetime;
                p.size = pComp.sizeStart;
                p.color.set(startCol);
                p.alive = true;
            }

            // Update existing
            for (Particle p : pool) {
                if (!p.alive) continue;
                p.age += dt;
                if (p.age >= p.lifetime) {
                    p.alive = false;
                    continue;
                }

                float progress = p.age / p.lifetime;
                p.x += p.vx * dt;
                p.y += (p.vy - (pComp.gravityScale * 980f * dt)) * dt;
                p.size = pComp.sizeStart + (pComp.sizeEnd - pComp.sizeStart) * progress;
                p.color.set(startCol).lerp(endCol, progress);
            }
        }
    }

    private Particle allocateParticle() {
        for (Particle p : pool) {
            if (!p.alive) return p;
        }
        return null;
    }

    public void render(ShapeRenderer shapes) {
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        for (Particle p : pool) {
            if (!p.alive) continue;
            shapes.setColor(p.color);
            shapes.circle(p.x, p.y, Math.max(1f, p.size));
        }
        shapes.end();
    }
}
