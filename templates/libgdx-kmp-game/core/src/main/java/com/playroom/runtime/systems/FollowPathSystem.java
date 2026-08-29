package com.playroom.runtime.systems;

import com.badlogic.gdx.math.Vector2;
import com.playroom.runtime.components.FollowPathComponent;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;

public class FollowPathSystem {
    public void update(SceneData sceneData, float delta) {
        if (sceneData == null || sceneData.entities == null) return;

        for (Entity entity : sceneData.entities) {
            if (!entity.active) continue;

            FollowPathComponent follow = entity.getComponent(FollowPathComponent.class);
            if (follow == null || follow.points.isEmpty() || follow.speed <= 0f) continue;

            TransformComponent transform = entity.getComponent(TransformComponent.class);
            if (transform == null) continue;

            int targetIdx = follow.targetPointIndex;
            if (targetIdx < 0 || targetIdx >= follow.points.size()) {
                targetIdx = 0;
                follow.targetPointIndex = 0;
            }

            Vector2 target = follow.points.get(targetIdx);
            float dx = target.x - transform.position.x;
            float dy = target.y - transform.position.y;
            float dist = (float) Math.sqrt(dx * dx + dy * dy);
            float step = follow.speed * delta;

            if (dist <= step || dist < 0.001f) {
                transform.position.set(target.x, target.y);
                follow.currentPointIndex = targetIdx;
                int nextIdx = targetIdx + 1;
                if (nextIdx >= follow.points.size()) {
                    if (follow.loop) {
                        follow.targetPointIndex = 0;
                    }
                } else {
                    follow.targetPointIndex = nextIdx;
                }
            } else {
                transform.position.x += (dx / dist) * step;
                transform.position.y += (dy / dist) * step;
            }
        }
    }
}
