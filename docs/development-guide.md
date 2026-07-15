# Benchy — Development Guide

## Prerequisites

- **Node.js** `>=22.9.0`
- **npm** `>=11` (repo pins `packageManager: npm@11.6.2`)
- macOS or Windows for Electron packaging; web/PWA works on any OS with Node

- **Python** `>=3.10` (dev only — packaged apps ship a frozen Colony Auto Count binary)

## Setup

```bash
cd "Lab Tools"
npm install
```

### Colony Auto Count (desktop)

**End users / packaged app:** no Python setup. Installers include `colony_counter_service`.

**Local development** — creates `.venv` with the correct `bin/` (macOS/Linux) or `Scripts/` (Windows) layout:

```bash
npm run setup:colony
```

Manual equivalent:

```bash
# macOS / Linux
cd backend/colony_counter
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt

# Windows (PowerShell / cmd)
cd backend\colony_counter
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Electron in **dev** starts the service from the venv (and checks that `uvicorn` is importable before spawn). In the **packaged** app it spawns the frozen binary. Standalone: `npm run colony-api` then `curl` as in `backend/colony_counter/README.md`.

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
| `npm run build:colony-backend` | Freeze Colony Auto Count with PyInstaller → `backend/colony_counter/dist-bin/` |
| `npm run dist` / `dist:mac` / `dist:win` / `dist:all` | Freeze sidecar (when needed) + electron-builder (`dist:mac` builds arm64 + x64 DMGs) |
| `npm run electron:build:mac` / `:win` / `:all` | build + package |
| `npm run generate-icons` | Icon assets for packaging |
| `npm run verify:mac` | Post-build mac signature check (all `Benchy.app` under `release/`) |
| `npm run verify:win` | Post-build Windows installer presence check |

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
2. Tag push triggers `.github/workflows/release.yml` → freezes Colony Auto Count (PyInstaller) → mac DMG (arm64 + x64) + Windows NSIS on GitHub Releases.
3. Do not ship installers from the regular CI lint/build workflow.

## Signing & notarization (macOS)

The colony sidecar is a PyInstaller onedir bundle with `Python.framework`. electron-builder’s outer sign fails if that framework’s symlinks were flattened to absolute paths (Node `cpSync` does this). The pipeline:

1. `build:colony-backend` copies with `cp -a` / `rsync -a` (relative symlinks preserved).
2. `afterPack` (`scripts/after-pack-sign-colony.cjs`) restores the framework layout and codesigns **bottom-up** (dylibs → `Python.framework` → `colony_counter_service`) using the same identity as the app (`mac.identity`, or `CSC_NAME` / `CSC_IDENTITY`).

Current CI still uses **ad-hoc** signing (`identity: "-"`, `notarize: false`). Gatekeeper (`spctl`) will reject until you:

1. Set a real Developer ID (`CSC_NAME` / `CSC_LINK` / keychain identity) and set `mac.identity` accordingly.
2. Set `hardenedRuntime: true` and keep `build/entitlements.mac.plist` (already includes network client/server for the local sidecar).
3. Enable notarization (`notarize: true` with Apple ID / API key env vars, or `xcrun notarytool submit` on the DMG).
4. Confirm the notarization log has no warnings for `colony_counter_service` / `Python.framework`.

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
