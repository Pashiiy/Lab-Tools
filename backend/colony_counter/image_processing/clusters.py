"""Fused-cluster density estimation for regions too dense to segment individually."""
from __future__ import annotations

import cv2
import numpy as np


def estimate_fused_clusters(
    binary: np.ndarray,
    rejected_large: np.ndarray,
    disagreement_mask: np.ndarray | None,
    accepted_regions: list[dict],
    hsv: np.ndarray,
    params: dict,
    origin_xy: tuple[int, int] = (0, 0),
    pre_cluster_mask: np.ndarray | None = None,
    local_est_area_fn=None,
) -> list[dict]:
    """
    Build cluster objects with floor(area / estimated_area) counts and contours.
    Splits mixed yeast/contaminant color regions before estimation.
    local_est_area_fn(x, y) → area in crop coordinates when provided.
    """
    est_area_global = float(params.get("estimated_area") or 50.0)
    cluster_min_global = float(params.get("cluster_area_min") or est_area_global * 8.0)
    x0, y0 = origin_xy

    residual = np.zeros(binary.shape, dtype=np.uint8)
    if pre_cluster_mask is not None:
        residual = cv2.bitwise_or(residual, pre_cluster_mask)
    if rejected_large is not None:
        residual = cv2.bitwise_or(residual, rejected_large)
    if disagreement_mask is not None and disagreement_mask.size:
        residual = cv2.bitwise_or(residual, disagreement_mask)

    n0, lab0, st0, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    for i in range(1, n0):
        area = int(st0[i, cv2.CC_STAT_AREA])
        cx = float(st0[i, cv2.CC_STAT_LEFT] + st0[i, cv2.CC_STAT_WIDTH] / 2)
        cy = float(st0[i, cv2.CC_STAT_TOP] + st0[i, cv2.CC_STAT_HEIGHT] / 2)
        local_a = float(local_est_area_fn(cx, cy)) if local_est_area_fn else est_area_global
        if area >= max(cluster_min_global * 0.5, local_a * 8.0):
            residual[lab0 == i] = 255

    covered = np.zeros(binary.shape, dtype=np.uint8)
    for r in accepted_regions:
        m = r.get("mask")
        if m is not None:
            covered = cv2.bitwise_or(covered, m)
        elif "x" in r and "y" in r:
            rr = max(2, int(round(float(r.get("radius") or 4))))
            cv2.circle(covered, (int(round(r["x"])), int(round(r["y"]))), rr, 255, -1)
    residual[covered > 0] = 0

    if not np.any(residual):
        return []

    split_masks = _split_by_color(residual, hsv)
    clusters: list[dict] = []
    cid = 0

    for colony_type, smask in split_masks:
        if not np.any(smask):
            continue
        n, labels, stats, _ = cv2.connectedComponentsWithStats(smask, connectivity=8)
        for i in range(1, n):
            area = int(stats[i, cv2.CC_STAT_AREA])
            cx = float(stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH] / 2)
            cy = float(stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT] / 2)
            est_area = float(local_est_area_fn(cx, cy)) if local_est_area_fn else est_area_global
            cluster_min = max(est_area * 8.0, cluster_min_global * 0.5)
            if area < cluster_min:
                continue
            estimated = int(area // max(est_area, 1.0))  # floor
            if estimated < 2:
                continue

            comp = (labels == i).astype(np.uint8) * 255
            cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not cnts:
                continue
            cnt = max(cnts, key=cv2.contourArea)
            eps = 0.01 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, max(eps, 1.5), True)
            contour = [[float(pt[0][0] + x0), float(pt[0][1] + y0)] for pt in approx]
            if len(contour) < 3:
                continue

            cid += 1
            clusters.append(
                {
                    "id": f"cluster-{cid}",
                    "estimatedCount": estimated,
                    "area": float(area),
                    "contour": contour,
                    "colonyType": colony_type,
                }
            )

    return clusters


def _split_by_color(mask: np.ndarray, hsv: np.ndarray) -> list[tuple[str, np.ndarray]]:
    """Split fused mask into yeast / contaminant / uncertain by HSV when mixed."""
    pix = hsv[mask > 0]
    if pix.size == 0:
        return [("yeast", mask)]

    h = pix[:, 0].astype(np.float32)
    s = pix[:, 1].astype(np.float32)
    sat_med = float(np.median(s))
    sat_cut = max(35.0, sat_med + 18.0)

    hh = hsv[:, :, 0]
    ss = hsv[:, :, 1]
    red = ((hh <= 12) | (hh >= 168)) & (ss >= sat_cut) & (mask > 0)
    pale = (ss < sat_cut * 0.75) & (mask > 0) & (~red)

    contam = red.astype(np.uint8) * 255
    yeast = pale.astype(np.uint8) * 255
    # Remainder of mask
    rest = mask.copy()
    rest[contam > 0] = 0
    rest[yeast > 0] = 0

    out: list[tuple[str, np.ndarray]] = []
    if np.any(yeast):
        out.append(("yeast", yeast))
    if np.any(contam):
        out.append(("contaminant", contam))
    if np.any(rest):
        # If significant leftover, tag uncertain; else fold into yeast
        if int(np.count_nonzero(rest)) > int(np.count_nonzero(mask)) * 0.15:
            out.append(("uncertain", rest))
        elif np.any(yeast):
            yeast = cv2.bitwise_or(yeast, rest)
            out = [(t, m if t != "yeast" else yeast) for t, m in out]
        else:
            out.append(("yeast", rest))

    if not out:
        out = [("yeast", mask)]
    return out
