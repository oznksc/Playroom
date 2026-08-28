import type { ReactNode } from "react";
import {
  Plus,
  ClipboardPaste,
  MousePointer,
  Copy,
  Scissors,
  Trash2,
  CopyPlus,
  Boxes,
} from "lucide-react";
import type { ContextMenuItem } from "../ContextMenu.js";

export type BuildContextMenuOptions = {
  selectedEntityId?: string;
  hasClipboard: boolean;
  onAddEntity: () => void;
  onPasteEntity: () => void;
  onSelectAll: () => void;
  onCopyEntity: (id: string) => void;
  onCutEntity: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
  onSaveAsPrefab?: (id: string) => void;
};

export function buildCanvasContextMenuItems({
  selectedEntityId,
  hasClipboard,
  onAddEntity,
  onPasteEntity,
  onSelectAll,
  onCopyEntity,
  onCutEntity,
  onDuplicateEntity,
  onDeleteEntity,
  onSaveAsPrefab,
}: BuildContextMenuOptions): ContextMenuItem[] {
  const hasSelection = Boolean(selectedEntityId);

  return [
    {
      id: "add",
      label: "Add Entity",
      icon: <Plus size={14} />,
      onClick: onAddEntity,
    },
    {
      id: "paste",
      label: "Paste",
      icon: <ClipboardPaste size={14} />,
      shortcut: "⌘V",
      disabled: !hasClipboard,
      onClick: onPasteEntity,
    },
    { id: "sep1", label: "", separator: true },
    {
      id: "selectAll",
      label: "Select All",
      icon: <MousePointer size={14} />,
      shortcut: "⌘A",
      onClick: onSelectAll,
    },
    ...(hasSelection && selectedEntityId
      ? [
          { id: "sep2", label: "", separator: true },
          {
            id: "copy",
            label: "Copy",
            icon: <Copy size={14} />,
            shortcut: "⌘C",
            onClick: () => onCopyEntity(selectedEntityId),
          },
          {
            id: "cut",
            label: "Cut",
            icon: <Scissors size={14} />,
            shortcut: "⌘X",
            onClick: () => onCutEntity(selectedEntityId),
          },
          {
            id: "duplicate",
            label: "Duplicate",
            icon: <CopyPlus size={14} />,
            shortcut: "⌘D",
            onClick: () => onDuplicateEntity(selectedEntityId),
          },
          ...(onSaveAsPrefab
            ? [
                {
                  id: "prefab",
                  label: "Save as Prefab…",
                  icon: <Boxes size={14} />,
                  onClick: () => onSaveAsPrefab(selectedEntityId),
                },
              ]
            : []),
          { id: "sep3", label: "", separator: true },
          {
            id: "delete",
            label: "Delete",
            icon: <Trash2 size={14} />,
            shortcut: "⌫",
            danger: true,
            onClick: () => onDeleteEntity(selectedEntityId),
          },
        ]
      : []),
  ];
}
