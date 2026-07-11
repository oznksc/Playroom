import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Search, CornerDownLeft } from "lucide-react";
import { cn } from "@/ui";

export type CommandItem = {
  id: string;
  label: string;
  /** Extra search terms (not shown) */
  keywords?: string[];
  section: string;
  shortcut?: string;
  icon?: ReactNode;
  disabled?: boolean;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandItem[];
  /** Placeholder under the search field */
  placeholder?: string;
};

type FlatRow =
  | { kind: "section"; id: string; label: string }
  | { kind: "item"; id: string; item: CommandItem; flatIndex: number };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(item: CommandItem, query: string) {
  if (!query) return true;
  const q = normalize(query);
  const haystack = [item.label, item.section, ...(item.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  // All tokens must match (order-independent)
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

/**
 * Apple Spotlight–style command palette (⌘K / ⌘Space).
 * Searchable actions with keyboard navigation and glass chrome.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = "Search actions, tools, entities…",
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(
    () => commands.filter((c) => !c.disabled && matchesQuery(c, query)),
    [commands, query]
  );

  const rows = useMemo(() => {
    const out: FlatRow[] = [];
    let flatIndex = 0;
    let lastSection = "";
    for (const item of filtered) {
      if (item.section !== lastSection) {
        lastSection = item.section;
        out.push({ kind: "section", id: `sec-${item.section}`, label: item.section });
      }
      out.push({ kind: "item", id: item.id, item, flatIndex });
      flatIndex += 1;
    }
    return out;
  }, [filtered]);

  const selectable = useMemo(
    () => rows.filter((r): r is Extract<FlatRow, { kind: "item" }> => r.kind === "item"),
    [rows]
  );

  // Reset state whenever the palette opens
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  // Keep active index in range when filter changes
  useEffect(() => {
    setActiveIndex((i) => {
      if (selectable.length === 0) return 0;
      return Math.min(i, selectable.length - 1);
    });
  }, [selectable.length]);

  // Scroll active row into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, query]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const runItem = useCallback(
    (item: CommandItem) => {
      close();
      // Defer so close animation / focus restore doesn't steal the action
      window.requestAnimationFrame(() => item.run());
    },
    [close]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) =>
          selectable.length === 0 ? 0 : (i + 1) % selectable.length
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) =>
          selectable.length === 0
            ? 0
            : (i - 1 + selectable.length) % selectable.length
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = selectable[activeIndex]?.item;
        if (item) runItem(item);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(Math.max(0, selectable.length - 1));
      }
    },
    [activeIndex, close, runItem, selectable]
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="command-palette" role="presentation">
      <button
        type="button"
        className="command-palette-scrim"
        aria-label="Dismiss command menu"
        onClick={close}
      />
      <div
        className="command-palette-panel glass-surface"
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        onKeyDown={onKeyDown}
      >
        <div className="command-palette-search">
          <Search size={16} className="command-palette-search-icon" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            className="command-palette-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              selectable[activeIndex]
                ? `cmd-item-${selectable[activeIndex].id}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="command-palette-esc">esc</kbd>
        </div>

        <div
          ref={listRef}
          id={listboxId}
          className="command-palette-list"
          role="listbox"
          aria-label="Commands"
        >
          {selectable.length === 0 ? (
            <div className="command-palette-empty">No matching commands</div>
          ) : (
            rows.map((row) => {
              if (row.kind === "section") {
                return (
                  <div key={row.id} className="command-palette-section" role="presentation">
                    {row.label}
                  </div>
                );
              }
              const isActive = row.flatIndex === activeIndex;
              return (
                <button
                  key={row.id}
                  id={`cmd-item-${row.id}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-command-index={row.flatIndex}
                  className={cn("command-palette-item", isActive && "active")}
                  onMouseEnter={() => setActiveIndex(row.flatIndex)}
                  onClick={() => runItem(row.item)}
                >
                  <span className="command-palette-item-icon" aria-hidden>
                    {row.item.icon}
                  </span>
                  <span className="command-palette-item-label">{row.item.label}</span>
                  {row.item.shortcut && (
                    <kbd className="command-palette-shortcut">{row.item.shortcut}</kbd>
                  )}
                  {isActive && (
                    <CornerDownLeft
                      size={12}
                      className="command-palette-enter"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>⌘</kbd>
            <kbd>K</kbd> / <kbd>⌘</kbd>
            <kbd>Space</kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
