"""Filter false positives by shape / mask edge / glare."""
from __future__ import annotations

import cv2
import numpy as np


def filter_regions(
    labels: np.ndarray,
    work_mask: np.ndarray,
    glare_mask: np.ndarray,
    origin: tuple[int, int] = (0, 0),
) -> list[dict]:
    del origin  # remapped later; kept for API symmetry
    regions: list[dict] = []
    ids = [i for i in np.unique(labels) if i > 0]
    if not ids:
        return regions

    area_img = float(np.count_nonzero(work_mask))
    min_area = max(18, int(area_img * 0.00005))
    max_area = int(area_img * 0.045)

    # Border of work mask — reject partial rim blobs
    border = cv2.morphologyEx(
        work_mask,
        cv2.MORPH_GRADIENT,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
    )

    for i in ids:
        mask = (labels == i).astype(np.uint8) * 255
        area = int(np.count_nonzero(mask))
        if area < min_area or area > max_area:
            continue

        # Glare overlap
        if np.any((mask > 0) & (glare_mask > 0)):
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
        if circularity < 0.62:
            continue

        hull = cv2.convexHull(cnt)
        hull_area = float(cv2.contourArea(hull))
        solidity = float(area / hull_area) if hull_area > 0 else 0.0
        if solidity < 0.82:
            continue

        # Edge contact: if mostly rim fragment, drop
        edge_touch = int(np.count_nonzero((mask > 0) & (border > 0)))
        if edge_touch > 0 and edge_touch / area > 0.18:
            # Keep only if still fairly round and mostly inside
            if circularity < 0.75:
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

    return regions
