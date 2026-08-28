# Playroom Editor & Studio — Canonical Design Brief

## Register

**Product.** This is a professional 2D game development suite (Editor & Studio), not a marketing surface. The design earns developer trust through precision, high information density, speed, visual consistency, and deterministic behavior.

## Users

Solo indie game developers, technical designers, and gameplay programmers working on 2D games (Expo/Skia, Phaser, and native runtimes). The workspace is their primary canvas — open for multi-hour production sessions daily.

## Composition Pattern

**Canvas-First Refined Glass.** The viewport stage is full-bleed (`#06090e`). Tool chrome, inspection sheets, activity navigation, and content drawers float over the stage with refined glassmorphism (`backdrop-filter: blur(22px) saturate(1.4)`), thin high-precision borders, and subtle glow signaling. Chrome never permanently squeezes or shrinks the primary canvas.

---

## Visual Foundation & Tokens

### 1. Color Palette & Signals

- **Dark Base Stack**:
  - Base Stage: `#06090e` (`--color-bg-base`, `--color-surface-base`)
  - Sunken / Inputs: `#030508` (`--color-surface-sunken`)
  - Raised Surface: `#0b0f17` (`--color-bg-surface`, `--color-surface-raised`)
  - Elevated Chrome: `#121824` (`--color-bg-elevated`, `--color-surface-overlay`)
  - Overlay Glass: `#182030` (`--color-bg-overlay`)
- **Semantic Signal Colors**:
  - **Cyber Cyan** (`#00f0ff`): Selection border, active navigation item, highlighted tree nodes, focused states.
  - **Engine Green** (`#10b981`): Simulation running, play mode active, successful build/validation, positive metrics.
  - **Destructive Red** (`#ef4444`): Stop simulation, errors, delete/remove actions, validation failures.
  - **Engine Violet** (`#8b5cf6`): Component identities, prefab badges, script section headers, custom extensions.
  - **Canvas Gold** (`#ffb300`): Canvas gizmo selection highlight, primary entity marquee box.
- **Neutrals & Text Hierarchy**:
  - Primary Text: `rgba(245, 245, 247, 0.96)`
  - Secondary Text: `rgba(235, 235, 245, 0.60)`
  - Muted Text: `rgba(235, 235, 245, 0.40)`
  - Disabled Text: `rgba(235, 235, 245, 0.25)`

### 2. Geometry & Scale

- **Radii Scale**:
  - Small Controls (tags, tool buttons, badges): `6px` (`--radius-sm`)
  - Standard Inputs & Action Buttons: `8px` (`--radius-md`)
  - Large Controls & Dialog Buttons: `10px` (`--radius-lg`)
  - Cards & Content Blocks: `10px` / `14px` (`--radius-card-sm` / `--radius-card-lg`)
  - Floating Sheets & Main Overlays: `18px` (`--radius-sheet` / `--glass-radius`)
  - Status Dots & Explicit Segmented Pills: `999px` (`--radius-full`)
- **Control & Target Heights**:
  - Micro / Compact Scrubber: `24px` (`--height-control-xs`)
  - Standard Inspector Input / Tool Button: `28px` (`--height-control-sm`)
  - Regular Button / Dropdown Trigger: `32px` (`--height-control-md`)
  - Primary Action / Modal Button: `36px` (`--height-control-lg`)
  - Panel Headers & Toolbar Strips: `40px` (`--height-panel-header`)
  - Primary Navigation Target / Tab Bar Item: `44px` (`--height-nav-target` minimum touch target)

### 3. Glass & Shadows

- **Glass Surface**:
  - Fill: `rgba(22, 22, 24, 0.82)` / Deep: `rgba(16, 18, 22, 0.90)`
  - Filter: `blur(22px) saturate(1.4)`
  - Border Ring: `0 0 0 0.5px rgba(255, 255, 255, 0.08)`
  - Inset Highlight: `inset 0 0.5px 0 rgba(255, 255, 255, 0.10)`
  - Shadow: `0 10px 40px rgba(0, 0, 0, 0.48)`
- **Signal Glows**:
  - Cyan Glow: `0 0 12px rgba(0, 240, 255, 0.35)`
  - Green Glow: `0 0 12px rgba(16, 185, 129, 0.35)`
  - Red Glow: `0 0 12px rgba(239, 68, 68, 0.35)`

### 4. Typography

- **UI Font**: `IBM Plex Sans` (bundled locally in `@gamekit/ui`), weights 400, 500, 600, 700.
- **Data / Code Font**: `IBM Plex Mono` (bundled locally in `@gamekit/ui`), weights 400, 500, 600.
- **Type Roles**:
  - `--type-label`: 9px / 1.25 line-height / 0.08em tracking / uppercase / 600 weight
  - `--type-micro`: 10px / 1.30 line-height / 500 weight
  - `--type-ui`: 11px / 1.35 line-height / 500 weight
  - `--type-body`: 12px / 1.40 line-height / 400 weight
  - `--type-title`: 13px / 1.40 line-height / 600 weight
  - `--type-display`: 18px–22px / 1.20 line-height / 600 weight
  - `--type-mono`: IBM Plex Mono / tabular numbers / 10px–11px

### 5. Motion & Focus

- **Transitions**: Fast and functional (`120ms cubic-bezier(0.4, 0, 0.2, 1)` standard, `220ms` for drawer slide-in).
- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` by disabling nonessential slide animations and glows.
- **Focus Indicators**: 2px focus ring (`--color-border-focus: rgba(0, 240, 255, 0.40)`) with zero layout shift.

---

## Component System Rules

1. **All interactive controls must derive from `@gamekit/ui` primitives**. No raw `<button>`, `<input>`, `<select>`, or `<textarea>` in application code.
2. **Every icon-only button must have an accessible name, title, and tooltip**.
3. **No hardcoded arbitrary styling values**. All colors, heights, padding, and radii reference semantic design tokens.
4. **Offline determinism**. All fonts and assets render reliably in offline Tauri and CI test runners.
