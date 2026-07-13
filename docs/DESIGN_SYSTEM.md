# Benchy — Design System & UI Architecture

This document captures the Phase 1 audit, proposed architecture, and implementation reference for the unified Lab Tools platform. The homepage (`src/shell/home.css`) is the visual north star — professional laboratory software, not a marketing site.

---

## Phase 1 — Audit Summary

### Layout inconsistencies (before)

| Area | Issue |
|------|-------|
| Application shell | Tools rendered full-viewport without persistent sidebar in some flows |
| qPCR Insight | Internal 220px left nav duplicated shell sidebar pattern |
| Sidebar widths | 200–300px varied per tool (`shell-sidebar`, `qi-sidebar`, colony sidebar) |
| Tool headers | Custom `.header`, `.qi-header`, `.fg-header`, `.gq-*` — different heights and padding |
| Export placement | Shell top bar, tool sidebars, tool headers, chart footers — no single convention |

### Navigation inconsistencies

- Settings lived in sidebar on older builds; should be global top-right only
- qPCR used vertical sidebar tabs while other tools used horizontal tabs
- No persistent access to recent projects/files while inside a tool (fixed in shell sidebar)

### Component duplication

- **Buttons:** `lt-btn`, `btn`, `gq-btn`, `qi-header__*`, `header__export`, `shell-topbar__project-btn`
- **Tabs:** `shell-tabs`, `lt-tabs`, `tabs`, `qi-sidebar__item`, qPCR-analyzer internal tabs
- **Headers:** 5+ bespoke implementations across tools

### Typography & spacing

- Token system existed in `theme.css` (`--lt-*`) but tools often hard-coded sizes
- Tab bars used 14px–16px mixed sizing; headers ranged 40–56px effective height
- Excess vertical padding in qPCR content area (20px) vs gel workspace (dense)

### Missing styles

- `home__continue*` project rows referenced in JSX but unstyled
- `session-recovery*` prompt had no CSS

---

## Proposed Design System

### Token layers (`src/shared/theme.css`)

| Category | Tokens |
|----------|--------|
| Color | `--lt-bg`, `--lt-panel`, `--lt-border`, `--lt-accent`, `--lt-text-*` (unchanged palette) |
| Spacing | `--lt-space-1` … `--lt-space-6`, `--lt-sidebar-width` (232px) |
| Radius | `--lt-radius-sm`, `--lt-radius-md` |
| Motion | `--lt-duration-fast` (120ms), `--lt-duration-normal` (180ms), `--lt-ease-out` |
| Layout | `--lt-tool-header-height` (40px) |

### Shared components (`src/shared/ui/`)

| Component | Purpose |
|-----------|---------|
| `ToolHeader` | 40px title bar — title, optional subtitle/badge, right actions |
| `LtTabs` | Horizontal view tabs — underline indicator, disabled + tooltip support |
| `ToolActionBar` | Tool-level Save/Export/Import row — always below tabs |
| `lt-btn` | Primary/secondary/danger buttons |
| `lt-input` | Form inputs |

### Shell layout (`src/shell/`)

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (232px) │ TopBar — session tabs · search · project  │
│                 │ actions · Settings · utilities · theme    │
│ TOOLS           ├───────────────────────────────────────────┤
│ RECENT PROJECTS │ ToolHeader                                │
│ RECENT FILES    │ LtTabs                                    │
│                 │ ToolActionBar (exports)                   │
│                 │ Workspace (maximized analysis area)       │
└─────────────────┴───────────────────────────────────────────┘
```

**Workspace-level actions** (Save / Import / Export `.benchy`) → shell `TopBar` top-right  
**Tool-level actions** (Excel, CSV, images, PDF) → `ToolActionBar` below tabs in every tool

**Global controls** → Settings + theme toggle + notepad/strain utilities in top-right

---

## Tool migration status

| Tool | ToolHeader | LtTabs | ToolActionBar | Notes |
|------|------------|--------|---------------|-------|
| Gel Quantification | ✓ | ✓ | ✓ (always; exports disabled until pairs) | Uses `lt-btn`; Fiji mode colors via `gq-mode--*` |
| Colony Counter | ✓ | — | ✓ (always; actions disabled until image) | Uses `lt-btn`; scoped under `.colony-counter` |
| Endpoint Analyzer | ✓ | ✓ | ✓ | Excel + CSV in action bar |
| qPCR Insight | ✓ (incl. upload) | ✓ | ✓ | Shared `FileDropZone`; tool id `qpcr-analyzer` |

---

## Interaction & motion guidelines

- Hover transitions: 120ms ease on buttons, sidebar items, tabs
- Page enter: `shell-page-in` 180–220ms opacity fade (no bounce)
- Save reminder pulse: subtle box-shadow animation (colony counter)
- Respect `prefers-reduced-motion: reduce`

---

## Information density rules

1. Tool header fixed at 40px — no multi-line marketing subtitles in workspace
2. Tab bar single row, 32px height — scroll horizontally if needed
3. Action bar single row — hint text left, buttons right
4. Sidebars for tool configuration only — not navigation or global project actions
5. Primary data (gels, charts, images) gets remaining flex space

---

## Figma component hierarchy (for external design)

```
Benchy Platform
├── Shell
│   ├── Sidebar (Tools, Recent Projects, Recent Files)
│   ├── TopBar (SessionTabs, Search, ProjectActions, GlobalControls)
│   └── ContentArea
├── Primitives
│   ├── Button (default, primary, danger)
│   ├── Input, Select, Checkbox
│   ├── Tab (default, active, disabled)
│   └── Badge
├── Patterns
│   ├── ToolHeader
│   ├── LtTabs
│   ├── ToolActionBar
│   ├── SettingsPanel (drawer)
│   └── SessionRecoveryBanner
└── Tokens
    ├── Color (light/dark — do not rebrand)
    ├── Typography (Inter body, DM Mono data)
    ├── Spacing (4px base grid)
    └── Motion (120ms / 180ms)
```

Map Figma components to CSS classes: `lt-btn`, `lt-tabs__*`, `lt-tool-header`, `lt-action-bar`, `shell-sidebar__*`, `shell-topbar__*`.

---

## Adding a new tool

1. Wrap in `.app` flex column container inside shell tab panel
2. Use `ToolHeader` + `LtTabs` (if multi-view) + `ToolActionBar`
3. Use `lt-btn` / `lt-input` — never introduce new button classes
4. Register in `sidebarNav.js` and `toolRegistry.js`
5. Wire `useToolSnapshot` for `.benchy` persistence
6. Scope tool CSS under a root class (e.g. `.my-tool { ... }`) — avoid global `.btn` leaks

---

## Success criteria checklist

- [x] Persistent shell sidebar with tools + recents while working
- [x] Settings in top-right global controls
- [x] Workspace Save/Import/Export in top bar
- [x] Tool exports in consistent `ToolActionBar` location
- [x] Unified horizontal tabs via `LtTabs`
- [x] Homepage continue-working / recent files styled
- [x] Session recovery banner styled
- [x] Legacy qPCR Analyzer folder removed (Insight is the sole qPCR app)
- [x] Tool interiors migrated to `lt-btn` / always-visible `ToolActionBar` / shared `FileDropZone`
- [ ] Scope remaining global CSS leaks in tool stylesheets (mostly residual density tokens)
