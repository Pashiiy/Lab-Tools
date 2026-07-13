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

1. Apply user mask (+ inward erosion) → crop to bbox  
2. Flatten illumination; mask specular glare (HSV)  
3. Adaptive threshold + morphology  
4. Conservative watershed + merge-back pass  
5. Filter by area / circularity / solidity / rim / glare  
6. Classify yeast vs red/pink contaminant (per-image saturation calibration)  
7. Confidence threshold (drop low-confidence blobs)

Python runtime is **not** bundled in the installer for MVP; install the venv on the machine running Benchy desktop.
