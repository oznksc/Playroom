package com.playroom.runtime.components;

import com.playroom.runtime.script.ScriptAction;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class StateMachineComponent extends Component {
    public StateMachineComponent() {
        super("StateMachine");
    }

    public static class State {
        public String name = "";
        public Float duration = null;
        public String thenState = null;
        public Map<String, String> transitions = new HashMap<String, String>();
        public List<ScriptAction> enterActions = new ArrayList<ScriptAction>();
        public List<ScriptAction> exitActions = new ArrayList<ScriptAction>();
    }

    public String initialState = "";
    public String currentState = "";
    public float stateTimer = 0f;
    public List<State> states = new ArrayList<State>();

    public State getState(String name) {
        if (name == null) return null;
        for (State s : states) {
            if (name.equals(s.name)) return s;
        }
        return null;
    }
}
