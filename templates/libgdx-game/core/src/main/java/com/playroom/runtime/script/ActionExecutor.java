package com.playroom.runtime.script;

import com.badlogic.gdx.Gdx;
import com.playroom.runtime.components.ScriptComponent;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;
import com.playroom.runtime.services.GameServices;
import java.util.List;

public class ActionExecutor {
    private final GameServices services;

    public ActionExecutor(GameServices services) {
        this.services = services;
    }

    public void triggerEvent(SceneData sceneData, String eventName) {
        for (Entity entity : sceneData.entities) {
            ScriptComponent script = entity.getComponent(ScriptComponent.class);
            if (script == null) continue;

            for (ScriptComponent.ScriptHandler handler : script.handlers) {
                if (eventName.equalsIgnoreCase(handler.event)) {
                    executeActions(sceneData, entity, handler.actions);
                }
            }
        }
    }

    public void executeActions(SceneData sceneData, Entity sourceEntity, List<ScriptComponent.ScriptAction> actions) {
        if (actions == null || actions.isEmpty()) return;

        for (ScriptComponent.ScriptAction action : actions) {
            executeSingleAction(sceneData, sourceEntity, action);
        }
    }

    private void executeSingleAction(SceneData sceneData, Entity sourceEntity, ScriptComponent.ScriptAction action) {
        String type = action.type;
        if (type == null || type.isEmpty()) return;

        switch (type) {
            case "achievement.unlock": {
                String id = action.getString("achievementId", "");
                if (!id.isEmpty() && services != null) {
                    services.unlockAchievement(id);
                }
                break;
            }
            case "achievement.increment": {
                String id = action.getString("achievementId", "");
                int amount = action.getInt("amount", 1);
                if (!id.isEmpty() && services != null) {
                    services.incrementAchievement(id, amount);
                }
                break;
            }
            case "achievement.setSteps": {
                String id = action.getString("achievementId", "");
                int steps = action.getInt("steps", 0);
                if (!id.isEmpty() && services != null) {
                    services.setAchievementSteps(id, steps);
                }
                break;
            }
            case "leaderboard.submit": {
                String id = action.getString("leaderboardId", "");
                long score = action.getLong("value", 0L);
                if (!id.isEmpty() && services != null) {
                    services.submitScore(id, score);
                }
                break;
            }
            case "services.showUI": {
                String target = action.getString("target", "all");
                if (services != null) {
                    if ("leaderboards".equalsIgnoreCase(target)) {
                        services.showLeaderboard(action.getString("leaderboardId", ""));
                    } else {
                        services.showAchievements();
                    }
                }
                break;
            }
            case "destroyEntity": {
                String targetId = action.getString("entityId", "");
                if (targetId.isEmpty() && sourceEntity != null) {
                    sourceEntity.active = false;
                } else {
                    Entity target = sceneData.findEntityById(targetId);
                    if (target != null) target.active = false;
                }
                break;
            }
            default:
                Gdx.app.log("ActionExecutor", "Action executed: " + type + " with params: " + action.params);
                break;
        }
    }
}
