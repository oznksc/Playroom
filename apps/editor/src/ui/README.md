# Playroom Design System

Dense dark IDE chrome for the game editor. Visual rules: repo-root `brief.md`.

## Stack

- **Tailwind CSS v4** + CSS variables in `styles/globals.css`
- **Radix UI** for dialog, menus, tooltip, checkbox, scroll area
- **CVA** + `clsx` + `tailwind-merge` for variants (`cn`)
- **lucide-react** icons
- **Fonts**: Plus Jakarta Sans (UI) + JetBrains Mono (data) via Google Fonts in `index.html`. Google Sans is proprietary — do not embed it.

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
