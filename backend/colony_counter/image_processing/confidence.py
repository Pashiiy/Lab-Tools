"""Per-colony confidence; density-adaptive thresholds (sparse = stricter)."""
from __future__ import annotations

import numpy as np


def score_and_threshold(
    regions: list[dict],
    gray: np.ndarray,
    origin: tuple[int, int] = (0, 0),
    params: dict | None = None,
) -> list[dict]:
    del origin
    if not regions:
        return []

    p = params or {}
    density = p.get("density_mode") or "moderate"
    if density == "sparse":
        min_conf = 0.68
        min_circ = 0.70
    elif density == "dense":
        min_conf = 0.42
        min_circ = 0.45
    else:
        min_conf = 0.58
        min_circ = 0.60

    est_area = float(p.get("estimated_area") or 0)
    areas = np.array([r["area"] for r in regions], dtype=np.float64)
    med_area = float(np.median(areas)) if len(areas) else (est_area or 1.0)
    if est_area > 0:
        med_area = 0.5 * med_area + 0.5 * est_area

    scored = []
    for r in regions:
        circ = float(r.get("circularity") or 0)
        if circ < min_circ:
            continue
        area = float(r["area"])
        size_score = 1.0 - min(1.0, abs(area - med_area) / max(med_area, 1.0))
        size_score = max(0.0, size_score)

        # Reject noise far below expected colony size (common sparse FP)
        if est_area > 0 and area < est_area * 0.25:
            continue
        if est_area > 0 and area > est_area * 7.0 and density == "sparse":
            # Sparse shouldn't keep giant irregular blobs as singles
            continue

        cx, cy = int(round(r["x"])), int(round(r["y"]))
        rad = max(2, int(round(r["radius"])))
        h, w = gray.shape[:2]
        y0, y1 = max(0, cy - rad * 2), min(h, cy + rad * 2 + 1)
        x0, x1 = max(0, cx - rad * 2), min(w, cx + rad * 2 + 1)
        patch = gray[y0:y1, x0:x1]
        if patch.size == 0:
            contrast = 0.0
        else:
            yy, xx = np.ogrid[y0:y1, x0:x1]
            dist = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
            inner = patch[dist <= rad]
            ring = patch[(dist > rad) & (dist <= rad * 1.8)]
            if inner.size and ring.size:
                contrast = float(np.clip((np.mean(inner) - np.mean(ring)) / 64.0, 0.0, 1.0))
            else:
                contrast = 0.35

        stab = float(r.get("stability") or 0.5)
        sol = float(r.get("solidity") or 0.8)
        conf = 0.35 * circ + 0.25 * contrast + 0.20 * size_score + 0.12 * stab + 0.08 * sol
        conf = float(np.clip(conf, 0.0, 1.0))

        if conf < min_conf:
            continue
        # Sparse: also require visible contrast over media texture
        if density == "sparse" and contrast < 0.18:
            continue

        entry = {
            "id": len(scored) + 1,
            "x": float(r["x"]),
            "y": float(r["y"]),
            "radius": float(r["radius"]),
            "area": float(r["area"]),
            "circularity": circ,
            "confidence": round(conf, 4),
            "colonyType": r.get("colonyType") or "uncertain",
        }
        if r.get("mask") is not None:
            entry["mask"] = r["mask"]
        scored.append(entry)

    return scored
