# Colony Auto Count (Python)

Classical OpenCV colony detection for Benchy. Runs as a local FastAPI service, spawned by Electron.

**Bias:** under-count rather than over-count. A user **mask is required** — nothing outside the mask is analyzed.

## Packaged app (end users)

Release installers ship a **frozen** `colony_counter_service` binary (PyInstaller). No Python, venv, or `pip install` is required on the user’s machine. Electron spawns that binary when `app.isPackaged` is true.

## Dev setup (source + venv)

From the Benchy repo root (recommended — works on macOS, Linux, and Windows):

```bash
npm run setup:colony
```

Manual:

```bash
cd backend/colony_counter
python3 -m venv .venv          # Windows: python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
# Windows without activate: .venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Freeze for packaging

Produces `dist-bin/{mac|win|linux}-{arch}/colony_counter_service…` for electron-builder `extraResources`:

```bash
npm run build:colony-backend              # host OS + arch
npm run build:colony-backend:all-mac      # arm64 + x64 on macOS
npm run build:colony-backend -- --mode onefile
npm run build:colony-backend -- --time-compare   # measure onedir vs onefile cold start
```

## Standalone (debug)

```bash
npm run colony-api
# or: .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8765
# Windows: .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8765
```

Health: `GET http://127.0.0.1:8765/health`

## Count colonies (mask required)

```bash
curl -s -X POST http://127.0.0.1:8765/api/count-colonies \
  -F "image=@/path/to/plate.png" \
  -F 'mask={"type":"ellipse","cx":400,"cy":400,"rx":350,"ry":350}' \
  | python3 -m json.tool
```

Mask shapes:
- Ellipse: `{"type":"ellipse","cx":…,"cy":…,"rx":…,"ry":…}`
- Polygon: `{"type":"polygon","points":[{"x":…,"y":…},…]}`

Response includes `count`, `countByType` (`yeast` / `contaminant` / `uncertain`), and `colonies[]` with `colonyType`, `confidence`, etc.

Optional dish suggestion (never applied silently):

```bash
curl -s -X POST http://127.0.0.1:8765/api/suggest-dish \
  -F "image=@/path/to/plate.png" | python3 -m json.tool
```

## Pipeline

1. Robust **scale estimate** (MAD-trimmed) from clean isolated colonies; multi-scale tiles with neighbor fallback  
2. Apply user mask (+ inward erosion) → crop to bbox  
3. Flatten illumination; bilateral denoise; mask large specular glare only  
4. **Threshold-stability sweep** — keep only regions that stay colony-like across many thresholds  
5. Touching mergers: multi-signal **candidate matching** (watershed peaks + LoG + contour concavity); drop ambiguous regions rather than estimate  
6. Density-adaptive confidence filter + yeast/contaminant HSV classification  

Response: `count`, `individuallyDetected`, `countByType`, `colonies[]`. `clusters[]` / `estimatedFromClusters` are always empty (fused-cluster fallback removed).

## Packaging notes

Release installers include the frozen `colony_counter_service` binary only (no `.venv`, no `requirements.txt` on the end-user machine). Rebuild with `npm run build:colony-backend` before `dist:mac` / `dist:win`.

**Signing / Gatekeeper:** current CI uses ad-hoc Mac signing (`identity: "-"`, `notarize: false`). For public distribution, sign the outer `.app` **and** the nested sidecar with a Developer ID (see `scripts/after-pack-sign-colony.cjs` + `build/entitlements.mac.plist` network entitlements), then notarize the whole app so Gatekeeper accepts the nested binary. Windows: sign the NSIS installer (and ideally the sidecar `.exe`) with the same cert used for the app when `CSC_*` secrets are configured.

**Updates:** there is no electron-updater — users install a new GitHub Release DMG/EXE, which replaces `Resources/colony_counter/` along with the rest of the app.

## Accuracy harness

```bash
npm run test:colony-accuracy
# or: cd backend/colony_counter && .venv/bin/python -m tests.accuracy_harness
# Windows: .venv\Scripts\python.exe -m tests.accuracy_harness
```

Add manually counted plates under `tests/fixtures/<name>/` (see `tests/fixtures/README.md`). Without real GT, synthetic smoke cases are generated under `_synthetic/`.

## Debug stages

`POST /api/count-colonies?debug=true` returns the normal payload plus `stages[]` (downscaled PNG base64). In the desktop app: **Show Processing Stages** after a mask is drawn.
