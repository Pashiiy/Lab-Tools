# Benchy — Persistence, Sessions & the `.benchy` Project Format

Unified persistence for the Electron desktop app and the Vercel-hosted web build.
**No backend, no database, no authentication** — everything is stored locally.

---

## Goals

- Close / refresh / crash → reopen exactly where you left off (VS Code–like).
- No manual save required; workspace auto-saves continuously.
- One project format (`.benchy`) for **every** tool.
- Recent files and recent projects on the home screen.
- Export / import `.benchy` to move work between machines.

---

## Architecture

```
AppShell
  ├── useTabManager          tabs, active tab, restoreWorkspace()
  └── useWorkspaceSession    autosave, recovery, recents, export/import
          │
          ├── toolSnapshotRegistry   live getSnapshot() per mounted tab
          ├── useToolSnapshot        bridge inside each tool component
          ├── projectStore           save/load API (only import for UI)
          ├── labtoolsSchema         versioned .benchy container + legacy migration
          ├── recentStore            pure recent-files / recent-projects logic
          ├── trackRecentFile        file bytes → IndexedDB + recent list
          ├── sessionLifecycle       clean-exit vs crash detection
          └── storageBackend         platform KV + blobs
                  ├── idb.js              IndexedDB (web + Electron blobs)
                  ├── electron IPC store  benchy-store.json (KV)
                  └── in-memory           tests
```

### Platform storage

| Platform | JSON / metadata | Binary files (images, CSV, XLSX) |
|----------|-----------------|----------------------------------|
| **Web (Vercel)** | IndexedDB `kv` store | IndexedDB `blobs` store |
| **Electron** | `userData/benchy-store.json` via IPC | IndexedDB `blobs` in renderer |
| **Tests** | In-memory Map | In-memory Map |

---

## The `.benchy` format

Legacy `.labtools` / `labtools-project` files are imported and normalized to `.benchy` / `benchy-project` on open/save.

Single versioned container (`schemaVersion: 1`):

```jsonc
{
  "format": "benchy-project",
  "schemaVersion": 1,
  "metadata": { "id", "name", "appVersion", "createdAt", "lastModifiedAt" },
  "workspace": { "tabs": [{ "id", "toolId", "label" }], "activeTabId" },
  "tools": { "<tabId>": { "toolId", "stateVersion", "state": { /* tool-owned */ } } },
  "files": {},
  "settings": { "theme" },
  "session": { "savedAt", "reason" }
}
```

Measurements, ROIs, colonies, qPCR data, etc. live **inside** each tool's `state`.
New tools add data without changing the container schema.

### Legacy `.colonycount` migration

Old colony-counter JSON files are **detected on import** and wrapped into `.benchy`
automatically (`migrateLegacyColonyCounter`). The colony tool no longer saves
`.colonycount` — only `.benchy`. Shell **Import project** still accepts
`.colonycount` for one-time migration.

---

## Session restore

1. **Startup** — load `session:current` from storage.
2. **Clean exit** (refresh, tab close, Electron window close) — restore **silently**.
3. **Crash / force-quit** — show recovery banner; user chooses Recover or Start fresh.

Clean vs crash is detected via a `sessionStorage` flag set during `beforeunload`,
`visibilitychange`, and Electron `app-closing`.

---

## Auto-save

| Trigger | Reason tag |
|---------|------------|
| Tab / theme / view change (debounced 1.5s) | `change` |
| Tool state change via `notifyToolChange()` | `change` |
| Every 30 seconds | `interval` |
| `beforeunload` / tab hidden | `beforeunload` / `hidden` |
| Electron window close | `app-closing` |

Live workspace → `session:current`. Named saves → `project:<id>` + Recent Projects.

---

## Recent files

When a user opens a file in any tool:

1. File bytes stored in IndexedDB (`storeFileBlob`).
2. Metadata appended to `recent:files` (deduped, max 40).

Home screen **Recent files** reopens via `benchy:open-file` event → target tool.

Supported: TIFF, PNG, JPG, CSV, XLSX, EDS (subject to browser quota).

---

## Recent projects

**Continue working** on the home screen lists named `.benchy` projects (max 30).
Opening restores tabs, tool state, theme, and active tab.

Top bar: **Save project** (named) · **Export** (download `.benchy` file).

---

## Tool integration

Each tool:

1. Registers `useToolSnapshot(instanceId, toolId, getSnapshot)`.
2. Hydrates once from `initialState` prop (from `restoreWorkspace`).
3. Optionally calls `trackRecentFile(file, toolId)` on import.
4. Optionally listens via `useOpenFileListener(toolId, handler)`.

| Tool | Snapshot hook | Recent file tracking |
|------|---------------|---------------------|
| Colony Counter | ✓ | ✓ images |
| Gel Quantification | ✓ | ✓ images |
| qPCR Analysis | ✓ | ✓ EDS/XLSX |
| Endpoint Analysis | ✓ | ✓ gel images |

Per-tool `localStorage` autosave (colony, endpoint) was **removed** — workspace
autosave is the single source of truth.

---

## Export / import

- **Export** — Top bar → Export → `ProjectName.benchy` (JSON download).
- **Import** — Home → Import project, or Top bar flow via shell.
- Accepts `.benchy`, legacy `.colonycount`, and `.json` colony sessions.

---

## Tests

```bash
npm run test:persistence   # schema, migration, recents, projectStore, lifecycle
npm run test:gel           # gel Fiji parity
npm test                   # both
```

---

## Limitations

- **Web**: cannot restore OS file paths after refresh — files must live in IndexedDB.
- **Quota**: very large TIFFs may exceed browser storage limits; export `.benchy`
  for portable backup.
- **Images in tool state**: colony/endpoint/gel still embed pixel data in JSON
  snapshots (base64 / typed arrays). The `files{}` blob-reference layer exists for
  recent-file reopen; full migration of inline images to blob refs is future work
  (Phase 3 remaining). Colony full-res PNG encoding is cached per canvas to avoid
  re-encoding on every autosave collect. Recent-file blob orphans are deleted on
  dedupe / remove / clear.

---

## Key files

| Path | Role |
|------|------|
| `src/shell/useWorkspaceSession.js` | Autosave orchestrator |
| `src/shell/useTabManager.js` | Tab CRUD + restore |
| `src/shared/persistence/labtoolsSchema.js` | Format + migration |
| `src/shared/persistence/projectStore.js` | Save/load API |
| `src/shared/persistence/storageBackend.js` | Platform backend |
| `src/shared/persistence/trackRecentFile.js` | Recent file + blob store |
| `src/shared/persistence/useToolSnapshot.js` | Tool ↔ workspace bridge |
| `electron/main.cjs` | Electron store + dialogs + close handler |
