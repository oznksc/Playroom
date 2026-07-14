import type { GameKitScene, TransformComponent } from "@gamekit/schema";
import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { findComponent } from "../lib/components.js";

type UseKeyboardShortcutsParams = {
  /** Ref tracking whether the command palette is open (event suppressor). */
  commandPaletteOpenRef: RefObject<boolean>;

  /** Whether the editor is in play mode. */
  isPlaying: boolean;
  isPaused: boolean;

  /** Pressed-key set used by play-mode input simulation. */
  pressedKeysRef: MutableRefObject<Set<string>>;

  /** Undo / redo / push scene mutation. */
  undo: () => void;
  redo: () => void;
  push: (mutator: (draft: GameKitScene | undefined) => void) => void;

  /** Save current scene. */
  saveScene: (scene?: GameKitScene) => void;

  /** Ref to the current scene (avoid stale closure). */
  sceneRef: MutableRefObject<GameKitScene | null | undefined>;

  /** Set active canvas tool. */
  setActiveTool: Dispatch<SetStateAction<"select" | "translate" | "rotate" | "scale" | "paint" | "erase" | "polygon-edit">>;

  /** Currently selected entity IDs (ref to avoid stale closure). */
  selectedEntityIdsRef: MutableRefObject<Set<string>>;

  /** Mutable dirty flag setter. */
  setIsDirty: (dirty: boolean) => void;

  /** Trigger debounced auto-save. */
  triggerAutoSave: () => void;

  /** Delete / duplicate / paste entity callbacks. */
  deleteEntity: (id: string) => void;
  duplicateEntity: (id: string) => void;
  pasteEntity: (entity: import("@gamekit/schema").GameKitEntity) => void;

  /** Clipboard ref for copy/paste. */
  clipboardRef: MutableRefObject<import("@gamekit/schema").GameKitEntity | null>;

  /** Selection refs for Escape handling. */
  selectedGuiNodeIdRef: RefObject<string | null>;
  selectedComponentInstanceIdRef: RefObject<string | null>;
  setSelectedEntityIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectedGuiNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedComponentInstanceId: Dispatch<SetStateAction<string | null>>;

  /** Snap settings. */
  snap: boolean;
  snapSize: number;

  /** Open / close command palette. */
  setCommandPaletteOpen: Dispatch<SetStateAction<boolean>>;
};

/**
 * Registers global keyboard shortcuts for the editor.
 *
 * Extracted from App.tsx to keep the root component focused on composition.
 * Contains two logical groups:
 * 1. ⌘K / ⌘Space → toggle command palette
 * 2. All other editor shortcuts (undo, redo, save, gizmos, nudge, delete, copy/paste, escape)
 */
export function useKeyboardShortcuts(params: UseKeyboardShortcutsParams) {
  const {
    commandPaletteOpenRef,
    isPlaying,
    isPaused,
    pressedKeysRef,
    undo,
    redo,
    push,
    saveScene,
    sceneRef,
    setActiveTool,
    selectedEntityIdsRef,
    setIsDirty,
    triggerAutoSave,
    deleteEntity,
    duplicateEntity,
    pasteEntity,
    clipboardRef,
    selectedGuiNodeIdRef,
    selectedComponentInstanceIdRef,
    setSelectedEntityIds,
    setSelectedGuiNodeId,
    setSelectedComponentInstanceId,
    snap,
    snapSize,
    setCommandPaletteOpen,
  } = params;

  // ⌘K / ⌘Space — Spotlight-style command palette toggle
  useEffect(() => {
    function handleCommandPaletteHotkey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta || event.shiftKey || event.altKey) return;

      const isK = event.key === "k" || event.key === "K";
      const isSpace = event.code === "Space";
      if (!isK && !isSpace) return;

      event.preventDefault();
      event.stopPropagation();
      setCommandPaletteOpen((open) => !open);
    }

    window.addEventListener("keydown", handleCommandPaletteHotkey, true);
    return () => window.removeEventListener("keydown", handleCommandPaletteHotkey, true);
  }, [setCommandPaletteOpen]);

  // Global editor shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (commandPaletteOpenRef.current) return;

      const ctrl = event.metaKey || event.ctrlKey;
      const isInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      // Play-mode arrow key capture for player movement
      if (isPlaying && !isPaused) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(event.key)) {
          pressedKeysRef.current.add(event.key);
          if (["ArrowUp", " "].includes(event.key)) event.preventDefault();
          return;
        }
      }

      // Undo / redo
      if (ctrl && !event.shiftKey && event.key === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (ctrl && (event.shiftKey && event.key === "z") || (ctrl && event.key === "y")) {
        event.preventDefault();
        redo();
        return;
      }

      // Save
      if (ctrl && !event.shiftKey && event.key === "s") {
        event.preventDefault();
        saveScene(sceneRef.current ?? undefined);
        return;
      }

      // Gizmo tool shortcuts (q/w/e/r/p)
      if (!isInput && !isPlaying) {
        if (event.key === "q" || event.key === "Q") { setActiveTool("select"); return; }
        if (event.key === "w" || event.key === "W") { setActiveTool("translate"); return; }
        if (event.key === "e" || event.key === "E") { setActiveTool("rotate"); return; }
        if (event.key === "r" || event.key === "R") { setActiveTool("scale"); return; }
        if (event.key === "p" || event.key === "P") { setActiveTool("polygon-edit"); return; }
      }

      // Delete / backspace
      if (!isInput && (event.key === "Delete" || event.key === "Backspace")) {
        const ids = selectedEntityIdsRef.current;
        if (ids.size > 0) {
          event.preventDefault();
          ids.forEach((id) => deleteEntity(id));
        }
        return;
      }

      // Duplicate (⌘D)
      if (ctrl && event.key === "d") {
        const ids = selectedEntityIdsRef.current;
        if (ids.size > 0) {
          event.preventDefault();
          ids.forEach((id) => duplicateEntity(id));
        }
        return;
      }

      // Copy (⌘C)
      if (ctrl && event.key === "c") {
        const ids = selectedEntityIdsRef.current;
        if (ids.size > 0) {
          event.preventDefault();
          const s = sceneRef.current;
          if (!s) return;
          const entity = s.entities.find((e) => e.id === [...ids][0]);
          if (entity) clipboardRef.current = structuredClone(entity) as import("@gamekit/schema").GameKitEntity;
        }
        return;
      }

      // Paste (⌘V)
      if (ctrl && event.key === "v") {
        const entity = clipboardRef.current;
        if (!entity) return;
        event.preventDefault();
        pasteEntity(entity);
        return;
      }

      // Escape — clear selection
      if (event.key === "Escape") {
        if (
          selectedEntityIdsRef.current.size > 0 ||
          selectedGuiNodeIdRef.current ||
          selectedComponentInstanceIdRef.current
        ) {
          event.preventDefault();
          setSelectedEntityIds(new Set());
          setSelectedGuiNodeId(null);
          setSelectedComponentInstanceId(null);
        }
        return;
      }

      // Snap-aware arrow nudge (second pass — with snap grid alignment)
      if (!isInput && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        const ids = [...selectedEntityIdsRef.current];
        if (ids.length === 0) return;
        event.preventDefault();
        const moveMap: Record<string, { x: number; y: number }> = {
          ArrowUp: { x: 0, y: -1 },
          ArrowDown: { x: 0, y: 1 },
          ArrowLeft: { x: -1, y: 0 },
          ArrowRight: { x: 1, y: 0 },
        };
        const delta = event.shiftKey ? 10 : 1;
        const move = moveMap[event.key];
        if (!move) return;
        push((draft) => {
          if (!draft) return;
          for (const eid of ids) {
            const ent = draft.entities.find((e) => e.id === eid);
            if (!ent) continue;
            const t = findComponent<TransformComponent>(ent, "Transform");
            if (!t) continue;
            if (snap) {
              const rounded = {
                x: Math.round(t.position.x / snapSize) * snapSize,
                y: Math.round(t.position.y / snapSize) * snapSize,
              };
              t.position.x = rounded.x + move.x * snapSize;
              t.position.y = rounded.y + move.y * snapSize;
            } else {
              t.position.x = Math.round((t.position.x + move.x * delta) * 10) / 10;
              t.position.y = Math.round((t.position.y + move.y * delta) * 10) / 10;
            }
          }
        });
        setIsDirty(true);
        triggerAutoSave();
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (isPlaying && !isPaused) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(event.key)) {
          pressedKeysRef.current.delete(event.key);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    commandPaletteOpenRef,
    undo,
    redo,
    push,
    saveScene,
    sceneRef,
    setActiveTool,
    selectedEntityIdsRef,
    setIsDirty,
    triggerAutoSave,
    deleteEntity,
    duplicateEntity,
    pasteEntity,
    clipboardRef,
    selectedGuiNodeIdRef,
    selectedComponentInstanceIdRef,
    setSelectedEntityIds,
    setSelectedGuiNodeId,
    setSelectedComponentInstanceId,
    snap,
    snapSize,
    isPlaying,
    isPaused,
    pressedKeysRef,
    setCommandPaletteOpen,
  ]);
}
