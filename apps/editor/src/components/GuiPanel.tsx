import type { GuiNode } from "@gamekit/schema";
import { Plus, Trash2, Type, Square, Image, Layers } from "lucide-react";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  IconButton,
  EmptyState,
  Badge,
  cn,
} from "@/ui";

type GuiPanelProps = {
  nodes: GuiNode[];
  selectedGuiNodeId: string | null;
  onSelectNode: (id: string) => void;
  onAddNode: (type: GuiNode["type"]) => void;
  onDeleteNode: (id: string) => void;
};

function nodeIcon(type: GuiNode["type"]) {
  switch (type) {
    case "Text":
      return <Type size={11} className="text-accent-purple" />;
    case "Button":
      return <Square size={11} className="text-accent" />;
    case "Image":
      return <Image size={11} className="text-accent-green" />;
  }
}

function nodeLabel(node: GuiNode): string {
  switch (node.type) {
    case "Text":
      return node.text || "Text";
    case "Button":
      return node.text || "Button";
    case "Image":
      return node.assetId || "Image";
  }
}

export function GuiPanel({
  nodes,
  selectedGuiNodeId,
  onSelectNode,
  onAddNode,
  onDeleteNode,
}: GuiPanelProps) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>GUI Nodes</PanelTitle>
        <div className="flex items-center gap-0.5">
          <IconButton size="sm" title="Add Text" onClick={() => onAddNode("Text")}>
            <Type size={12} />
          </IconButton>
          <IconButton size="sm" title="Add Button" onClick={() => onAddNode("Button")}>
            <Square size={12} />
          </IconButton>
          <IconButton size="sm" title="Add Image" onClick={() => onAddNode("Image")}>
            <Image size={12} />
          </IconButton>
        </div>
      </PanelHeader>
      <PanelBody className="space-y-0.5 p-1.5">
        {nodes.length === 0 ? (
          <EmptyState
            icon={<Layers size={16} />}
            title="No GUI nodes"
            description="Add text, button, or image overlays."
          />
        ) : (
          nodes.map((node) => {
            const active = node.id === selectedGuiNodeId;
            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                data-selected={active}
                className={cn("list-row cursor-pointer")}
                onClick={() => onSelectNode(node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectNode(node.id);
                  }
                }}
              >
                {nodeIcon(node.type)}
                <span className="min-w-0 flex-1 truncate text-[12px] text-text-primary">
                  {nodeLabel(node)}
                </span>
                <Badge variant="muted">{node.type}</Badge>
                <IconButton
                  size="sm"
                  variant="danger"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                >
                  <Trash2 size={11} />
                </IconButton>
              </div>
            );
          })
        )}
      </PanelBody>
    </Panel>
  );
}
