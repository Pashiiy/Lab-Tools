"""Tophat + percentile threshold inside the work mask — precision over recall."""
from __future__ import annotations

import cv2
import numpy as np


def segment_colonies(
    gray: np.ndarray,
    glare_mask: np.ndarray,
    work_mask: np.ndarray,
    gray_raw: np.ndarray | None = None,
) -> np.ndarray:
    # Prefer raw gray for tophat so white colonies keep local contrast
    src = gray_raw if gray_raw is not None else gray
    # Kernel must exceed typical colony diameter so tophat isolates them
    k = max(21, (min(src.shape) // 18) | 1)
    if k % 2 == 0:
        k += 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    tophat = cv2.morphologyEx(src, cv2.MORPH_TOPHAT, kernel)

    masked_vals = tophat[(work_mask > 0) & (glare_mask == 0)]
    if masked_vals.size == 0:
        return np.zeros_like(src, dtype=np.uint8)

    # Strong peaks relative to this plate
    thr = float(np.percentile(masked_vals, 90.0))
    thr = max(thr, float(np.median(masked_vals) + 8.0), 8.0)
    binary = ((tophat >= thr) & (work_mask > 0) & (glare_mask == 0)).astype(np.uint8) * 255

    k_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, k_open, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, k_close, iterations=1)
    binary[work_mask == 0] = 0
    binary[glare_mask > 0] = 0

    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    area_img = float(np.count_nonzero(work_mask))
    min_area = max(18, int(area_img * 0.00005))
    max_area = int(area_img * 0.045)
    cleaned = np.zeros_like(binary)
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if min_area <= area <= max_area:
            cleaned[labels == i] = 255

    return cleaned
