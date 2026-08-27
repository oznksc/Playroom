import { useState, useCallback, type Dispatch, type SetStateAction } from "react";
import type { GuiNode, GuiComponent, GuiComponentInstance, GameKitProject, GameKitScene } from "@gamekit/schema";
import { createId, createGuiComponent, createGuiComponentInstance } from "@gamekit/schema";
import type { ProjectSnapshot } from "../types.js";
import type { ConsoleLog } from "../components/ConsolePanel.js";

export interface UseSceneGuiOptions {
  snapshot: ProjectSnapshot;
  setSnapshot: Dispatch<SetStateAction<ProjectSnapshot>>;
  updateScene: (mutator: (draft: GameKitScene) => void) => void;
  persistProject: (partial: Partial<GameKitProject>) => Promise<void>;
  addConsoleLog: (type: ConsoleLog["type"], message: string) => void;
  setSelectedEntityIds: Dispatch<SetStateAction<Set<string>>>;
}

export function useSceneGui({
  snapshot,
  setSnapshot,
  updateScene,
  persistProject,
  addConsoleLog,
  setSelectedEntityIds,
}: UseSceneGuiOptions) {
  const [selectedGuiNodeId, setSelectedGuiNodeId] = useState<string | null>(null);
  const [selectedComponentInstanceId, setSelectedComponentInstanceId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);

  const addGuiNode = useCallback((type: GuiNode["type"]) => {
    updateScene((draft) => {
      const base = {
        id: createId(type),
        x: 20,
        y: 20,
        width: 200,
        height: 40,
        visible: true,
        interactive: false,
      };
      let node: GuiNode;
      switch (type) {
        case "Text":
          node = { ...base, type: "Text", text: "Text", fontSize: 16, color: "#ffffff", align: "left" };
          break;
        case "Button":
          node = { ...base, type: "Button", text: "Button", action: "", fontSize: 14, color: "#ffffff", backgroundColor: "#333333" };
          break;
        case "Image":
          node = { ...base, type: "Image", assetId: snapshot.assets[0]?.id ?? "" };
          break;
      }
      draft.gui.nodes.push(node);
      setSelectedGuiNodeId(node.id);
      addConsoleLog("system", `Created GUI ${type} node: ${node.id}`);
    });
  }, [updateScene, snapshot.assets, addConsoleLog]);

  const deleteGuiNode = useCallback((id: string) => {
    updateScene((draft) => {
      const index = draft.gui.nodes.findIndex((n) => n.id === id);
      if (index === -1) return;
      draft.gui.nodes.splice(index, 1);
      if (selectedGuiNodeId === id) {
        setSelectedGuiNodeId(null);
      }
      addConsoleLog("system", `Deleted GUI node: ${id}`);
    });
  }, [updateScene, selectedGuiNodeId, addConsoleLog]);

  const updateGuiNode = useCallback((mutator: (node: GuiNode) => void) => {
    if (!selectedGuiNodeId) return;
    updateScene((draft) => {
      const node = draft.gui.nodes.find((n) => n.id === selectedGuiNodeId);
      if (node) mutator(node);
    });
  }, [selectedGuiNodeId, updateScene]);

  // GUI Component definition management
  const addGuiComponent = useCallback((name: string) => {
    const component = createGuiComponent(name);
    const newComponents = [...snapshot.guiComponents, component];
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    setEditingComponentId(component.id);
    void persistProject({ guiComponents: newComponents });
    addConsoleLog("system", `Created GUI component: ${name}`);
  }, [snapshot.guiComponents, setSnapshot, persistProject, addConsoleLog]);

  const deleteGuiComponent = useCallback((componentId: string) => {
    const newComponents = snapshot.guiComponents.filter((c) => c.id !== componentId);
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    updateScene((draft) => {
      draft.gui.componentInstances = (draft.gui.componentInstances ?? []).filter(
        (inst) => inst.componentId !== componentId
      );
    });
    if (editingComponentId === componentId) setEditingComponentId(null);
    void persistProject({ guiComponents: newComponents });
    addConsoleLog("system", `Deleted GUI component`);
  }, [snapshot.guiComponents, setSnapshot, updateScene, editingComponentId, persistProject, addConsoleLog]);

  const addNodeToEditingComponent = useCallback((type: GuiNode["type"]) => {
    if (!editingComponentId) return;
    const base = { id: createId(type), x: 10, y: 10, width: 200, height: 40, visible: true, interactive: false };
    let node: GuiNode;
    switch (type) {
      case "Text": node = { ...base, type: "Text", text: "Text", fontSize: 16, color: "#ffffff" }; break;
      case "Button": node = { ...base, type: "Button", text: "Button", fontSize: 14, color: "#ffffff", backgroundColor: "#333333" }; break;
      case "Image": node = { ...base, type: "Image", assetId: snapshot.assets[0]?.id ?? "" }; break;
    }
    const newComponents = snapshot.guiComponents.map((c) =>
      c.id === editingComponentId ? { ...c, nodes: [...c.nodes, node] } : c
    );
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    void persistProject({ guiComponents: newComponents });
  }, [editingComponentId, snapshot.assets, snapshot.guiComponents, setSnapshot, persistProject]);

  const deleteNodeFromEditingComponent = useCallback((nodeId: string) => {
    if (!editingComponentId) return;
    const newComponents = snapshot.guiComponents.map((c) =>
      c.id === editingComponentId ? { ...c, nodes: c.nodes.filter((n) => n.id !== nodeId) } : c
    );
    setSnapshot((prev) => ({ ...prev, guiComponents: newComponents }));
    void persistProject({ guiComponents: newComponents });
  }, [editingComponentId, snapshot.guiComponents, setSnapshot, persistProject]);

  // GUI Component instance management
  const addGuiComponentInstance = useCallback((componentId: string) => {
    updateScene((draft) => {
      if (!draft.gui.componentInstances) draft.gui.componentInstances = [];
      const instance = createGuiComponentInstance(componentId, { x: 20, y: 20 });
      draft.gui.componentInstances.push(instance);
      setSelectedComponentInstanceId(instance.id);
      setSelectedEntityIds(new Set());
      setSelectedGuiNodeId(null);
    });
    addConsoleLog("system", `Placed component instance`);
  }, [updateScene, setSelectedEntityIds, addConsoleLog]);

  const deleteGuiComponentInstance = useCallback((instanceId: string) => {
    updateScene((draft) => {
      draft.gui.componentInstances = (draft.gui.componentInstances ?? []).filter(
        (i) => i.id !== instanceId
      );
    });
    if (selectedComponentInstanceId === instanceId) setSelectedComponentInstanceId(null);
  }, [updateScene, selectedComponentInstanceId]);

  const updateGuiComponentInstance = useCallback((mutator: (inst: GuiComponentInstance) => void) => {
    if (!selectedComponentInstanceId) return;
    updateScene((draft) => {
      const inst = (draft.gui.componentInstances ?? []).find((i) => i.id === selectedComponentInstanceId);
      if (inst) mutator(inst);
    });
  }, [selectedComponentInstanceId, updateScene]);

  const clearGuiSelection = useCallback(() => {
    setSelectedGuiNodeId(null);
    setSelectedComponentInstanceId(null);
  }, []);

  return {
    selectedGuiNodeId,
    setSelectedGuiNodeId,
    selectedComponentInstanceId,
    setSelectedComponentInstanceId,
    editingComponentId,
    setEditingComponentId,
    addGuiNode,
    deleteGuiNode,
    updateGuiNode,
    addGuiComponent,
    deleteGuiComponent,
    addNodeToEditingComponent,
    deleteNodeFromEditingComponent,
    addGuiComponentInstance,
    deleteGuiComponentInstance,
    updateGuiComponentInstance,
    clearGuiSelection,
  };
}
