"""Build and erode user masks; crop helpers."""
from __future__ import annotations

import cv2
import numpy as np


def build_mask_from_spec(spec: dict, shape_hw: tuple[int, int]) -> np.ndarray | None:
    h, w = shape_hw
    mask = np.zeros((h, w), dtype=np.uint8)
    kind = (spec.get("type") or "").lower()

    if kind == "ellipse":
        cx = float(spec["cx"])
        cy = float(spec["cy"])
        rx = max(1.0, float(spec["rx"]))
        ry = max(1.0, float(spec["ry"]))
        cv2.ellipse(
            mask,
            (int(round(cx)), int(round(cy))),
            (int(round(rx)), int(round(ry))),
            0,
            0,
            360,
            255,
            -1,
        )
    elif kind == "polygon":
        pts = spec.get("points") or []
        if len(pts) < 3:
            return None
        arr = np.array([[int(round(p["x"])), int(round(p["y"]))] for p in pts], dtype=np.int32)
        cv2.fillPoly(mask, [arr], 255)
    else:
        raise ValueError(f"Unsupported mask type: {kind!r}")

    # Negative margin so rim colonies aren't split by the boundary
    erode_px = max(2, int(round(min(h, w) * 0.004)))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erode_px * 2 + 1, erode_px * 2 + 1))
    mask = cv2.erode(mask, kernel, iterations=1)
    return mask


def apply_mask(prep: dict, full_mask: np.ndarray) -> dict:
    """Crop to mask bbox and zero everything outside the (eroded) mask."""
    bgr = prep["bgr"]
    gray = prep["gray"]
    hsv = prep["hsv"]
    glare = prep["glare_mask"]

    ys, xs = np.where(full_mask > 0)
    if len(xs) == 0:
        raise ValueError("Mask is empty after erosion")

    pad = 4
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(bgr.shape[1], int(xs.max()) + 1 + pad)
    y1 = min(bgr.shape[0], int(ys.max()) + 1 + pad)

    work_mask = full_mask[y0:y1, x0:x1].copy()
    crop_bgr = bgr[y0:y1, x0:x1].copy()
    crop_gray = gray[y0:y1, x0:x1].copy()
    crop_hsv = hsv[y0:y1, x0:x1].copy()
    crop_glare = glare[y0:y1, x0:x1].copy()
    gray_raw = prep.get("gray_raw", gray)
    crop_raw = gray_raw[y0:y1, x0:x1].copy()

    # Never analyze outside mask
    crop_bgr[work_mask == 0] = 0
    crop_gray[work_mask == 0] = 0
    crop_raw[work_mask == 0] = 0
    crop_glare[work_mask == 0] = 0

    return {
        "bgr": crop_bgr,
        "gray": crop_gray,
        "gray_raw": crop_raw,
        "hsv": crop_hsv,
        "glare_mask": crop_glare,
        "work_mask": work_mask,
        "x0": x0,
        "y0": y0,
    }


def suggest_dish_ellipse(image_bytes: bytes) -> dict | None:
    """Hough circle suggestion for UI — never applied silently."""
    from .preprocessing import decode_bgr

    bgr = decode_bgr(image_bytes)
    h, w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (9, 9), 0)
    scale = 1.0
    work = gray
    if max(h, w) > 1200:
        scale = 1200 / max(h, w)
        work = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    circles = cv2.HoughCircles(
        work,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=max(work.shape) // 2,
        param1=100,
        param2=40,
        minRadius=int(min(work.shape) * 0.15),
        maxRadius=int(min(work.shape) * 0.55),
    )
    if circles is None:
        return None
    c = circles[0][0]
    cx, cy, r = float(c[0]) / scale, float(c[1]) / scale, float(c[2]) / scale
    return {"type": "ellipse", "cx": cx, "cy": cy, "rx": r, "ry": r}
