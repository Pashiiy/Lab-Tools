# Benchy — Development Guide

## Prerequisites

- **Node.js** `>=22.9.0`
- **npm** `>=11` (repo pins `packageManager: npm@11.6.2`)
- macOS or Windows for Electron packaging; web/PWA works on any OS with Node

- **Python** `>=3.10` (optional — only for Colony Auto Count on desktop)

## Setup

```bash
cd "Lab Tools"
npm install
```

### Colony Auto Count (desktop)

```bash
cd backend/colony_counter
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Electron starts this service automatically. Standalone: `npm run colony-api` then `curl` as in `backend/colony_counter/README.md`.

No `.env` file is required for normal development. Theme preference is stored in `localStorage` (`lab-tools-theme`).

## Run

| Command | What it does |
|---------|----------------|
| `npm run dev` | Vite web/dev server (default `http://localhost:5173`) |
| `npm run electron:dev` | Vite + Electron together |
| `npm run colony-api` | Standalone FastAPI colony Auto Count on `:8765` |
| `npm run preview` | Preview production `dist/` |

## Build

| Command | What it does |
|---------|----------------|
| `npm run build` | Vite production build → `dist/` (also used by Vercel) |
| `npm run dist` / `dist:mac` / `dist:win` / `dist:all` | electron-builder packaging |
| `npm run electron:build:mac` / `:win` / `:all` | build + package |
| `npm run generate-icons` | Icon assets for packaging |
| `npm run verify:mac` | Post-build mac signature check |

## Test

| Command | Coverage |
|---------|----------|
| `npm run test:gel` | Fiji/Excel gel formula parity |
| `npm run test:persistence` | `.benchy` schema, migration, stores, lifecycle |
| `npm test` | Both of the above |

After changing gel measurement math, **always** run `npm run test:gel`. After persistence/schema changes, run `npm run test:persistence`.

## Lint & lockfile

```bash
npm run lint
npm run validate:lock   # husky pre-commit also runs this
npm run sync            # sync deps / lockfile helpers
```

## Debugging

- **Web:** browser DevTools on the Vite URL.
- **Electron:** DevTools on the BrowserWindow; main-process logs in the terminal running `electron:dev`.
- **Persistence:** inspect IndexedDB (`kv` / `blobs`) in the browser; Electron KV lives in `userData/benchy-store.json`.
- **Session recovery:** force-quit without clean close to exercise crash recovery banner (`sessionLifecycle.js`).

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `NODE_ENV` | Electron main | Dev vs packaged behavior |
| `HUSKY` | CI | Set `0` to skip hooks in CI |
| `CSC_IDENTITY_AUTO_DISCOVERY` | mac builds | Often `false` for ad-hoc signing |

No `VITE_*` secrets are required.

## Release (Electron)

1. `npm run release` bumps version and creates a git tag.
2. Tag push triggers `.github/workflows/release.yml` → mac DMG + Windows NSIS on GitHub Releases.
3. Do not ship installers from the regular CI lint/build workflow.

## Web deploy (Vercel)

- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite static SPA (`base: './'` in `vite.config.js`)
- Persistence on web is IndexedDB only — see [PERSISTENCE.md](./PERSISTENCE.md)

Keep the Vercel project linked; web deployment remains a first-class target alongside Electron.

## Adding a tool (checklist)

1. Create `src/apps/<tool>/` with `*App.jsx` + hooks/utils.
2. Register in `toolRegistry.js`, `sidebarNav.js`, `toolManifest.js`.
3. Use `ToolHeader` / `LtTabs` / `ToolActionBar` and `--lt-*` tokens.
4. Wire `useToolSnapshot(instanceId, toolId, getSnapshot)`.
5. Add help content under `src/help/content/` if needed.
6. Update docs (`project-overview`, `architecture`, `roadmap`) when the tool ships.
