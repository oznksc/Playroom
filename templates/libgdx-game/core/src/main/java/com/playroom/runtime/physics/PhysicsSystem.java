package com.playroom.runtime.physics;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.playroom.runtime.components.*;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;
import java.util.HashMap;
import java.util.Map;

public class PhysicsSystem {
    public static final float PPM = 100f; // 100 pixels per Box2D meter
    public static final float PPM_INV = 1f / PPM;

    private World world;
    private final Map<Entity, Body> entityBodies = new HashMap<>();

    public void init(SceneData sceneData) {
        dispose();
        Vector2 box2dGravity = new Vector2(sceneData.gravity.x * PPM_INV, sceneData.gravity.y * PPM_INV);
        world = new World(box2dGravity, true);

        for (Entity entity : sceneData.entities) {
            setupBodyForEntity(entity);
        }
    }

    private void setupBodyForEntity(Entity entity) {
        TransformComponent tc = entity.getComponent(TransformComponent.class);
        if (tc == null) return;

        RigidBodyComponent rb = entity.getComponent(RigidBodyComponent.class);
        PlayerControllerComponent pc = entity.getComponent(PlayerControllerComponent.class);
        ColliderComponent collider = entity.getComponent(AabbColliderComponent.class);
        if (collider == null) collider = entity.getComponent(CircleColliderComponent.class);
        if (collider == null) collider = entity.getComponent(PolygonColliderComponent.class);

        if (rb == null && pc == null && collider == null) return;

        BodyDef bodyDef = new BodyDef();
        if (rb != null) {
            if (rb.isKinematic) {
                bodyDef.type = BodyDef.BodyType.KinematicBody;
            } else {
                bodyDef.type = BodyDef.BodyType.DynamicBody;
            }
            bodyDef.gravityScale = rb.useGravity ? rb.gravityScale : 0f;
            bodyDef.linearDamping = rb.drag;
        } else if (pc != null) {
            bodyDef.type = BodyDef.BodyType.DynamicBody;
            bodyDef.fixedRotation = true;
        } else if (collider != null && collider.isStatic) {
            bodyDef.type = BodyDef.BodyType.StaticBody;
        } else {
            bodyDef.type = BodyDef.BodyType.DynamicBody;
        }

        bodyDef.position.set(tc.position.x * PPM_INV, tc.position.y * PPM_INV);
        bodyDef.angle = (float) Math.toRadians(tc.rotation);

        Body body = world.createBody(bodyDef);
        body.setUserData(entity);

        if (collider instanceof AabbColliderComponent) {
            AabbColliderComponent aabb = (AabbColliderComponent) collider;
            PolygonShape shape = new PolygonShape();
            float hx = (aabb.size.x * 0.5f) * PPM_INV;
            float hy = (aabb.size.y * 0.5f) * PPM_INV;
            Vector2 center = new Vector2(
                (aabb.offset.x + aabb.size.x * 0.5f) * PPM_INV,
                (aabb.offset.y + aabb.size.y * 0.5f) * PPM_INV
            );
            shape.setAsBox(hx, hy, center, 0f);

            FixtureDef fdef = new FixtureDef();
            fdef.shape = shape;
            fdef.isSensor = aabb.isTrigger;
            fdef.density = rb != null ? rb.mass : 1f;
            fdef.friction = 0.4f;
            body.createFixture(fdef);
            shape.dispose();
        } else if (collider instanceof CircleColliderComponent) {
            CircleColliderComponent circle = (CircleColliderComponent) collider;
            CircleShape shape = new CircleShape();
            shape.setRadius(circle.radius * PPM_INV);
            shape.setPosition(new Vector2(circle.offset.x * PPM_INV, circle.offset.y * PPM_INV));

            FixtureDef fdef = new FixtureDef();
            fdef.shape = shape;
            fdef.isSensor = circle.isTrigger;
            fdef.density = rb != null ? rb.mass : 1f;
            fdef.friction = 0.4f;
            body.createFixture(fdef);
            shape.dispose();
        } else if (collider instanceof PolygonColliderComponent) {
            PolygonColliderComponent poly = (PolygonColliderComponent) collider;
            if (poly.vertices != null && poly.vertices.length >= 6) {
                PolygonShape shape = new PolygonShape();
                float[] scaled = new float[poly.vertices.length];
                for (int i = 0; i < poly.vertices.length; i += 2) {
                    scaled[i] = (poly.vertices[i] + poly.offset.x) * PPM_INV;
                    scaled[i + 1] = (poly.vertices[i + 1] + poly.offset.y) * PPM_INV;
                }
                shape.set(scaled);

                FixtureDef fdef = new FixtureDef();
                fdef.shape = shape;
                fdef.isSensor = poly.isTrigger;
                fdef.density = rb != null ? rb.mass : 1f;
                fdef.friction = 0.4f;
                body.createFixture(fdef);
                shape.dispose();
            }
        }

        entityBodies.put(entity, body);
    }

    public void update(float delta) {
        if (world == null) return;

        world.step(Math.min(delta, 0.033f), 6, 2);

        for (Map.Entry<Entity, Body> entry : entityBodies.entrySet()) {
            Entity entity = entry.getKey();
            Body body = entry.getValue();
            TransformComponent tc = entity.getComponent(TransformComponent.class);
            if (tc != null && body.getType() != BodyDef.BodyType.StaticBody) {
                tc.position.x = body.getPosition().x * PPM;
                tc.position.y = body.getPosition().y * PPM;
                tc.rotation = (float) Math.toDegrees(body.getAngle());
            }
        }
    }

    public Body getBody(Entity entity) {
        return entityBodies.get(entity);
    }

    public World getWorld() {
        return world;
    }

    public void dispose() {
        if (world != null) {
            world.dispose();
            world = null;
        }
        entityBodies.clear();
    }
}
