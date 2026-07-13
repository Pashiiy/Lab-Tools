# Benchy — Architecture

## High-level model

Benchy is a **client-only** Vite + React SPA with an optional Electron shell. There is no HTTP API, no auth, and no server database.

```
┌─────────────────────────────────────────────────────────────┐
│ Electron main (electron/main.cjs)                           │
│  - BrowserWindow, benchy-store.json KV, file dialogs      │
│  - preload → window.electronAPI / window.isElectron         │
└──────────────────────────┬──────────────────────────────────┘
                           │ loads Vite dist or localhost:5173
┌──────────────────────────▼──────────────────────────────────┐
│ Renderer (React SPA)                                        │
│  main.jsx → App.jsx → AppShell                              │
│    ├── useTabManager (multi-tool tabs)                      │
│    ├── useWorkspaceSession (autosave / .benchy)           │
│    ├── TOOLS[toolId].component (per-tab tool)               │
│    └── shared: theme, image, persistence, help, calculators │
└─────────────────────────────────────────────────────────────┘
         Web (Vercel): same renderer, IndexedDB-only storage
```

## Frontend / “backend” separation

| Layer | Role |
|-------|------|
| **Renderer (React)** | All UI, parsing, analysis math, Excel/CSV/PDF export |
| **Electron main** | Window lifecycle, native save/open dialogs, JSON KV store on disk |
| **Web (Vercel)** | Static `dist/` + PWA service worker; storage is IndexedDB only |

There is no Express/Next/API layer. Do not introduce a backend unless product direction changes and is documented in `design-decisions.md`.

## Major components

| Area | Path | Responsibility |
|------|------|----------------|
| Shell | `src/shell/` | Home, sidebar, top bar, tabs, workspace session, tool registry |
| Tool registry | `toolRegistry.js` | Maps tool IDs → React components |
| Tool manifest | `toolManifest.js` | Launcher metadata (tags, hints, accents) |
| Sidebar nav | `sidebarNav.js` | Ordered tool list in the shell |
| Persistence | `src/shared/persistence/` | `.benchy` schema, stores, IndexedDB, snapshots |
| Image pipeline | `src/shared/image/` | TIFF decode, Fiji grayscale, ROI helpers |
| Shared UI | `src/shared/ui/` | `ToolHeader`, `LtTabs`, `ToolActionBar` |
| Help | `src/help/` | Per-tool help JSON + onboarding |
| Electron | `electron/main.cjs`, `preload.cjs` | IPC bridge |

### Active tools

| Tool ID | Implementation folder |
|---------|----------------------|
| `qpcr-analyzer` | `src/apps/qpcr-insight/` |
| `gel-quantification` | `src/apps/gel-quantification/` |
| `endpoint-analysis` | `src/apps/endpoint-analysis/` |
| `colony-counter` | `src/apps/colony-counter/` |

**Naming trap:** the tool id is `qpcr-analyzer`, but the live code is **`qpcr-insight`**. Do not recreate `src/apps/qpcr-analyzer/`.

## Data flow

1. User opens a tool → tab created → tool mounts with optional `initialState` from restored workspace.
2. User imports a file (TIFF / EDS / XLSX) → in-browser parse → optional `trackRecentFile` → IndexedDB blob.
3. Tool state changes → `notifyToolChange` → debounced autosave → `session:current` in platform store.
4. Named save / Export → `.benchy` JSON (Electron dialog or browser download).
5. Tool-level Excel/CSV/PDF → local download only.

See [PERSISTENCE.md](./PERSISTENCE.md) for autosave timing, recovery, and tool integration.

## Design patterns

- **Tool plugin pattern:** register in `toolRegistry.js` + `sidebarNav.js` + `toolManifest.js`; wire `useToolSnapshot`; use shared UI primitives.
- **Snapshot bridge:** tools expose `getSnapshot()`; shell owns persistence — tools never write their own file formats.
- **Platform storage backend:** `storageBackend` switches Electron KV vs IndexedDB vs in-memory (tests).
- **Fiji compatibility mode:** gel math routes through `fijiExcelWorkflow.js` as the single source of truth.

## Electron IPC contract

Exposed via `window.electronAPI` (`electron/preload.cjs`):

| Channel / API | Purpose |
|---------------|---------|
| `store:get` / `set` / `delete` / `keys` | KV persistence → `userData/benchy-store.json` |
| `project:save` | Native save dialog for `.benchy` |
| `project:open` | Native open dialog |
| `app-closing` / `close-confirmed` / `close-cancelled` | Clean-exit handshake for autosave |

Security: `contextIsolation: true`, `nodeIntegration: false`.

## Important constraints

- Dual target: Electron + Vercel web — keep storage platform-aware.
- Protect scientific formulas (gel, ΔΔCt, endpoint categories, CFU) — see [database-schema.md](./database-schema.md).
- UI must follow [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (`--lt-*` tokens, shared components).
- npm 11 lockfile; Node `>=22.9.0`.
