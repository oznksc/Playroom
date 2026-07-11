import type { GuiComponent, GuiNode } from "@gamekit/schema";
import {
  Trash2,
  Pencil,
  ArrowLeft,
  Type,
  Square,
  Image,
  Layers,
  Package,
  Plus,
} from "lucide-react";
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

export function GuiComponentPanel({
  components,
  editingComponentId,
  onAddComponent,
  onDeleteComponent,
  onStartEdit,
  onStopEdit,
  onAddNodeToComponent,
  onDeleteNodeFromComponent,
  onPlaceInstance,
}: GuiComponentPanelProps) {
  const editingComponent = components.find((c) => c.id === editingComponentId);

  function handleAdd() {
    const name = prompt("Enter component name (e.g. HUD, Pause Menu):");
    if (name) onAddComponent(name);
  }

  if (editingComponent) {
    return (
      <Panel>
        <PanelHeader>
          <div className="flex min-w-0 items-center gap-1.5">
            <IconButton size="sm" onClick={onStopEdit} title="Back">
              <ArrowLeft size={13} />
            </IconButton>
            <PanelTitle accent="purple" className="truncate">
              {editingComponent.name}
            </PanelTitle>
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton size="sm" title="Add Text" onClick={() => onAddNodeToComponent("Text")}>
              <Type size={12} />
            </IconButton>
            <IconButton size="sm" title="Add Button" onClick={() => onAddNodeToComponent("Button")}>
              <Square size={12} />
            </IconButton>
            <IconButton size="sm" title="Add Image" onClick={() => onAddNodeToComponent("Image")}>
              <Image size={12} />
            </IconButton>
          </div>
        </PanelHeader>
        <PanelBody className="space-y-0.5 p-1.5">
          {editingComponent.nodes.length === 0 ? (
            <EmptyState icon={<Layers size={16} />} title="No nodes in component" />
          ) : (
            editingComponent.nodes.map((node) => (
              <div key={node.id} className={cn("list-row")}>
                {nodeIcon(node.type)}
                <span className="min-w-0 flex-1 truncate text-[12px]">{nodeLabel(node)}</span>
                <Badge variant="muted">{node.type}</Badge>
                <IconButton
                  size="sm"
                  variant="danger"
                  onClick={() => onDeleteNodeFromComponent(node.id)}
                >
                  <Trash2 size={11} />
                </IconButton>
              </div>
            ))
          )}
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle accent="purple">GUI Components</PanelTitle>
        <IconButton size="sm" onClick={handleAdd} title="Add component">
          <Plus size={13} />
        </IconButton>
      </PanelHeader>
      <PanelBody className="space-y-0.5 p-1.5">
        {components.length === 0 ? (
          <EmptyState
            icon={<Package size={16} />}
            title="No GUI components"
            description="Create reusable HUD pieces and place instances."
          />
        ) : (
          components.map((comp) => (
            <div key={comp.id} className={cn("list-row")}>
              <Package size={12} className="shrink-0 text-accent-purple" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-text-primary">
                {comp.name}
              </span>
              <Badge variant="mono">{comp.nodes.length}</Badge>
              <IconButton size="sm" title="Edit" onClick={() => onStartEdit(comp.id)}>
                <Pencil size={11} />
              </IconButton>
              <IconButton size="sm" title="Place instance" onClick={() => onPlaceInstance(comp.id)}>
                <Layers size={11} />
              </IconButton>
              <IconButton
                size="sm"
                variant="danger"
                title="Delete"
                onClick={() => {
                  if (confirm(`Delete component "${comp.name}"?`)) onDeleteComponent(comp.id);
                }}
              >
                <Trash2 size={11} />
              </IconButton>
            </div>
          ))
        )}
      </PanelBody>
    </Panel>
  );
}
