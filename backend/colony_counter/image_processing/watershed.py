"""Conservative watershed to split touching colonies (favor under-split)."""
from __future__ import annotations

import cv2
import numpy as np


def separate_touching(binary: np.ndarray, work_mask: np.ndarray) -> np.ndarray:
    if binary is None or binary.size == 0 or not np.any(binary):
        return np.zeros(binary.shape if binary is not None else (0, 0), dtype=np.int32)

    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    positive = dist[dist > 0]
    min_dist = max(6.0, float(np.median(positive) * 1.4) if positive.size else 8.0)
    prominence = max(1.5, float(np.percentile(positive, 55)) if positive.size else 1.5)

    k = max(3, int(min_dist) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    dilated = cv2.dilate(dist, kernel)
    peak_mask = (dist >= dilated - 1e-6) & (dist > prominence) & (binary > 0) & (work_mask > 0)

    ys, xs = np.where(peak_mask)
    peaks = sorted(zip(dist[ys, xs], ys, xs), reverse=True)
    kept: list[tuple[int, int]] = []
    min_d2 = min_dist**2
    for _, y, x in peaks:
        if all((y - ky) ** 2 + (x - kx) ** 2 >= min_d2 for ky, kx in kept):
            kept.append((int(y), int(x)))

    if not kept:
        n, labels = cv2.connectedComponents(binary)
        labels = labels.astype(np.int32)
        labels[work_mask == 0] = 0
        return labels

    markers = np.zeros(binary.shape, dtype=np.int32)
    for i, (y, x) in enumerate(kept, start=1):
        markers[y, x] = i

    sure_bg = cv2.dilate(binary, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1)
    markers[sure_bg == 0] = 0

    bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    cv2.watershed(bgr, markers)
    labels = markers.copy()
    labels[labels < 0] = 0
    labels[work_mask == 0] = 0
    labels[binary == 0] = 0

    return _merge_tiny_fragments(labels)


def _circularity(area: float, perimeter: float) -> float:
    if perimeter <= 0:
        return 0.0
    return float(4.0 * np.pi * area / (perimeter * perimeter))


def _merge_tiny_fragments(labels: np.ndarray) -> np.ndarray:
    ids = [i for i in np.unique(labels) if i > 0]
    if len(ids) < 2:
        return labels

    areas = {i: int(np.count_nonzero(labels == i)) for i in ids}
    med = float(np.median(list(areas.values()))) if areas else 0
    tiny_thresh = max(12, med * 0.35)

    out = labels.copy()
    changed = True
    while changed:
        changed = False
        ids = [i for i in np.unique(out) if i > 0]
        areas = {i: int(np.count_nonzero(out == i)) for i in ids}
        for i in ids:
            if areas[i] >= tiny_thresh:
                continue
            mask_i = (out == i).astype(np.uint8)
            dil = cv2.dilate(mask_i, np.ones((3, 3), np.uint8), iterations=1)
            neigh = out[(dil > 0) & (out > 0) & (out != i)]
            if neigh.size == 0:
                continue
            best_j = None
            best_score = -1.0
            for j in np.unique(neigh):
                union = ((out == i) | (out == j)).astype(np.uint8) * 255
                cnts, _ = cv2.findContours(union, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not cnts:
                    continue
                area = float(cv2.contourArea(cnts[0]))
                peri = float(cv2.arcLength(cnts[0], True))
                circ = _circularity(area, peri)
                if circ > best_score:
                    best_score = circ
                    best_j = int(j)
            if best_j is not None:
                out[out == i] = best_j
                changed = True
                break
    return out
