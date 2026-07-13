"""Classify yeast (white) vs red/pink contaminant vs uncertain — per-image calibration."""
from __future__ import annotations

import numpy as np


def classify_colonies(regions: list[dict], hsv: np.ndarray, origin: tuple[int, int] = (0, 0)) -> list[dict]:
    del origin
    if not regions:
        return []

    sats: list[float] = []
    samples: list[dict] = []

    for r in regions:
        mask = r["mask"]
        # Shrink mask to sample interior only
        ys, xs = np.where(mask > 0)
        if len(xs) < 5:
            samples.append({**{k: v for k, v in r.items() if k != "mask"}, "_mean_s": 0, "_mean_v": 0, "_mean_h": 0})
            continue
        # Erode conceptually: use only pixels farther from edge via distance ranking
        cy, cx = int(round(r["y"])), int(round(r["x"]))
        dist2 = (ys - cy) ** 2 + (xs - cx) ** 2
        order = np.argsort(dist2)
        take = max(3, len(order) // 2)
        idxs = order[:take]
        pix = hsv[ys[idxs], xs[idxs]]
        h = pix[:, 0].astype(np.float32)
        s = pix[:, 1].astype(np.float32)
        v = pix[:, 2].astype(np.float32)
        mean_s = float(np.median(s))
        mean_v = float(np.median(v))
        mean_h = float(np.median(h))
        sats.append(mean_s)
        samples.append(
            {
                **{k: v for k, v in r.items() if k != "mask"},
                "_mean_s": mean_s,
                "_mean_v": mean_v,
                "_mean_h": mean_h,
            }
        )

    sat_arr = np.array(sats) if sats else np.array([20.0])
    sat_med = float(np.median(sat_arr))
    sat_p80 = float(np.percentile(sat_arr, 80)) if len(sat_arr) else sat_med
    # Contaminants: meaningfully more saturated than the pale cluster
    sat_cut = max(35.0, sat_med + 18.0, sat_p80 * 0.85)

    out = []
    for s in samples:
        mean_s = s.pop("_mean_s")
        mean_v = s.pop("_mean_v")
        mean_h = s.pop("_mean_h")
        is_red_hue = mean_h <= 12 or mean_h >= 168  # OpenCV H 0–179 wraps
        is_pale = mean_s < max(28.0, sat_med + 8.0) and mean_v > 90
        is_contam = is_red_hue and mean_s >= sat_cut and mean_v > 40

        if is_contam:
            colony_type = "contaminant"
        elif is_pale or mean_s < sat_cut * 0.7:
            colony_type = "yeast"
        elif is_red_hue and mean_s >= sat_med + 8:
            colony_type = "uncertain"
        else:
            colony_type = "yeast" if mean_s < sat_cut else "uncertain"

        s["colonyType"] = colony_type
        out.append(s)

    return out
