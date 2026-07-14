# Colony Auto Count (Python)

Classical OpenCV colony detection for Benchy. Runs as a local FastAPI service, spawned by Electron.

**Bias:** under-count rather than over-count. A user **mask is required** — nothing outside the mask is analyzed.

## Setup

```bash
cd backend/colony_counter
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Standalone (debug)

```bash
uvicorn main:app --host 127.0.0.1 --port 8765
# or: npm run colony-api
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

Python runtime is **not** bundled in the installer for MVP; install the venv on the machine running Benchy desktop.

## Accuracy harness

```bash
cd backend/colony_counter
.venv/bin/python -m tests.accuracy_harness
# or from repo root: npm run test:colony-accuracy
```

Add manually counted plates under `tests/fixtures/<name>/` (see `tests/fixtures/README.md`). Without real GT, synthetic smoke cases are generated under `_synthetic/`.

## Debug stages

`POST /api/count-colonies?debug=true` returns the normal payload plus `stages[]` (downscaled PNG base64). In the desktop app: **Show Processing Stages** after a mask is drawn.
