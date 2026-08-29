package com.playroom.runtime.debug;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.physics.box2d.Body;
import com.badlogic.gdx.physics.box2d.BodyDef;
import com.playroom.runtime.components.AabbColliderComponent;
import com.playroom.runtime.components.CircleColliderComponent;
import com.playroom.runtime.components.PolygonColliderComponent;
import com.playroom.runtime.components.SpriteComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.physics.PhysicsSystem;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;

public final class DebugOverlay {
    private ShapeRenderer shapes;

    public void init() {
        shapes = new ShapeRenderer();
    }

    public void render(SceneData scene, OrthographicCamera camera, PhysicsSystem physics, String mode) {
        if (shapes == null || scene == null || camera == null) return;
        if (mode == null) mode = "default";
        boolean drawColliders = "colliders".equals(mode) || "physics".equals(mode) || "wireframe".equals(mode);
        boolean drawSprites = "wireframe".equals(mode);
        if (!drawColliders && !drawSprites) return;

        shapes.setProjectionMatrix(camera.combined);
        shapes.begin(ShapeRenderer.ShapeType.Line);

        for (Entity entity : scene.entities) {
            TransformComponent tc = entity.getComponent(TransformComponent.class);
            if (tc == null) continue;

            if (drawSprites) {
                SpriteComponent sc = entity.getComponent(SpriteComponent.class);
                if (sc != null) {
                    shapes.setColor(Color.CYAN);
                    float x = tc.position.x - sc.width * sc.anchor.x;
                    float y = tc.position.y - sc.height * sc.anchor.y;
                    shapes.rect(x, y, sc.width * tc.scale.x, sc.height * tc.scale.y);
                }
            }

            if (drawColliders) {
                AabbColliderComponent aabb = entity.getComponent(AabbColliderComponent.class);
                if (aabb != null) {
                    shapes.setColor(aabb.isTrigger ? Color.BLUE : Color.GREEN);
                    shapes.rect(
                        tc.position.x + aabb.offset.x,
                        tc.position.y + aabb.offset.y,
                        aabb.size.x,
                        aabb.size.y
                    );
                }
                CircleColliderComponent circle = entity.getComponent(CircleColliderComponent.class);
                if (circle != null) {
                    shapes.setColor(circle.isTrigger ? Color.BLUE : Color.GREEN);
                    shapes.circle(
                        tc.position.x + circle.offset.x,
                        tc.position.y + circle.offset.y,
                        circle.radius,
                        16
                    );
                }
                PolygonColliderComponent poly = entity.getComponent(PolygonColliderComponent.class);
                if (poly != null && poly.vertices != null && poly.vertices.length >= 6) {
                    shapes.setColor(poly.isTrigger ? Color.BLUE : Color.GREEN);
                    float[] v = poly.vertices;
                    for (int i = 0; i + 3 < v.length; i += 2) {
                        shapes.line(
                            tc.position.x + poly.offset.x + v[i],
                            tc.position.y + poly.offset.y + v[i + 1],
                            tc.position.x + poly.offset.x + v[i + 2],
                            tc.position.y + poly.offset.y + v[i + 3]
                        );
                    }
                    shapes.line(
                        tc.position.x + poly.offset.x + v[v.length - 2],
                        tc.position.y + poly.offset.y + v[v.length - 1],
                        tc.position.x + poly.offset.x + v[0],
                        tc.position.y + poly.offset.y + v[1]
                    );
                }

                if (physics != null) {
                    Body body = physics.getBody(entity);
                    if (body != null) {
                        if (body.getType() == BodyDef.BodyType.DynamicBody) shapes.setColor(Color.ORANGE);
                        else if (body.getType() == BodyDef.BodyType.KinematicBody) shapes.setColor(Color.YELLOW);
                        else shapes.setColor(Color.LIME);
                        float x = body.getPosition().x * PhysicsSystem.PPM;
                        float y = body.getPosition().y * PhysicsSystem.PPM;
                        shapes.circle(x, y, 4f, 8);
                    }
                }
            }
        }

        shapes.end();
    }

    public void dispose() {
        if (shapes != null) shapes.dispose();
        shapes = null;
    }
}
