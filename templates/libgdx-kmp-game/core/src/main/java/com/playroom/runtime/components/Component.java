package com.playroom.runtime.components;

public abstract class Component {
    private final String type;

    protected Component(String type) {
        this.type = type;
    }

    public String getType() {
        return type;
    }
}
