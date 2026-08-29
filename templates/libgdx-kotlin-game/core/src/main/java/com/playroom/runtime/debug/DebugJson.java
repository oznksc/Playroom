package com.playroom.runtime.debug;

import java.util.Locale;

/** Tiny JSON writer. Values that already look like objects/arrays are inlined raw. */
public final class DebugJson {
    private DebugJson() {}

    public static String obj(Object... kv) {
        StringBuilder sb = new StringBuilder();
        sb.append('{');
        for (int i = 0; i + 1 < kv.length; i += 2) {
            if (i > 0) sb.append(',');
            sb.append(quote(String.valueOf(kv[i]))).append(':').append(value(kv[i + 1]));
        }
        sb.append('}');
        return sb.toString();
    }

    public static String arr(Iterable<?> items) {
        StringBuilder sb = new StringBuilder();
        sb.append('[');
        boolean first = true;
        for (Object item : items) {
            if (!first) sb.append(',');
            first = false;
            sb.append(value(item));
        }
        sb.append(']');
        return sb.toString();
    }

    public static String rawArr(String... items) {
        StringBuilder sb = new StringBuilder();
        sb.append('[');
        for (int i = 0; i < items.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(items[i] == null ? "null" : items[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    public static String quote(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder(s.length() + 2);
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format(Locale.US, "\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        sb.append('"');
        return sb.toString();
    }

    public static String value(Object v) {
        if (v == null) return "null";
        if (v instanceof Boolean || v instanceof Number) return String.valueOf(v);
        if (v instanceof Raw) return ((Raw) v).json;
        String s = String.valueOf(v);
        if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
            return s;
        }
        return quote(s);
    }

    public static final class Raw {
        public final String json;
        public Raw(String json) { this.json = json == null ? "null" : json; }
        @Override public String toString() { return json; }
    }

    public static Raw raw(String json) {
        return new Raw(json);
    }
}
