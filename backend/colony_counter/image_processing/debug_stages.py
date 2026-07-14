"""Encode pipeline debug stage images (downscaled JPEG) for the stage viewer."""
from __future__ import annotations

import base64
from typing import Any

import cv2
import numpy as np

DEBUG_MAX_EDGE = 800
JPEG_QUALITY = 72


def _downscale(img: np.ndarray, max_edge: int = DEBUG_MAX_EDGE) -> np.ndarray:
    h, w = img.shape[:2]
    m = max(h, w)
    if m <= max_edge:
        return img
    scale = max_edge / m
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _to_bgr(img: np.ndarray) -> np.ndarray:
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img


def encode_stage(name: str, label: str, img: np.ndarray, note: str = "") -> dict[str, Any]:
    """Serialize only when called — keep out of non-debug response path."""
    bgr = _to_bgr(img)
    bgr = _downscale(bgr)
    ok, buf = cv2.imencode(".jpg", bgr, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        raise ValueError(f"Failed to encode stage {name}")
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    entry = {
        "name": name,
        "label": label,
        "imageBase64": b64,
        "mimeType": "image/jpeg",
    }
    if note:
        entry["note"] = note
    return entry


def colorize_labels(labels: np.ndarray) -> np.ndarray:
    out = np.zeros((*labels.shape, 3), dtype=np.uint8)
    ids = [i for i in np.unique(labels) if i > 0]
    rng = np.random.default_rng(42)
    for i in ids:
        color = rng.integers(40, 255, size=3, dtype=np.int32)
        out[labels == i] = color
    return out


def overlay_points(base_bgr: np.ndarray, points: list[tuple[int, int]], color=(0, 255, 255)) -> np.ndarray:
    img = base_bgr.copy()
    for y, x in points:
        cv2.drawMarker(img, (int(x), int(y)), color, markerType=cv2.MARKER_CROSS, markerSize=10, thickness=1)
    return img


def normalize_heatmap(dist: np.ndarray) -> np.ndarray:
    d = dist.copy()
    if d.max() > 0:
        d = (d / d.max() * 255).astype(np.uint8)
    else:
        d = d.astype(np.uint8)
    return cv2.applyColorMap(d, cv2.COLORMAP_VIRIDIS)
