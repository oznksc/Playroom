package com.playroom.runtime.components;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ScriptComponent extends Component {
    public final List<ScriptHandler> handlers = new ArrayList<>();

    public ScriptComponent() {
        super("Script");
    }

    public static class ScriptHandler {
        public String event = "start";
        public final List<ScriptAction> actions = new ArrayList<>();
    }

    public static class ScriptAction {
        public String type = "";
        public final Map<String, Object> params = new HashMap<>();

        public ScriptAction(String type) {
            this.type = type;
        }

        public String getString(String key, String def) {
            Object val = params.get(key);
            return val != null ? String.valueOf(val) : def;
        }

        public int getInt(String key, int def) {
            Object val = params.get(key);
            if (val instanceof Number) return ((Number) val).intValue();
            if (val != null) {
                try { return Integer.parseInt(String.valueOf(val)); } catch (Exception ignored) {}
            }
            return def;
        }

        public long getLong(String key, long def) {
            Object val = params.get(key);
            if (val instanceof Number) return ((Number) val).longValue();
            if (val != null) {
                try { return Long.parseLong(String.valueOf(val)); } catch (Exception ignored) {}
            }
            return def;
        }

        public float getFloat(String key, float def) {
            Object val = params.get(key);
            if (val instanceof Number) return ((Number) val).floatValue();
            if (val != null) {
                try { return Float.parseFloat(String.valueOf(val)); } catch (Exception ignored) {}
            }
            return def;
        }
    }
}
