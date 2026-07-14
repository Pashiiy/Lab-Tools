"""
Benchy Colony Auto Count — local FastAPI service (classical OpenCV).

POST /api/count-colonies  multipart: image + mask (JSON), optional debug=true query
POST /api/suggest-dish    multipart: image
GET  /health
"""
from __future__ import annotations

import json

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from image_processing import count_colonies
from image_processing.masking import suggest_dish_ellipse

app = FastAPI(title="Benchy Colony Counter", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "colony-counter", "version": "2.1"}


@app.post("/api/suggest-dish")
async def api_suggest_dish(image: UploadFile = File(...)):
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload")
    try:
        suggestion = suggest_dish_ellipse(data)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Dish detect failed: {exc}") from exc
    return {"suggestion": suggestion}


@app.post("/api/count-colonies")
async def api_count_colonies(
    image: UploadFile = File(...),
    mask: str = Form(...),
    debug: bool = Query(False, description="Include pipeline stage images"),
):
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload")

    try:
        mask_spec = json.loads(mask)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="mask must be valid JSON") from exc

    if not isinstance(mask_spec, dict) or not mask_spec.get("type"):
        raise HTTPException(status_code=400, detail="mask.type is required")

    try:
        result = count_colonies(data, mask_spec, debug=bool(debug))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}") from exc

    return result
