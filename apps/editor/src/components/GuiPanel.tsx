import type { GuiNode } from "@gamekit/schema";
import { Plus, Trash2, Type, Square, Image, Layers } from "lucide-react";

type GuiPanelProps = {
  nodes: GuiNode[];
  selectedGuiNodeId: string | null;
  onSelectNode: (id: string) => void;
  onAddNode: (type: GuiNode["type"]) => void;
  onDeleteNode: (id: string) => void;
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

export function GuiPanel({
  nodes,
  selectedGuiNodeId,
  onSelectNode,
  onAddNode,
  onDeleteNode
}: GuiPanelProps) {
  return (
    <div className="gui-panel">
      <div className="gui-panel-header">
        <h3>GUI Nodes</h3>
        <div className="gui-add-buttons">
          <button
            type="button"
            className="icon-button"
            onClick={() => onAddNode("Text")}
            title="Add Text node"
          >
            <Type size={12} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onAddNode("Button")}
            title="Add Button node"
          >
            <Square size={12} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onAddNode("Image")}
            title="Add Image node"
          >
            <Image size={12} />
          </button>
        </div>
      </div>

      <div className="gui-list-scroll">
        {nodes.length === 0 ? (
          <div className="hierarchy-empty">
            <Layers size={20} style={{ opacity: 0.2 }} />
            <p>No GUI nodes</p>
          </div>
        ) : (
          nodes.map((node) => (
            <div
              key={node.id}
              className={`gui-item ${node.id === selectedGuiNodeId ? "selected" : ""}`}
              onClick={() => onSelectNode(node.id)}
            >
              <span className="gui-item-icon">{nodeIcon(node.type)}</span>
              <span className="gui-item-type">{node.type}</span>
              <span className="gui-item-name" title={nodeLabel(node)}>
                {nodeLabel(node)}
              </span>
              <button
                type="button"
                className="gui-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id);
                }}
                title="Delete GUI node"
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
