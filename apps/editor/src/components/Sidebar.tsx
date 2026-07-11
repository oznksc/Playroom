import type { GameKitEntity } from "@gamekit/schema";
import {
  Gamepad2,
  Image,
  Box,
  Video,
  Layers,
  Search,
  Plus,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  CopyPlus,
  FileQuestion,
} from "lucide-react";
import { useState } from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu.js";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  IconButton,
  Button,
  Input,
  EmptyState,
  Badge,
  cn,
} from "@/ui";

type SidebarProps = {
  entities: GameKitEntity[];
  selectedEntityIds: Set<string>;
  onSelectEntity: (id: string, shift: boolean) => void;
  onDeleteEntity?: (id: string) => void;
  onCopyEntity?: (id: string) => void;
  onCutEntity?: (id: string) => void;
  onPasteEntity?: () => void;
  onDuplicateEntity?: (id: string) => void;
  onAddEntity: () => void;
  onAddTemplate?: (templateType: "empty" | "sprite" | "collider" | "player" | "camera") => void;
};

export function Sidebar({
  entities,
  selectedEntityIds,
  onSelectEntity,
  onDeleteEntity,
  onCopyEntity,
  onCutEntity,
  onPasteEntity,
  onDuplicateEntity,
  onAddEntity,
  onAddTemplate,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getEntityIcon(entity: GameKitEntity) {
    const hasPlayer = entity.components.some((c) => c.type === "PlayerController");
    const hasCamera = entity.components.some((c) => c.type === "CameraFollow");
    const hasSprite = entity.components.some((c) => c.type === "Sprite");
    const hasCollider = entity.components.some((c) => c.type === "AabbCollider");

    if (hasPlayer) return <Gamepad2 size={12} className="text-accent-green" />;
    if (hasCamera) return <Video size={12} className="text-accent-purple" />;
    if (hasSprite) return <Image size={12} className="text-accent" />;
    if (hasCollider) return <Box size={12} className="text-selection" />;
    return <Layers size={12} className="text-text-muted" />;
  }

  function getEntityContextMenuItems(entityId: string): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      {
        id: "copy",
        label: "Copy",
        icon: <Copy size={14} />,
        shortcut: "⌘C",
        onClick: () => onCopyEntity?.(entityId),
      },
      {
        id: "cut",
        label: "Cut",
        icon: <Scissors size={14} />,
        shortcut: "⌘X",
        onClick: () => onCutEntity?.(entityId),
      },
      {
        id: "paste",
        label: "Paste",
        icon: <ClipboardPaste size={14} />,
        shortcut: "⌘V",
        onClick: () => onPasteEntity?.(),
      },
      { id: "sep1", label: "", separator: true },
      {
        id: "duplicate",
        label: "Duplicate",
        icon: <CopyPlus size={14} />,
        shortcut: "⌘D",
        onClick: () => onDuplicateEntity?.(entityId),
      },
    ];

    if (onDeleteEntity) {
      items.push(
        { id: "sep2", label: "", separator: true },
        {
          id: "delete",
          label: "Delete",
          icon: <Trash2 size={14} />,
          shortcut: "⌫",
          danger: true,
          onClick: () => onDeleteEntity(entityId),
        }
      );
    }

    return items;
  }

  return (
    <Panel>
      <PanelHeader className="h-9">
        <PanelTitle accent="cyan">Hierarchy</PanelTitle>
        <div className="flex items-center gap-0.5">
          <IconButton size="sm" onClick={onAddEntity} title="Create entity">
            <Plus size={12} />
          </IconButton>
        </div>
      </PanelHeader>

      <div className="search-field px-2 py-1.5">
        <Search size={12} />
        <Input
          type="search"
          placeholder="Filter…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-6 text-xs"
        />
      </div>

      <div className="flex flex-wrap gap-1 px-2 pb-1.5">
        <Button size="sm" variant="ghost" onClick={() => onAddTemplate?.("empty")} title="Empty entity">
          <Layers size={11} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onAddTemplate?.("sprite")} title="Sprite">
          <Image size={11} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onAddTemplate?.("player")} title="Player">
          <Gamepad2 size={11} />
        </Button>
        <span className="ml-auto self-center font-mono text-[10px] text-text-muted">
          {filteredEntities.length}
        </span>
      </div>

      {selectedEntityIds.size > 1 && (
        <div className="bg-accent-muted px-2 py-1 text-[10px] text-accent">
          {selectedEntityIds.size} nodes selected
        </div>
      )}

      <PanelBody className="space-y-0.5 p-1.5">
        {filteredEntities.length === 0 ? (
          <EmptyState
            icon={<FileQuestion size={16} />}
            title={searchQuery ? "No matches" : "Scene is empty"}
            description={searchQuery ? "Try a different filter." : "Spawn an entity to begin."}
          />
        ) : (
          filteredEntities.map((entity) => {
            const isSelected = selectedEntityIds.has(entity.id);
            return (
              <ContextMenu key={entity.id} items={getEntityContextMenuItems(entity.id)}>
                <div
                  role="button"
                  tabIndex={0}
                  data-selected={isSelected}
                  className={cn("list-row cursor-pointer")}
                  onClick={(e) => onSelectEntity(entity.id, e.shiftKey)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEntity(entity.id, e.shiftKey);
                    }
                  }}
                >
                  <span className="shrink-0">{getEntityIcon(entity)}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-text-primary">
                    {entity.name || "Unnamed Entity"}
                  </span>
                  <Badge variant="mono" className="row-meta !ml-0">
                    {entity.id.slice(0, 5)}…
                  </Badge>
                </div>
              </ContextMenu>
            );
          })
        )}
      </PanelBody>
    </Panel>
  );
}
