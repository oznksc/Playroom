package com.playroom.runtime.systems;

import com.badlogic.gdx.math.MathUtils;
import com.playroom.runtime.components.TransformComponent;
import com.playroom.runtime.components.TweenComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;

public class TweenSystem {
    public void update(SceneData sceneData, float delta) {
        if (sceneData == null || sceneData.entities == null) return;

        for (Entity entity : sceneData.entities) {
            if (!entity.active) continue;

            TweenComponent tween = entity.getComponent(TweenComponent.class);
            if (tween == null || !tween.active || tween.duration <= 0f) continue;

            TransformComponent transform = entity.getComponent(TransformComponent.class);
            if (transform == null) continue;

            tween.elapsed += delta;
            float progress = MathUtils.clamp(tween.elapsed / tween.duration, 0f, 1f);

            float t = tween.forward ? progress : (1f - progress);
            float eased = applyEasing(t, tween.easing);
            float currentValue = MathUtils.lerp(tween.startValue, tween.endValue, eased);

            applyProperty(transform, tween.property, currentValue);

            if (progress >= 1f) {
                if (tween.pingPong) {
                    tween.forward = !tween.forward;
                    tween.elapsed = 0f;
                } else if (tween.loop) {
                    tween.elapsed = 0f;
                } else {
                    tween.active = false;
                }
            }
        }
    }

    private float applyEasing(float t, String easing) {
        if (easing == null) return t;
        switch (easing) {
            case "easeIn":
                return t * t;
            case "easeOut":
                return t * (2f - t);
            case "easeInOut":
                return t < 0.5f ? 2f * t * t : -1f + (4f - 2f * t) * t;
            case "linear":
            default:
                return t;
        }
    }

    private void applyProperty(TransformComponent tc, String property, float value) {
        if (property == null) return;
        switch (property) {
            case "position.x":
                tc.position.x = value;
                break;
            case "position.y":
                tc.position.y = value;
                break;
            case "rotation":
                tc.rotation = value;
                break;
            case "scale.x":
                tc.scale.x = value;
                break;
            case "scale.y":
                tc.scale.y = value;
                break;
            default:
                break;
        }
    }
}
