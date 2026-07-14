"""Tophat segmentation with scale-adaptive kernels + bright-fill for fused masses."""
from __future__ import annotations

import cv2
import numpy as np


def segment_colonies(
    gray: np.ndarray,
    glare_mask: np.ndarray,
    work_mask: np.ndarray,
    gray_raw: np.ndarray | None = None,
    params: dict | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Returns (tophat_binary, bright_fill_mask).
    bright_fill_mask captures large filled bright regions that tophat misses.
    """
    src = gray_raw if gray_raw is not None else gray
    p = params or {}
    k = int(p.get("tophat_k") or max(21, (min(src.shape) // 18) | 1))
    if k % 2 == 0:
        k += 1
    morph = int(p.get("morph_k") or 3)
    if morph % 2 == 0:
        morph += 1
    min_area = float(p.get("min_area") or max(18, np.count_nonzero(work_mask) * 5e-5))
    est_area = float(p.get("estimated_area") or min_area)
    cluster_min = float(p.get("cluster_area_min") or est_area * 8.0)
    max_area_keep = max(cluster_min * 50.0, float(np.count_nonzero(work_mask) * 0.15))

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    tophat = cv2.morphologyEx(src, cv2.MORPH_TOPHAT, kernel)

    masked_vals = tophat[(work_mask > 0) & (glare_mask == 0)]
    if masked_vals.size == 0:
        z = np.zeros_like(src, dtype=np.uint8)
        return z, z

    thr = float(np.percentile(masked_vals, 90.0))
    thr = max(thr, float(np.median(masked_vals) + 8.0), 8.0)
    binary = ((tophat >= thr) & (work_mask > 0) & (glare_mask == 0)).astype(np.uint8) * 255

    k_m = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (morph, morph))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, k_m, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, k_m, iterations=1)
    binary[work_mask == 0] = 0
    binary[glare_mask > 0] = 0

    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    cleaned = np.zeros_like(binary)
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if min_area <= area <= max_area_keep:
            cleaned[labels == i] = 255

    bright_fill = np.zeros_like(binary)
    work_vals = src[(work_mask > 0) & (glare_mask == 0)]
    if work_vals.size:
        bthr = max(float(np.percentile(work_vals, 88.0)), float(np.median(work_vals) + 25.0))
        bright = ((src >= bthr) & (work_mask > 0) & (glare_mask == 0)).astype(np.uint8) * 255
        bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, k_m, iterations=2)
        n2, lab2, st2, _ = cv2.connectedComponentsWithStats(bright, connectivity=8)
        for i in range(1, n2):
            area = int(st2[i, cv2.CC_STAT_AREA])
            if area >= cluster_min:
                bright_fill[lab2 == i] = 255

    return cleaned, bright_fill
