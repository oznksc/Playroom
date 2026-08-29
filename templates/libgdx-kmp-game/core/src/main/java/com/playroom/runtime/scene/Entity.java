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

    public boolean removeComponent(Class<? extends Component> clazz) {
        final Component existing = getComponent(clazz);
        if (existing == null) return false;
        componentsList.remove(existing);
        componentMap.entrySet().removeIf(e -> e.getValue() == existing);
        return true;
    }

    public boolean removeComponentByType(String type) {
        if (type == null) return false;
        Component found = null;
        for (Component c : componentsList) {
            if (type.equals(c.getType())) {
                found = c;
                break;
            }
        }
        if (found == null) return false;
        final Component existing = found;
        componentsList.remove(existing);
        componentMap.entrySet().removeIf(e -> e.getValue() == existing);
        return true;
    }

    public void setComponent(Component component) {
        if (component == null) return;
        removeComponentByType(component.getType());
        removeComponent(component.getClass());
        addComponent(component);
    }
}
