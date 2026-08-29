package com.playroom.runtime.systems;

import com.playroom.runtime.components.StateMachineComponent;
import com.playroom.runtime.components.StateMachineComponent.State;
import com.playroom.runtime.scene.Entity;
import com.playroom.runtime.scene.SceneData;
import com.playroom.runtime.script.ActionExecutor;
import com.playroom.runtime.script.ScriptAction;

public class StateMachineSystem {
    public void update(SceneData scene, float dt, ActionExecutor executor) {
        for (Entity entity : scene.entities) {
            StateMachineComponent sm = entity.getComponent(StateMachineComponent.class);
            if (sm == null || sm.states.isEmpty()) continue;

            if (sm.currentState == null || sm.currentState.isEmpty()) {
                transitionTo(entity, sm, sm.initialState, executor);
            }

            sm.stateTimer += dt;
            State current = sm.getState(sm.currentState);
            if (current != null && current.duration != null && current.duration > 0f) {
                if (sm.stateTimer >= current.duration && current.thenState != null) {
                    transitionTo(entity, sm, current.thenState, executor);
                }
            }
        }
    }

    public void transitionTo(Entity entity, StateMachineComponent sm, String nextStateName, ActionExecutor executor) {
        if (nextStateName == null || nextStateName.isEmpty()) return;

        State current = sm.getState(sm.currentState);
        if (current != null && executor != null) {
            for (ScriptAction action : current.exitActions) {
                executor.execute(action, entity);
            }
        }

        sm.currentState = nextStateName;
        sm.stateTimer = 0f;

        State next = sm.getState(nextStateName);
        if (next != null && executor != null) {
            for (ScriptAction action : next.enterActions) {
                executor.execute(action, entity);
            }
        }
    }

    public void trigger(Entity entity, String triggerName, ActionExecutor executor) {
        StateMachineComponent sm = entity.getComponent(StateMachineComponent.class);
        if (sm == null || sm.currentState == null) return;

        State current = sm.getState(sm.currentState);
        if (current != null && current.transitions.containsKey(triggerName)) {
            String nextState = current.transitions.get(triggerName);
            transitionTo(entity, sm, nextState, executor);
        }
    }
}
