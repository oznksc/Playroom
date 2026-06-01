import type { GuiComponent, GuiNode } from "@gamekit/schema";
import {
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  Type,
  Square,
  Image,
  Layers,
  Package
} from "lucide-react";

type GuiComponentPanelProps = {
  components: GuiComponent[];
  editingComponentId: string | null;
  onAddComponent: (name: string) => void;
  onDeleteComponent: (id: string) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  onAddNodeToComponent: (type: GuiNode["type"]) => void;
  onDeleteNodeFromComponent: (nodeId: string) => void;
  onPlaceInstance: (componentId: string) => void;
};

function nodeIcon(type: GuiNode["type"]) {
  switch (type) {
    case "Text": return <Type size={11} className="icon-gui-text" />;
    case "Button": return <Square size={11} className="icon-gui-button" />;
    case "Image": return <Image size={11} className="icon-gui-image" />;
  }
}

function nodeLabel(node: GuiNode): string {
  switch (node.type) {
    case "Text": return node.text || "Text";
    case "Button": return node.text || "Button";
    case "Image": return node.assetId || "Image";
  }
}

export function GuiComponentPanel({
  components,
  editingComponentId,
  onAddComponent,
  onDeleteComponent,
  onStartEdit,
  onStopEdit,
  onAddNodeToComponent,
  onDeleteNodeFromComponent,
  onPlaceInstance
}: GuiComponentPanelProps) {
  const editingComponent = components.find((c) => c.id === editingComponentId);

  function handleAdd() {
    const name = prompt("Enter component name (e.g. HUD, Pause Menu):");
    if (name) onAddComponent(name);
  }

  if (editingComponent) {
    return (
      <div className="gui-component-panel">
        <div className="gui-component-panel-header">
          <button type="button" className="icon-button" onClick={onStopEdit} title="Back to components">
            <ArrowLeft size={13} />
          </button>
          <h3>{editingComponent.name}</h3>
          <div className="gui-add-buttons">
            <button type="button" className="icon-button" onClick={() => onAddNodeToComponent("Text")} title="Add Text">
              <Type size={12} />
            </button>
            <button type="button" className="icon-button" onClick={() => onAddNodeToComponent("Button")} title="Add Button">
              <Square size={12} />
            </button>
            <button type="button" className="icon-button" onClick={() => onAddNodeToComponent("Image")} title="Add Image">
              <Image size={12} />
            </button>
          </div>
        </div>
        <div className="gui-component-list-scroll">
          {editingComponent.nodes.length === 0 ? (
            <div className="hierarchy-empty">
              <Layers size={20} style={{ opacity: 0.2 }} />
              <p>No nodes in this component</p>
            </div>
          ) : (
            editingComponent.nodes.map((node) => (
              <div key={node.id} className="gui-item">
                <span className="gui-item-icon">{nodeIcon(node.type)}</span>
                <span className="gui-item-type">{node.type}</span>
                <span className="gui-item-name" title={nodeLabel(node)}>{nodeLabel(node)}</span>
                <button
                  type="button"
                  className="gui-item-delete"
                  onClick={() => onDeleteNodeFromComponent(node.id)}
                  title="Remove node"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="gui-component-panel">
      <div className="gui-component-panel-header">
        <h3>GUI Components</h3>
        <button type="button" className="icon-button" onClick={handleAdd} title="Create new component">
          <Plus size={13} />
        </button>
      </div>
      <div className="gui-component-list-scroll">
        {components.length === 0 ? (
          <div className="hierarchy-empty">
            <Package size={20} style={{ opacity: 0.2 }} />
            <p>No components defined</p>
          </div>
        ) : (
          components.map((comp) => (
            <div key={comp.id} className="gui-component-item">
              <div className="gui-component-item-header">
                <Package size={12} className="icon-component" />
                <span className="gui-component-name" title={comp.name}>{comp.name}</span>
                <span className="gui-component-count">{comp.nodes.length} nodes</span>
                <div className="gui-component-actions">
                  <button
                    type="button"
                    className="gui-component-action-btn"
                    onClick={() => onStartEdit(comp.id)}
                    title="Edit component nodes"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    className="gui-component-action-btn"
                    onClick={() => onPlaceInstance(comp.id)}
                    title="Place instance in scene"
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    type="button"
                    className="gui-component-action-btn btn-delete"
                    onClick={() => {
                      if (confirm(`Delete component "${comp.name}"?`)) onDeleteComponent(comp.id);
                    }}
                    title="Delete component"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
