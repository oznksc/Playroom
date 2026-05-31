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
  FileQuestion
} from "lucide-react";
import { useState } from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu.js";
import { findComponent } from "../lib/components.js";

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
  onAddTemplate
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntities = entities.filter((entity) =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entity.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getEntityIcon(entity: GameKitEntity) {
    const hasPlayer = entity.components.some((c) => c.type === "PlayerController");
    const hasCamera = entity.components.some((c) => c.type === "CameraFollow");
    const hasSprite = entity.components.some((c) => c.type === "Sprite");
    const hasCollider = entity.components.some((c) => c.type === "AabbCollider");

    if (hasPlayer) return <Gamepad2 size={12} className="icon-player" />;
    if (hasCamera) return <Video size={12} className="icon-camera" />;
    if (hasSprite) return <Image size={12} className="icon-sprite" />;
    if (hasCollider) return <Box size={12} className="icon-collider" />;
    return <Layers size={12} className="icon-empty" />;
  }

  function getEntityContextMenuItems(entityId: string): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      {
        id: "copy",
        label: "Copy",
        icon: <Copy size={14} />,
        shortcut: "⌘C",
        onClick: () => onCopyEntity?.(entityId)
      },
      {
        id: "cut",
        label: "Cut",
        icon: <Scissors size={14} />,
        shortcut: "⌘X",
        onClick: () => onCutEntity?.(entityId)
      },
      {
        id: "paste",
        label: "Paste",
        icon: <ClipboardPaste size={14} />,
        shortcut: "⌘V",
        onClick: () => onPasteEntity?.()
      },
      { id: "sep1", label: "", separator: true },
      {
        id: "duplicate",
        label: "Duplicate",
        icon: <CopyPlus size={14} />,
        shortcut: "⌘D",
        onClick: () => onDuplicateEntity?.(entityId)
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
          onClick: () => onDeleteEntity(entityId)
        }
      );
    }

    return items;
  }

  return (
    <aside className="hierarchy-panel">
      {/* Search Input */}
      <div className="hierarchy-search-bar">
        <Search size={12} className="search-icon" />
        <input
          type="text"
          placeholder="Filter scene hierarchy..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Quick Add Entity Templates */}
      <div className="hierarchy-quick-tools">
        <span className="tool-title">Quick Spawner</span>
        <div className="tool-buttons">
          <button
            type="button"
            className="btn-spawner"
            onClick={() => onAddTemplate?.("empty")}
            title="Add Empty Entity"
          >
            <Layers size={11} />
            <span>Empty</span>
          </button>
          <button
            type="button"
            className="btn-spawner"
            onClick={() => onAddTemplate?.("sprite")}
            title="Add Sprite Object"
          >
            <Image size={11} />
            <span>Sprite</span>
          </button>
          <button
            type="button"
            className="btn-spawner"
            onClick={() => onAddTemplate?.("player")}
            title="Add Interactive Player"
          >
            <Gamepad2 size={11} />
            <span>Player</span>
          </button>
        </div>
      </div>

      {/* Hierarchy Title Header */}
      <div className="hierarchy-header">
        <span className="section-label">Scene Graph ({filteredEntities.length})</span>
        <button
          type="button"
          className="icon-button"
          onClick={onAddEntity}
          title="Create standard entity"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Selected stats */}
      {selectedEntityIds.size > 1 && (
        <div className="hierarchy-selection-badge">
          {selectedEntityIds.size} nodes selected
        </div>
      )}

      {/* Entity Tree List */}
      <div className="hierarchy-tree-list">
        {filteredEntities.length === 0 ? (
          <div className="hierarchy-empty">
            <FileQuestion size={20} style={{ opacity: 0.2 }} />
            <p>{searchQuery ? "No matching elements found" : "Scene is empty"}</p>
          </div>
        ) : (
          filteredEntities.map((entity) => {
            const isSelected = selectedEntityIds.has(entity.id);
            return (
              <ContextMenu key={entity.id} items={getEntityContextMenuItems(entity.id)}>
                <div
                  className={`hierarchy-tree-item ${isSelected ? "selected" : ""}`}
                  onClick={(e) => onSelectEntity(entity.id, e.shiftKey)}
                >
                  <span className="item-prefix-icon">
                    {getEntityIcon(entity)}
                  </span>
                  <span className="item-name" title={entity.name}>
                    {entity.name || "Unnamed Entity"}
                  </span>
                  <span className="item-id-badge" title={entity.id}>
                    {entity.id.slice(0, 5)}...
                  </span>
                </div>
              </ContextMenu>
            );
          })
        )}
      </div>
    </aside>
  );
}