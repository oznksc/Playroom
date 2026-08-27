package com.playroom.runtime.scene;

import com.playroom.runtime.components.Component;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Entity {
    public String id = "";
    public String name = "";
    public boolean active = true;

    private final List<Component> componentsList = new ArrayList<>();
    private final Map<Class<? extends Component>, Component> componentMap = new HashMap<>();

    public Entity(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public void addComponent(Component component) {
        if (component == null) return;
        componentsList.add(component);
        componentMap.put(component.getClass(), component);
    }

    @SuppressWarnings("unchecked")
    public <T extends Component> T getComponent(Class<T> clazz) {
        Component comp = componentMap.get(clazz);
        if (comp != null) return (T) comp;

        for (Component c : componentsList) {
            if (clazz.isInstance(c)) {
                return (T) c;
            }
        }
        return null;
    }

    public boolean hasComponent(Class<? extends Component> clazz) {
        return getComponent(clazz) != null;
    }

    public List<Component> getComponents() {
        return componentsList;
    }
}
