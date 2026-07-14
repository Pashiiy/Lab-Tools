"""
Multi-signal candidate matching for touching/merged colonies.

Signals: watershed distance peaks, LoG blob peaks, contour concavity points.
Prefer agreement across ≥2 signals. Strong disagreement → drop (under-count).
No area-based count estimation.
"""
from __future__ import annotations

import cv2
import numpy as np
from skimage.feature import blob_log, peak_local_max
from skimage.morphology import h_maxima


def split_merged_region(
    binary_component: np.ndarray,
    gray_raw: np.ndarray,
    params: dict | None = None,
) -> list[dict]:
    """
    Attempt to resolve a fused blob into individual colony centers.

    Returns zero or more colony dicts (x, y, radius, area, circularity, solidity).
    Empty list = give up (user can mark manually).
    """
    p = params or {}
    density = p.get("density_mode") or "moderate"
    est_area = float(p.get("estimated_area") or 50.0)
    est_r = max(2.0, float(np.sqrt(est_area / np.pi)))
    min_dist = max(1.5, float(p.get("min_seed_dist") or est_r * (0.7 if density == "dense" else 0.85)))
    h_val = max(0.35, float(p.get("h_maxima") or est_r * (0.08 if density == "dense" else 0.12)))
    log_sigma = float(p.get("log_sigma") or max(1.0, est_r / np.sqrt(2.0)))

    if binary_component is None or not np.any(binary_component):
        return []

    area = float(np.count_nonzero(binary_component))
    expected = area / max(est_area, 1.0)

    # If it already looks like one solid colony, don't force-split
    cnts, _ = cv2.findContours(binary_component, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return []
    cnt = max(cnts, key=cv2.contourArea)
    peri = float(cv2.arcLength(cnt, True))
    circ = float(4.0 * np.pi * area / (peri * peri)) if peri > 0 else 0.0
    hull = cv2.convexHull(cnt)
    hull_a = float(cv2.contourArea(hull))
    solidity = float(area / hull_a) if hull_a > 0 else 0.0
    m = cv2.moments(cnt)
    if m["m00"] <= 0:
        return []
    cx0 = float(m["m10"] / m["m00"])
    cy0 = float(m["m01"] / m["m00"])
    (_, _), r0 = cv2.minEnclosingCircle(cnt)

    if expected < 2.2 and circ >= 0.70 and solidity >= 0.82:
        return [
            {
                "x": cx0,
                "y": cy0,
                "radius": float(r0),
                "area": area,
                "circularity": circ,
                "solidity": solidity,
                "split_votes": 3,
            }
        ]

    ws = _watershed_seeds(binary_component, min_dist, h_val)
    log = _log_peaks(gray_raw, binary_component, log_sigma)
    conc = _concavity_points(cnt, est_r)

    tagged: list[tuple[str, float, float]] = (
        [("ws", float(y), float(x)) for y, x in ws]
        + [("log", float(y), float(x)) for y, x in log]
        + [("conc", float(y), float(x)) for y, x in conc]
    )
    if not tagged:
        if expected < 2.5 and circ >= 0.62:
            return [
                {
                    "x": cx0,
                    "y": cy0,
                    "radius": float(r0),
                    "area": area,
                    "circularity": circ,
                    "solidity": solidity,
                    "split_votes": 1,
                }
            ]
        return []

    match_r = max(2.0, est_r * (0.55 if density == "dense" else 0.65))
    clusters = _cluster_candidates(tagged, match_r)

    accepted_centers: list[tuple[float, float, int]] = []
    for sources, pts in clusters:
        n_types = len(sources)
        my = float(np.mean([p[0] for p in pts]))
        mx = float(np.mean([p[1] for p in pts]))
        yi, xi = int(round(my)), int(round(mx))
        if not (0 <= yi < binary_component.shape[0] and 0 <= xi < binary_component.shape[1]):
            continue
        if binary_component[yi, xi] == 0:
            continue
        if n_types >= 2:
            accepted_centers.append((mx, my, n_types))
        elif density == "dense" and ("ws" in sources or "log" in sources) and expected >= 2.0:
            # Dense plates: trust a solitary WS/LoG peak inside a known merge
            accepted_centers.append((mx, my, 1))
        elif n_types == 1 and expected < 2.8 and circ >= 0.65:
            accepted_centers.append((mx, my, 1))

    if not accepted_centers:
        if expected < 2.0 and circ >= 0.68:
            return [
                {
                    "x": cx0,
                    "y": cy0,
                    "radius": float(r0),
                    "area": area,
                    "circularity": circ,
                    "solidity": solidity,
                    "split_votes": 1,
                }
            ]
        return []

    # Cap: for dense, allow floor(expected)+1; still never use area-as-count alone
    max_k = max(1, int(np.floor(expected + (0.9 if density == "dense" else 0.5))))
    if len(accepted_centers) > max_k:
        accepted_centers = sorted(accepted_centers, key=lambda t: -t[2])[:max_k]

    share = area / float(len(accepted_centers))
    r_share = float(np.sqrt(share / np.pi))
    out = []
    for mx, my, votes in accepted_centers:
        out.append(
            {
                "x": float(mx),
                "y": float(my),
                "radius": r_share,
                "area": float(share),
                "circularity": float(min(1.0, circ + 0.05)),
                "solidity": float(solidity),
                "split_votes": int(votes),
            }
        )
    return out


def extract_component_mask(binary: np.ndarray, x: float, y: float, search_r: float) -> np.ndarray | None:
    """Largest CC intersecting a disk around (x,y), or None."""
    if binary is None or not np.any(binary):
        return None
    h, w = binary.shape[:2]
    xi, yi = int(round(x)), int(round(y))
    if not (0 <= yi < h and 0 <= xi < w):
        return None
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if n <= 1:
        return None
    # Prefer label at point; else nearest label centroid within search_r
    if binary[yi, xi] > 0:
        lab = int(labels[yi, xi])
        return (labels == lab).astype(np.uint8) * 255
    best_i = None
    best_d = search_r * search_r
    for i in range(1, n):
        cx = float(stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH] / 2)
        cy = float(stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT] / 2)
        d = (cx - x) ** 2 + (cy - y) ** 2
        if d < best_d:
            best_d = d
            best_i = i
    if best_i is None:
        return None
    return (labels == best_i).astype(np.uint8) * 255


def _watershed_seeds(binary: np.ndarray, min_dist: float, h_val: float) -> list[tuple[int, int]]:
    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    if not np.any(dist):
        return []
    peaks = h_maxima(dist, h=h_val)
    dist_p = dist.copy()
    dist_p[peaks == 0] = 0
    thr = max(0.8, float(np.percentile(dist[dist > 0], 40)) if np.any(dist > 0) else 0.8)
    coords = peak_local_max(
        dist_p,
        min_distance=max(1, int(round(min_dist))),
        threshold_abs=thr,
        exclude_border=False,
        labels=binary,
    )
    return [(int(y), int(x)) for y, x in coords]


def _log_peaks(gray_raw: np.ndarray, binary: np.ndarray, log_sigma: float) -> list[tuple[int, int]]:
    if gray_raw is None:
        return []
    src = gray_raw.astype(np.float32).copy()
    src[binary == 0] = 0
    try:
        mx = float(src.max()) or 1.0
        blobs = blob_log(
            src / mx,
            min_sigma=max(0.8, log_sigma * 0.7),
            max_sigma=max(log_sigma * 1.5, log_sigma + 0.5),
            num_sigma=5,
            threshold=0.05,
            overlap=0.45,
        )
    except Exception:
        return []
    out = []
    for r, c, _s in blobs:
        yi, xi = int(r), int(c)
        if 0 <= yi < binary.shape[0] and 0 <= xi < binary.shape[1] and binary[yi, xi] > 0:
            out.append((yi, xi))
    return out


def _concavity_points(cnt: np.ndarray, est_r: float) -> list[tuple[int, int]]:
    """Inward-bulge points on the outline (common seams between touching rounds)."""
    if cnt is None or len(cnt) < 8:
        return []
    hull = cv2.convexHull(cnt, returnPoints=False)
    if hull is None or len(hull) < 3:
        return []
    try:
        defects = cv2.convexityDefects(cnt, hull)
    except cv2.error:
        return []
    if defects is None:
        return []
    # Depth is in fixed-point (×256). OpenCV may return (N,4) or (N,1,4).
    min_depth = max(1.5, est_r * 0.35) * 256.0
    pts = []
    flat = defects.reshape(-1, 4)
    for row in flat:
        _s, _e, f, depth = (int(row[0]), int(row[1]), int(row[2]), int(row[3]))
        if depth < min_depth:
            continue
        pt = cnt[f][0]
        pts.append((int(pt[1]), int(pt[0])))
    return pts


def _cluster_candidates(
    tagged: list[tuple[str, float, float]], radius: float
) -> list[tuple[set[str], list[tuple[float, float]]]]:
    """Greedy cluster by proximity; returns (source_set, [(y,x), ...])."""
    used = [False] * len(tagged)
    r2 = radius * radius
    out = []
    for i, (src_i, yi, xi) in enumerate(tagged):
        if used[i]:
            continue
        sources = {src_i}
        pts = [(yi, xi)]
        used[i] = True
        changed = True
        while changed:
            changed = False
            for j, (src_j, yj, xj) in enumerate(tagged):
                if used[j]:
                    continue
                for py, px in pts:
                    if (yj - py) ** 2 + (xj - px) ** 2 <= r2:
                        used[j] = True
                        sources.add(src_j)
                        pts.append((yj, xj))
                        changed = True
                        break
        out.append((sources, pts))
    return out
