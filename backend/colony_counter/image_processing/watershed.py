"""Scale-adaptive watershed with skimage peak_local_max / h_maxima + LoG cross-check."""
from __future__ import annotations

import cv2
import numpy as np
from skimage.feature import blob_log, peak_local_max
from skimage.morphology import h_maxima


def separate_touching(
    binary: np.ndarray,
    work_mask: np.ndarray,
    params: dict | None = None,
    gray_raw: np.ndarray | None = None,
) -> tuple[np.ndarray, dict]:
    """
    Returns (labels, meta). Large fused components are excluded from watershed
    and returned in meta['pre_cluster_mask'] for density estimation.
    """
    meta = {
        "log_blobs": [],
        "seed_count": 0,
        "disagreement_mask": None,
        "pre_cluster_mask": None,
    }
    if binary is None or binary.size == 0 or not np.any(binary):
        return np.zeros(binary.shape if binary is not None else (0, 0), dtype=np.int32), meta

    p = params or {}
    min_dist = float(p.get("min_seed_dist") or 6.0)
    h_val = float(p.get("h_maxima") or 1.0)
    log_sigma = float(p.get("log_sigma") or 3.0)
    est_area = float(p.get("estimated_area") or 50.0)
    cluster_min = float(p.get("cluster_area_min") or est_area * 4.0)

    # Peel off obviously fused connected components before watershed
    pre_cluster = np.zeros(binary.shape, dtype=np.uint8)
    segmentable = binary.copy()
    n0, lab0, st0, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    for i in range(1, n0):
        area = int(st0[i, cv2.CC_STAT_AREA])
        if area < cluster_min:
            continue
        bw = int(st0[i, cv2.CC_STAT_WIDTH])
        bh = int(st0[i, cv2.CC_STAT_HEIGHT])
        extent = area / float(max(bw * bh, 1))
        expected = area / max(est_area, 1.0)
        if expected >= 4.0 or (expected >= 3.0 and extent < 0.55):
            pre_cluster[lab0 == i] = 255
            segmentable[lab0 == i] = 0

    meta["pre_cluster_mask"] = pre_cluster

    if not np.any(segmentable):
        return np.zeros(binary.shape, dtype=np.int32), meta

    dist = cv2.distanceTransform(segmentable, cv2.DIST_L2, 5)
    h_peaks = h_maxima(dist, h=h_val)
    dist_for_peaks = dist.copy()
    dist_for_peaks[h_peaks == 0] = 0

    min_distance = max(1, int(round(min_dist)))
    thr_abs = max(0.8, float(np.percentile(dist[dist > 0], 40)) if np.any(dist > 0) else 0.8)
    coordinates = peak_local_max(
        dist_for_peaks,
        min_distance=min_distance,
        threshold_abs=thr_abs,
        exclude_border=False,
        labels=segmentable,
    )

    log_coords = []
    if gray_raw is not None and np.any(segmentable):
        src = gray_raw.astype(np.float32)
        masked = src.copy()
        masked[segmentable == 0] = 0
        try:
            mx = float(masked.max()) or 1.0
            norm = masked / mx
            blobs = blob_log(
                norm,
                min_sigma=max(0.8, log_sigma * 0.7),
                max_sigma=max(log_sigma * 1.5, log_sigma + 0.5),
                num_sigma=5,
                threshold=0.05,
                overlap=0.45,
            )
            log_coords = [
                (int(r), int(c))
                for r, c, _s in blobs
                if 0 <= int(r) < segmentable.shape[0]
                and 0 <= int(c) < segmentable.shape[1]
                and segmentable[int(r), int(c)] > 0
            ]
        except Exception:
            log_coords = []

    meta["log_blobs"] = log_coords
    kept = [(int(y), int(x)) for y, x in coordinates]
    meta["seed_count"] = len(kept)
    meta["disagreement_mask"] = _seed_log_disagreement(segmentable, kept, log_coords, est_area)

    if not kept:
        n, labels = cv2.connectedComponents(segmentable)
        labels = labels.astype(np.int32)
        labels[work_mask == 0] = 0
        return labels, meta

    markers = np.zeros(segmentable.shape, dtype=np.int32)
    for i, (y, x) in enumerate(kept, start=1):
        markers[y, x] = i

    sure_bg = cv2.dilate(segmentable, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1)
    markers[sure_bg == 0] = 0

    bgr = cv2.cvtColor(segmentable, cv2.COLOR_GRAY2BGR)
    cv2.watershed(bgr, markers)
    labels = markers.copy()
    labels[labels < 0] = 0
    labels[work_mask == 0] = 0
    labels[segmentable == 0] = 0

    labels = _merge_tiny_fragments(labels, est_area * 0.35)
    return labels, meta


def _seed_log_disagreement(
    binary: np.ndarray,
    seeds: list[tuple[int, int]],
    log_coords: list[tuple[int, int]],
    est_area: float,
) -> np.ndarray:
    out = np.zeros(binary.shape, dtype=np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if n <= 1:
        return out

    seed_yx = seeds or []
    log_yx = log_coords or []

    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < est_area * 4.0:
            continue
        x, y, bw, bh = (
            int(stats[i, cv2.CC_STAT_LEFT]),
            int(stats[i, cv2.CC_STAT_TOP]),
            int(stats[i, cv2.CC_STAT_WIDTH]),
            int(stats[i, cv2.CC_STAT_HEIGHT]),
        )
        n_seed = sum(
            1 for sy, sx in seed_yx if y <= sy < y + bh and x <= sx < x + bw and labels[sy, sx] == i
        )
        n_log = sum(
            1 for ly, lx in log_yx if y <= ly < y + bh and x <= lx < x + bw and labels[ly, lx] == i
        )
        expected = area / max(est_area, 1.0)
        disagree = False
        if n_log > 0 and n_seed > 0 and max(n_seed, n_log) / max(min(n_seed, n_log), 1) >= 2.0:
            disagree = True
        if n_seed < expected * 0.45 and expected >= 5.0:
            disagree = True
        if n_seed <= 1 and expected >= 5.0:
            disagree = True
        if disagree:
            out[labels == i] = 255
    return out


def _merge_tiny_fragments(labels: np.ndarray, tiny_thresh: float) -> np.ndarray:
    ids = [i for i in np.unique(labels) if i > 0]
    if len(ids) < 2:
        return labels

    out = labels.copy()
    for _ in range(8):
        ids = [i for i in np.unique(out) if i > 0]
        counts = np.bincount(out.ravel())
        changed = False
        for i in ids:
            if i >= len(counts) or counts[i] >= tiny_thresh:
                continue
            mask_i = (out == i).astype(np.uint8)
            dil = cv2.dilate(mask_i, np.ones((3, 3), np.uint8), iterations=1)
            neigh = out[(dil > 0) & (out > 0) & (out != i)]
            if neigh.size == 0:
                continue
            vals, cts = np.unique(neigh, return_counts=True)
            best_j = int(vals[np.argmax(cts)])
            out[out == i] = best_j
            changed = True
            break
        if not changed:
            break
    return out
