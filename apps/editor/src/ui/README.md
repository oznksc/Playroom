# Playroom Design System

Dense dark IDE chrome for the game editor. Visual rules: repo-root `brief.md`.

## Stack

- **Tailwind CSS v4** + CSS variables in `styles/globals.css`
- **Radix UI** for dialog, menus, tooltip, checkbox, scroll area
- **CVA** + `clsx` + `tailwind-merge` for variants (`cn`)
- **lucide-react** icons
- **Fonts**: IBM Plex Sans (UI) + IBM Plex Mono (data) via Google Fonts in `index.html`. Chosen for dense tool chrome; avoid soft SaaS geometric faces.

## Style ownership

- `styles/globals.css` is the only application-level stylesheet entry. It owns Tailwind, tokens, resets, and documented utilities.
- Feature layout and visual rules live beside their React owner in `*.module.css` files.
- Shared feature CSS Modules are reserved for real multi-component boundaries such as the canvas workspace and sheet chrome.
- Keep stable DOM hooks in `id`, `data-*`, ARIA, or test attributes. CSS class names are private implementation details.

## Type scale

| Token / class | Size | Use |
|---------------|------|-----|
| `text-2xs` / `.type-label` | ~9px | Uppercase labels, badges, tabs |
| `text-xs` / `.type-micro` | ~10px | Hints, footer, secondary meta |
| `text-sm` / `.type-ui` | ~11px | Accordion headers, dense UI |
| `text-base` / `.type-body` | ~12px | Controls, body, menus |
| `text-md` / `.type-title` | 13px | Titles, primary controls |
| `.type-mono` / `font-mono` | ~10–12px | IDs, numbers, JSON |

## Import

```ts
import { Button, Panel, NumberField, Dialog, cn } from "@/ui";
```

## Primitives

| Export | Role |
|--------|------|
| `Button` / `IconButton` | Actions (ghost default, compact heights) |
| `Input` / `Textarea` / `Select` / `Checkbox` | Form controls |
| `Field` / `NumberField` / `CheckboxField` / `ColorField` | Inspector badge + control rows |
| `NumberScrubberField` / `PropertyRow` / `PropertyGroup` | Game-editor numeric and inspector controls |
| `SegmentedControl` / `Kbd` | Mode selection and shortcut hints |
| `ModalShell` | Standard modal header, scroll body, and sticky footer |
| `Badge` / `StatusDot` | Type + status signal |
| `Panel` / `PanelHeader` / `PanelTitle` / `PanelBody` | Sidebar/inspector shells |
| `AccordionSection` | Collapsible component cards |
| `Tabs*` | Uppercase tab strip |
| `Dialog*` | Modals (wizard, agent settings) |
| `ContextMenu*` / `LegacyContextMenu` | Right-click menus |
| `DropdownMenu*` | Menus |
| `Tooltip*` / `SimpleTooltip` | Toolbar tips |
| `ScrollArea` / `Separator` / `EmptyState` | Structure |

## Rules

1. Feature code under `components/` composes `ui/*` — no new raw button/input styling.
2. Use brief accents for state (cyan select, green play, red danger), not decoration.
3. Densities: ~22–30px controls, 9–13px type, monospace for IDs/numbers.
4. Prefer semantic CSS variables (`--surface-*`, `--border-*`, `--signal-*`) over raw colours in new primitives.
5. Review primitives at `?view=ui-gallery` before composing them into feature screens.
6. Prefer Tailwind for small composition rules and CSS Modules for selectors, state variants, responsive layout, or descendant styling. Do not add SCSS.
