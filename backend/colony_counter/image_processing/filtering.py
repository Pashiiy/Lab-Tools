"""Filter individual colonies with scale-adaptive area bounds (vectorized-friendly)."""
from __future__ import annotations

import cv2
import numpy as np


def filter_regions(
    labels: np.ndarray,
    work_mask: np.ndarray,
    glare_mask: np.ndarray,
    params: dict | None = None,
    origin: tuple[int, int] = (0, 0),
) -> tuple[list[dict], np.ndarray]:
    """
    Returns (accepted_regions, rejected_large_mask) — large rejects feed cluster fallback.
    """
    del origin
    p = params or {}
    regions: list[dict] = []
    rejected_large = np.zeros(labels.shape, dtype=np.uint8)

    ids = [i for i in np.unique(labels) if i > 0]
    if not ids:
        return regions, rejected_large

    min_area = float(p.get("min_area") or 18)
    max_indiv = float(p.get("max_area_individual") or 1e9)
    cluster_min = float(p.get("cluster_area_min") or max_indiv * 1.2)

    border = cv2.morphologyEx(
        work_mask,
        cv2.MORPH_GRADIENT,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
    )

    # Bulk stats via bincount for areas
    flat = labels.ravel()
    areas_bc = np.bincount(flat)

    for i in ids:
        area = int(areas_bc[i]) if i < len(areas_bc) else 0
        if area < min_area:
            continue
        if area >= cluster_min:
            rejected_large[labels == i] = 255
            continue
        if area > max_indiv:
            # Ambiguous mid-large: send to cluster path rather than fake single
            rejected_large[labels == i] = 255
            continue

        mask = (labels == i).astype(np.uint8) * 255

        if glare_mask is not None and np.any((mask > 0) & (glare_mask > 0)):
            glare_frac = float(np.count_nonzero((mask > 0) & (glare_mask > 0))) / area
            if glare_frac > 0.15:
                continue

        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            continue
        cnt = max(cnts, key=cv2.contourArea)
        peri = float(cv2.arcLength(cnt, True))
        if peri <= 0:
            continue
        circularity = float(4.0 * np.pi * area / (peri * peri))
        if circularity < 0.58:
            # Irregular mid-size → cluster residual rather than inventing a colony
            if area >= min_area * 2.5:
                rejected_large[mask > 0] = 255
            continue

        hull = cv2.convexHull(cnt)
        hull_area = float(cv2.contourArea(hull))
        solidity = float(area / hull_area) if hull_area > 0 else 0.0
        if solidity < 0.78:
            if area >= min_area * 2.5:
                rejected_large[mask > 0] = 255
            continue

        edge_touch = int(np.count_nonzero((mask > 0) & (border > 0)))
        if edge_touch > 0 and edge_touch / area > 0.18 and circularity < 0.75:
            continue

        m = cv2.moments(cnt)
        if m["m00"] <= 0:
            continue
        cx = float(m["m10"] / m["m00"])
        cy = float(m["m01"] / m["m00"])
        (_, _), radius = cv2.minEnclosingCircle(cnt)

        regions.append(
            {
                "x": cx,
                "y": cy,
                "radius": float(radius),
                "area": float(area),
                "circularity": circularity,
                "solidity": solidity,
                "mask": mask,
            }
        )

    return regions, rejected_large
