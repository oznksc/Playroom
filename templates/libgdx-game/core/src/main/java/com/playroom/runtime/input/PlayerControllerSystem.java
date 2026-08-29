package com.playroom.runtime.input;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.Body;
import com.playroom.runtime.components.PlayerControllerComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.physics.PhysicsSystem;
import com.playroom.runtime.debug.DebugController;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;

public class PlayerControllerSystem {
    private boolean isHeld(int key) {
        return Gdx.input.isKeyPressed(key) || DebugController.isKeyHeld(key);
    }

    private boolean isJust(int key) {
        return Gdx.input.isKeyJustPressed(key) || DebugController.isKeyJustPressed(key);
    }

    public void update(SceneData sceneData, PhysicsSystem physics, float delta) {
        for (Entity entity : sceneData.entities) {
            PlayerControllerComponent pc = entity.getComponent(PlayerControllerComponent.class);
            if (pc == null) continue;

            Body body = physics.getBody(entity);
            TransformComponent tc = entity.getComponent(TransformComponent.class);

            float moveX = 0f;
            if (isHeld(Input.Keys.A) || isHeld(Input.Keys.LEFT)) {
                moveX -= 1f;
            }
            if (isHeld(Input.Keys.D) || isHeld(Input.Keys.RIGHT)) {
                moveX += 1f;
            }

            boolean jump = isJust(Input.Keys.SPACE) || isJust(Input.Keys.W) || isJust(Input.Keys.UP);

            if (body != null) {
                Vector2 vel = body.getLinearVelocity();
                float targetVelX = (moveX * pc.speed) * PhysicsSystem.PPM_INV;
                body.setLinearVelocity(targetVelX, vel.y);

                if (jump && Math.abs(vel.y) < 0.1f) {
                    // In yDown = true coordinates, upward impulse is negative Y
                    float jumpVelY = -pc.jumpVelocity * PhysicsSystem.PPM_INV;
                    body.setLinearVelocity(body.getLinearVelocity().x, jumpVelY);
                }
            } else if (tc != null) {
                // Kinematic fallback without physics body
                tc.position.x += moveX * pc.speed * delta;
            }
        }
    }
}
