"""Load image, flatten illumination, detect glare, denoise."""
from __future__ import annotations

import cv2
import numpy as np


def decode_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Could not decode image")
    return bgr


def preprocess(image_bytes: bytes) -> dict:
    bgr = decode_bgr(image_bytes)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    gray_raw = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # Specular glare: bright + unsaturated, but ONLY large blobs
    # (small bright blobs are likely white yeast colonies — do not exclude them)
    _h, s, v = cv2.split(hsv)
    cand = ((v >= 250) & (s <= 18)).astype(np.uint8) * 255
    glare = np.zeros_like(cand)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(cand, connectivity=8)
    min_glare_area = max(400, int(gray_raw.size * 0.0015))
    for i in range(1, n):
        if int(stats[i, cv2.CC_STAT_AREA]) >= min_glare_area:
            glare[labels == i] = 255
    glare = cv2.dilate(glare, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)), iterations=1)

    # Illumination flattening via subtraction (preserves bright colony peaks better than divide)
    k = max(31, (min(gray_raw.shape) // 12) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    background = cv2.morphologyEx(gray_raw, cv2.MORPH_OPEN, kernel)
    flat = gray_raw.astype(np.float32) - background.astype(np.float32) + 128.0
    flat = np.clip(flat, 0, 255).astype(np.uint8)

    # Slightly stronger bilateral — reduces media-texture false positives on sparse plates
    den = cv2.bilateralFilter(flat, d=7, sigmaColor=45, sigmaSpace=45)
    # Keep a lightly denoised raw gray for tophat (colony peaks survive better)
    raw_den = cv2.bilateralFilter(gray_raw, d=7, sigmaColor=40, sigmaSpace=40)

    return {
        "bgr": bgr,
        "gray": den,
        "gray_raw": raw_den,
        "hsv": hsv,
        "glare_mask": glare,
    }
