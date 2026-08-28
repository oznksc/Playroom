# Playroom Design System & UI Architecture

Dense dark IDE chrome for the Playroom game editor. Visual specification: repo-root `brief.md`.

## Architecture & Hierarchy

The design system is organized into a generic two-tier hierarchy:

### 1. Atomic Primitives (Radix UI / Shadcn Core)
Headless, accessible primitives powered by Radix UI and styled with Playroom dark cyber tokens (`cva` + `tailwind-merge`):
- **Button / IconButton / ButtonGroup**: Unified button actions (variants: `primary`, `secondary`, `solid`, `ghost`, `outline`, `danger`, `play`, `stop`, `active`; sizes: `xs` (24px), `sm` (28px), `md` (32px), `lg` (36px)).
- **Input / Textarea / Label**: Accessible form controls with `mono`, tabular numbers, and hairline borders.
- **Checkbox / Switch**: Radix-powered boolean toggles with Cyber Cyan and emerald accents.
- **Select / NativeSelect / SimpleSelect**: Radix-powered accessible dropdowns and dense native selects.
- **Tabs**: Radix tab strip supporting multiple visual variants (`segmented`, `underline`, `cards`) and sizes (`xs`, `sm`, `md`).
- **Accordion**: Radix collapsible accordion cards with animated chevron and smooth height transitions.
- **Dialog / ModalShell**: Accessible modals with glass overlay, backdrop blur, and smooth scaling animations.
- **DropdownMenu / ContextMenu**: Floating glass menus with submenus, checkboxes, radio items, shortcuts, and legacy adapters.
- **Tooltip / SimpleTooltip**: Fast floating tooltips for dense icon buttons and property labels.
- **ScrollArea / Separator**: Dense custom scrollbars and subtle hairline dividers.
- **Badge / StatusDot / Kbd**: High-density signals, status indicators, and keyboard shortcut chips.

### 2. Composite Components (Domain-Specific Editor Patterns)
High-level layouts built by composing the atomic primitives:
- **Field / NumberField / CheckboxField / ColorField**: Inspector rows with glass badge labels.
- **NumberScrubberField**: Interactive numeric input with horizontal pointer drag scrub.
- **PropertyGroup / PropertyRow**: Two-column inspector property tables with inline tooltip hints.
- **Panel / PanelHeader / PanelTitle / PanelBody**: Dense sidebar and dock panel frames.
- **SegmentedControl**: Multi-choice mode toggle (variants: `default`, `subtle`, `pills`).
- **EmptyState**: Visual empty state placeholder cards with icons and actions.

## Stack

- **Tailwind CSS v4** + CSS variables in `styles/globals.css`
- **Radix UI** for headless accessibility, ARIA roles, and keyboard navigation
- **CVA** + `clsx` + `tailwind-merge` for variant dispatching (`cn`)
- **lucide-react** icons
- **Fonts**: IBM Plex Sans (UI) + IBM Plex Mono (data)

## Import

```ts
import {
  Button,
  IconButton,
  ButtonGroup,
  Label,
  Input,
  Select,
  SimpleSelect,
  Switch,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionSection,
  Dialog,
  ModalShell,
  DropdownMenu,
  ContextMenu,
  Tooltip,
  SimpleTooltip,
  Badge,
  StatusDot,
  Kbd,
  Field,
  NumberScrubberField,
  PropertyGroup,
  PropertyRow,
  cn,
} from "@/ui";
```

## Type Scale

| Token / Class | Size | Role |
|---|---|---|
| `text-2xs` / `.type-label` | ~9px | Uppercase labels, badges, tabs |
| `text-xs` / `.type-micro` | ~10px | Hints, secondary metadata |
| `text-sm` / `.type-ui` | ~11px | Section headers, dense UI |
| `text-base` / `.type-body` | ~12px | Controls, body text, menus |
| `text-md` / `.type-title` | 13px | Modal titles, primary section headers |
| `.type-mono` / `font-mono` | ~10–12px | Coordinates, IDs, numbers, JSON |

## Rules

1. Feature code under `components/` always composes `ui/*` — no raw unstyled buttons/inputs.
2. Use accents purposefully for state (Cyber Cyan `#00f0ff` for selection, Emerald `#10b981` for play/success, Ruby `#ef4444` for danger).
3. Review primitives and interactive states at `?view=ui-gallery`.
