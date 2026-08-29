package com.playroom.runtime.script;

import java.util.HashMap;
import java.util.Map;

/** Standalone script action used by state machines and the debug agent. */
public class ScriptAction {
    public String type = "";
    public final Map<String, Object> params = new HashMap<>();

    public ScriptAction() {}

    public ScriptAction(String type) {
        this.type = type != null ? type : "";
    }
}
