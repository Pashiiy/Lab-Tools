"""
Multi-threshold stability detection (OpenCFU-inspired technique, original code).

Real colonies remain colony-shaped across many threshold levels; glare, rim,
and media texture typically only look colony-like in a narrow band.
"""
from __future__ import annotations

import cv2
import numpy as np

# Relative offsets around a base adaptive threshold (tophat intensity)
_SWEEP_OFFSETS = (-18, -12, -8, -4, 0, 4, 8, 12, 18, 28)


def stability_detect(
    gray_raw: np.ndarray,
    glare_mask: np.ndarray,
    work_mask: np.ndarray,
    params: dict | None = None,
) -> tuple[list[dict], np.ndarray, np.ndarray, np.ndarray]:
    """
    Sweep thresholds; keep regions with high cross-threshold stability.

    Returns:
      regions: list of stable colony-like regions (may still be fused merges)
      binary_union: union of colony-like masks across the sweep (viz)
      morph_clean: open/close of the mid-threshold binary (viz)
      stability_map: uint8 heatmap of how often a pixel belonged to a valid CC
    """
    p = params or {}
    est_area = float(p.get("estimated_area") or 50.0)
    min_area = float(p.get("min_area") or max(8.0, est_area * 0.30))
    max_area = float(p.get("max_area_keep") or max(est_area * 80.0, np.count_nonzero(work_mask) * 0.2))
    tophat_k = int(p.get("tophat_k") or max(9, 21))
    if tophat_k % 2 == 0:
        tophat_k += 1
    morph_k = int(p.get("morph_k") or 3)
    if morph_k % 2 == 0:
        morph_k += 1

    # Density-aware bars. Fuller moderate plates (fill≥0.17) loosen candidate
    # circ/stability so touching pairs register for split; light-moderate
    # (e.g. img_5573 at ~15% fill) stays closer to sparse to reject dust.
    # Post-split confidence still enforces roundness on individuals.
    density_mode = p.get("density_mode") or "moderate"
    fill_ratio = float(p.get("fill_ratio") if p.get("fill_ratio") is not None else 0.25)
    moderate_recall = density_mode == "moderate" and fill_ratio >= 0.17
    if density_mode == "sparse":
        min_stability = 0.55
        min_circ = 0.72
        min_solidity = 0.86
    elif density_mode == "dense":
        min_stability = 0.28
        min_circ = 0.48
        min_solidity = 0.68
    elif moderate_recall:
        min_stability = 0.40
        min_circ = 0.45
        min_solidity = 0.68
    else:
        # light-moderate
        min_stability = 0.45
        min_circ = 0.58
        min_solidity = 0.78

    src = gray_raw
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (tophat_k, tophat_k))
    tophat = cv2.morphologyEx(src, cv2.MORPH_TOPHAT, kernel)
    valid = (work_mask > 0) & (glare_mask == 0)
    vals = tophat[valid]
    if vals.size == 0:
        z = np.zeros_like(src, dtype=np.uint8)
        return [], z, z, z

    base = float(np.percentile(vals, 90.0))
    base = max(base, float(np.median(vals) + 8.0), 6.0)

    k_m = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (morph_k, morph_k))
    n_levels = len(_SWEEP_OFFSETS)
    # Accumulator: for each level a binary of "colony-like" pixels
    like_count = np.zeros(src.shape, dtype=np.float32)
    binary_union = np.zeros(src.shape, dtype=np.uint8)
    morph_mid = None

    # Track trajectories by quantized center across levels
    # key -> {hits, best_shape, sums}
    tracks: dict[tuple[int, int], dict] = {}

    for li, off in enumerate(_SWEEP_OFFSETS):
        thr = max(4.0, base + float(off))
        binary = ((tophat >= thr) & valid).astype(np.uint8) * 255
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, k_m, iterations=1)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, k_m, iterations=1)
        binary[work_mask == 0] = 0
        binary[glare_mask > 0] = 0

        if off == 0:
            morph_mid = binary.copy()

        n, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
        level_like = np.zeros(src.shape, dtype=np.uint8)

        for i in range(1, n):
            area = float(stats[i, cv2.CC_STAT_AREA])
            if area < min_area or area > max_area:
                continue
            x, y, bw, bh = (
                int(stats[i, cv2.CC_STAT_LEFT]),
                int(stats[i, cv2.CC_STAT_TOP]),
                int(stats[i, cv2.CC_STAT_WIDTH]),
                int(stats[i, cv2.CC_STAT_HEIGHT]),
            )
            crop = (labels[y : y + bh, x : x + bw] == i).astype(np.uint8) * 255
            cnts, _ = cv2.findContours(crop, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not cnts:
                continue
            cnt = max(cnts, key=cv2.contourArea)
            peri = float(cv2.arcLength(cnt, True))
            if peri <= 0:
                continue
            circ = float(4.0 * np.pi * area / (peri * peri))
            hull = cv2.convexHull(cnt)
            hull_a = float(cv2.contourArea(hull))
            solidity = float(area / hull_a) if hull_a > 0 else 0.0

            # Lenient per-level gate: stability decides acceptance later
            if circ < 0.40 or solidity < 0.55:
                continue

            cx = float(centroids[i, 0])
            cy = float(centroids[i, 1])
            # Quantize by ~ half estimated radius so tracks stick across thresholds
            est_r = max(2.0, float(np.sqrt(est_area / np.pi)))
            q = max(2, int(round(est_r * 0.7)))
            key = (int(round(cx / q)), int(round(cy / q)))

            t = tracks.get(key)
            if t is None:
                t = {
                    "hits": 0,
                    "circ_sum": 0.0,
                    "sol_sum": 0.0,
                    "area_sum": 0.0,
                    "cx_sum": 0.0,
                    "cy_sum": 0.0,
                    "best_circ": 0.0,
                    "best_sol": 0.0,
                    "best_area": 0.0,
                    "levels": [],
                }
                tracks[key] = t
            t["hits"] += 1
            t["circ_sum"] += circ
            t["sol_sum"] += solidity
            t["area_sum"] += area
            t["cx_sum"] += cx
            t["cy_sum"] += cy
            t["levels"].append(li)
            if circ >= t["best_circ"]:
                t["best_circ"] = circ
                t["best_sol"] = solidity
                t["best_area"] = area

            level_like[labels == i] = 255

        like_count += (level_like > 0).astype(np.float32)
        binary_union = cv2.bitwise_or(binary_union, level_like)

    if morph_mid is None:
        morph_mid = binary_union.copy()

    stability_map = np.clip(like_count / float(n_levels) * 255.0, 0, 255).astype(np.uint8)

    regions: list[dict] = []
    for t in tracks.values():
        stab = t["hits"] / float(n_levels)
        if stab < min_stability:
            continue
        mean_circ = t["circ_sum"] / t["hits"]
        mean_sol = t["sol_sum"] / t["hits"]
        mean_area = t["area_sum"] / t["hits"]
        # Prefer best-shape snapshot for final gate (real colonies look good at some level)
        circ = max(mean_circ, t["best_circ"] * 0.9)
        sol = max(mean_sol, t["best_sol"] * 0.9)
        # Fuller moderate: touching pairs deform outline — loosen circ for
        # merge-sized tracks only. Light-moderate keeps a uniform bar.
        eff_min_circ = min_circ
        if moderate_recall and mean_area >= est_area * 1.4:
            eff_min_circ = min(min_circ, 0.42)
        if circ < eff_min_circ or sol < min_solidity:
            continue
        # Consecutive-level bonus: OpenCFU-style recurrence, not just sparse lucky hits.
        # Dense / fuller-moderate merges: ≥2. Sparse and light-moderate: stricter span.
        levels = sorted(t["levels"])
        consecutive = _max_consecutive_span(levels)
        strict_consec = max(2, int(np.ceil(min_stability * n_levels * 0.6)))
        if density_mode == "dense":
            min_consec = 2
        elif moderate_recall and mean_area >= est_area * 1.4:
            min_consec = 2
        else:
            min_consec = strict_consec
        if consecutive < min_consec:
            continue

        cx = t["cx_sum"] / t["hits"]
        cy = t["cy_sum"] / t["hits"]
        r = float(np.sqrt(mean_area / np.pi))
        split_mult = 2.5
        if density_mode == "moderate":
            split_mult = 1.55 if moderate_recall else 2.2
        elif density_mode == "dense":
            split_mult = 2.2
        regions.append(
            {
                "x": float(cx),
                "y": float(cy),
                "radius": r,
                "area": float(mean_area),
                "circularity": float(circ),
                "solidity": float(sol),
                "stability": float(stab),
                # Flag doublets for split: real doublet ≈2× single area.
                "needs_split": mean_area >= est_area * split_mult,
            }
        )

    return regions, binary_union, morph_mid, stability_map


def _max_consecutive_span(levels: list[int]) -> int:
    if not levels:
        return 0
    best = 1
    cur = 1
    for a, b in zip(levels, levels[1:]):
        if b == a + 1:
            cur += 1
            best = max(best, cur)
        elif b > a + 1:
            cur = 1
    return best
