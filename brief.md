# GameKit Editor — Design Brief

## Register

**Product.** This is a game development tool, not a marketing surface. The design earns trust through consistency, speed, and information density. Operators open this daily.

## Users

Solo indie game developers and small-team builders working on 2D Expo/Skia games. They arrive with a game idea or an in-progress project. They need to move entities, configure scenes, manage assets, and iterate quickly. The editor is their primary workspace — hours per session.

## Purpose

A browser-based 2D game editor served by a local CLI. Users compose scenes with entities, sprites, colliders, GUI overlays, and reusable GUI components. The editor produces JSON files that drive the Expo/Skia runtime. An MCP server exposes the same operations to AI agents.

## Artifact

The real object is the **canvas** — a viewport showing the scene with entities, GUI overlays, and component instances. Everything in the sidebar and inspector exists to configure what lives on the canvas.

## Composition Pattern

**Operate.** The dominant layout is a 3-column workspace: sidebar (260px) | canvas (flex) | inspector (300px), with a topbar and bottom drawer. The canvas is the hero. Panels are dense tools, not showcases.

## Visual Foundation

- **Dark base**: `#06090e` / `#0b0f17` / `#121824` surface stack
- **Primary accent**: Cyber Cyan `#00f0ff` — active states, selection borders, glow effects
- **Secondary accent**: Engine Violet `#8b5cf6` — component sections, text node badges
- **Tertiary accents**: Gold `#ffb300` (selection highlight), Green `#10b981` (play/success), Red `#ef4444` (stop/error)
- **Neutral tint**: Blues (not pure gray) — `#94a3b8` secondary, `#64748b` muted
- **Typography**: Inter / system-ui, monospace for IDs and numeric fields. Compact sizes (9–13px).
- **Radii**: 3px / 6px / 10px scale
- **Borders**: Thin, low-contrast (`rgba(255,255,255,0.06)` default), cyan-tinted subtle
- **Glow effects**: Cyan, green, red glows for active states — used sparingly

## Voice

Technical, precise, minimal. No marketing copy, no exclamation points. Labels are terse. Console logs use engine metaphors ("IGNITE SIMULATOR", "Physics world stepped"). Status text is factual.

## Design Principles

1. **Canvas-first.** The viewport is always the largest surface. UI chrome stays thin.
2. **Density over decoration.** Every pixel earns its place. No empty hero spaces inside panels.
3. **Color as signal.** Accents indicate state (active, selected, playing, error), not decoration.
4. **Consistent compactness.** Inspector fields, badges, and controls are uniformly small (22px height inputs, 10px labels). Scale stays tight.
5. **Glow as feedback.** Neon glows communicate active/running states — not ambient styling.
6. **Accordion pattern.** Collapsible sections with left accent borders group related controls.
7. **Monospace for data.** UUIDs, coordinates, numeric values use monospace for alignment.

## Anti-References

- No SaaS dashboard card grids
- No marketing hero sections or gradient blobs
- No rounded pill buttons or soft pastel palettes
- No playful/whimsical illustration style
- No generic "dark mode SaaS" with blue-purple gradients

## Accessibility

- Dark theme with sufficient contrast for extended use
- Focus indicators on interactive elements (accent border on focus-within)
- Touch targets via `::before` expansion where visual size is small
- Keyboard navigation: Escape clears selection, standard tab order
- No motion system needed — transitions are fast (120ms) and functional

## Component Rules

- **Inspector fields**: 22px height, badge + input pattern, monospace for numbers
- **Accordions**: Left colored border, 38px header, collapsible body
- **Buttons**: Icon buttons (20–24px), text buttons with 10px font, ghost style default
- **Panels**: Full-height flex column, header bar (38px), scroll area below
- **Tabs**: 8px font uppercase labels, active state with top accent line
- **Status**: Dots (6px) for state, badges for types, monospace for IDs
