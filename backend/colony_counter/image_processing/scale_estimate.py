"""Robust colony-size estimation (MAD-trimmed) + parameter derivation."""
from __future__ import annotations

import cv2
import numpy as np

MIN_CLEAN_SAMPLES = 15

# Conservative default when no trustworthy estimate exists.
# ~1.5% of the shorter edge, clamped to 8–22px.
# Chosen because phone photos of standard plates in this app typically show
# yeast colonies in that band; sparse_2 diagnosis recovered true colonies at
# ~18px and produced rim/text FPs at ~2.5px. Prefer slightly large over tiny
# (bias: under-count rather than over-count on dust/rim artifacts).
_CONSERVATIVE_RADIUS_FRAC = 0.015
_CONSERVATIVE_RADIUS_MIN = 8.0
_CONSERVATIVE_RADIUS_MAX = 22.0


def estimate_colony_scale(
    gray_raw: np.ndarray,
    work_mask: np.ndarray,
    glare_mask: np.ndarray | None = None,
) -> dict:
    """
    Outlier-resistant size estimate from clean, isolated components.

    Returns radius/area plus n_samples and confidence (0–1).
    Callers that drive detection MUST pass the result through
    ``resolve_scale_estimate`` before using radius/area — untrusted
    estimates must not be used directly.
    """
    glare = glare_mask if glare_mask is not None else np.zeros_like(work_mask)
    src = gray_raw

    k0 = max(21, (min(src.shape) // 18) | 1)
    if k0 % 2 == 0:
        k0 += 1
    tophat = cv2.morphologyEx(src, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k0, k0)))
    vals = tophat[(work_mask > 0) & (glare == 0)]
    if vals.size == 0:
        return conservative_default_scale(src.shape[:2], n_samples=0)

    thr = max(float(np.percentile(vals, 90.0)), float(np.median(vals) + 8.0), 6.0)
    binary = ((tophat >= thr) & (work_mask > 0) & (glare == 0)).astype(np.uint8) * 255
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))

    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if n <= 1:
        return conservative_default_scale(src.shape[:2], n_samples=0)

    areas = stats[1:, cv2.CC_STAT_AREA].astype(np.float64)
    area_img = float(np.count_nonzero(work_mask))
    lo = max(8.0, area_img * 1e-5)
    hi = area_img * 0.01
    cand_ids = np.where((areas >= lo) & (areas <= hi))[0] + 1

    radii: list[float] = []
    clean_areas: list[float] = []

    if cand_ids.size > 600:
        rng = np.random.default_rng(0)
        cand_ids = rng.choice(cand_ids, size=600, replace=False)

    for i in cand_ids:
        area = float(stats[i, cv2.CC_STAT_AREA])
        x, y, bw, bh = (
            int(stats[i, cv2.CC_STAT_LEFT]),
            int(stats[i, cv2.CC_STAT_TOP]),
            int(stats[i, cv2.CC_STAT_WIDTH]),
            int(stats[i, cv2.CC_STAT_HEIGHT]),
        )
        bbox_area = float(max(bw * bh, 1))
        if area / bbox_area < 0.55:
            continue
        aspect = max(bw, bh) / max(min(bw, bh), 1)
        if aspect > 1.55:
            continue
        r_eq = float(np.sqrt(area / np.pi))
        crop = (labels[y : y + bh, x : x + bw] == i).astype(np.uint8) * 255
        cnts, _ = cv2.findContours(crop, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            continue
        peri = float(cv2.arcLength(cnts[0], True))
        if peri <= 0:
            continue
        circ = float(4.0 * np.pi * area / (peri * peri))
        if circ < 0.78:
            continue
        hull = cv2.convexHull(cnts[0])
        hull_a = float(cv2.contourArea(hull))
        if hull_a <= 0 or area / hull_a < 0.88:
            continue
        radii.append(r_eq)
        clean_areas.append(area)

    if len(radii) < 5:
        return conservative_default_scale(src.shape[:2], n_samples=0)

    med_r, n_kept_r = _mad_trim_median(np.asarray(radii, dtype=np.float64))
    med_a, n_kept_a = _mad_trim_median(np.asarray(clean_areas, dtype=np.float64))
    n_kept = min(n_kept_r, n_kept_a, len(radii))

    med_r = float(np.clip(med_r, 2.5, min(src.shape) * 0.08))
    med_a = max(float(med_a), np.pi * med_r * med_r * 0.7)
    conf = float(np.clip(n_kept / float(MIN_CLEAN_SAMPLES), 0.0, 1.0))
    return {
        "radius": med_r,
        "area": med_a,
        "diameter": med_r * 2.0,
        "n_samples": int(n_kept),
        "confidence": conf,
        "trustworthy": n_kept >= MIN_CLEAN_SAMPLES,
    }


def conservative_default_scale(shape: tuple[int, ...], n_samples: int = 0) -> dict:
    """Deliberate default colony size — never a collapsed low-sample estimate."""
    h = int(shape[0]) if len(shape) > 0 else 512
    w = int(shape[1]) if len(shape) > 1 else h
    r = float(
        np.clip(
            min(h, w) * _CONSERVATIVE_RADIUS_FRAC,
            _CONSERVATIVE_RADIUS_MIN,
            _CONSERVATIVE_RADIUS_MAX,
        )
    )
    a = float(np.pi * r * r)
    return {
        "radius": r,
        "area": a,
        "diameter": r * 2.0,
        "n_samples": int(n_samples),
        "confidence": 0.25,
        "trustworthy": False,
        "isDefault": True,
    }


def resolve_scale_estimate(
    primary: dict | None,
    candidates: list[dict] | None = None,
    shape: tuple[int, ...] = (512, 512),
) -> dict:
    """
    Production scale for detection params.

    Prefer: trustworthy primary → any trustworthy neighbor/global →
    an already-chosen image-level default → conservative default from
    ``shape``. Never use an untrusted low-sample radius/area
    (e.g. sparse_2's r=2.5 from 13 dust/rim samples).
    """
    if primary and primary.get("trustworthy"):
        return primary

    pool = [e for e in (candidates or []) if e]
    trusted = [e for e in pool if e.get("trustworthy")]
    if trusted:
        if len(trusted) == 1:
            return trusted[0]
        return blend_estimates(trusted)

    # Reuse image-level default so tiles don't recompute from a small crop
    # (a 200px tile would yield r≈8 and re-admit dust).
    defaults = [e for e in pool if e.get("isDefault")]
    if defaults:
        return defaults[0]

    return conservative_default_scale(shape)


def _mad_trim_median(values: np.ndarray, z: float = 2.5) -> tuple[float, int]:
    """Median after rejecting points farther than z * MAD from the median."""
    if values.size == 0:
        return 0.0, 0
    med = float(np.median(values))
    mad = float(np.median(np.abs(values - med)))
    if mad < 1e-6:
        return med, int(values.size)
    keep = values[np.abs(values - med) <= z * 1.4826 * mad]
    if keep.size < max(3, values.size // 4):
        # Too aggressive — use interquartile mean instead
        q1, q3 = np.percentile(values, [25, 75])
        keep = values[(values >= q1) & (values <= q3)]
    if keep.size == 0:
        return med, 0
    return float(np.median(keep)), int(keep.size)


def scale_params(estimate: dict, scale_factor: float = 1.0) -> dict:
    """Derive CV parameters from estimatedColonySize, optionally scaled (ensemble)."""
    sf = float(scale_factor)
    r = float(estimate["radius"]) * sf
    a = float(estimate["area"]) * (sf * sf)
    diam = max(3.0, r * 2.0)

    tophat_k = int(max(9, round(diam * 2.4))) | 1
    morph_k = int(max(3, round(diam * 0.35))) | 1
    if morph_k > 7:
        morph_k = 7
    blur_k = int(max(3, round(diam * 0.45))) | 1
    if blur_k > 9:
        blur_k = 9

    min_seed_dist = max(2.0, r * 0.85)
    h_maxima = max(0.4, r * 0.12)

    return {
        "tophat_k": tophat_k,
        "morph_k": morph_k,
        "blur_k": blur_k,
        "min_seed_dist": float(min_seed_dist),
        "h_maxima": float(h_maxima),
        "min_area": float(max(6.0, a * 0.30)),
        "max_area_individual": float(a * 6.0),
        "cluster_area_min": float(a * 8.0),
        "log_sigma": float(max(1.0, r / np.sqrt(2.0))),
        "estimated_radius": float(r),
        "estimated_area": float(a),
        "scale_factor": sf,
    }


def blend_estimates(estimates: list[dict], weights: list[float] | None = None) -> dict:
    """Weighted blend of scale estimates (for neighbor / coarse-fine reconcile).

    Prefer trustworthy inputs when any exist so untrusted dust-scale samples
    cannot pull a good estimate toward r≈2–3px.
    """
    trusted = [e for e in estimates if e and e.get("trustworthy")]
    usable = trusted if trusted else [e for e in estimates if e and e.get("n_samples", 0) > 0]
    if not usable:
        return conservative_default_scale((64, 64))
    if weights is None:
        weights = [max(0.1, float(e.get("confidence") or 0.1) * max(1, e["n_samples"])) for e in usable]
    w = np.asarray(weights[: len(usable)], dtype=np.float64)
    w = w / w.sum()
    r = float(np.sum([e["radius"] * wi for e, wi in zip(usable, w)]))
    a = float(np.sum([e["area"] * wi for e, wi in zip(usable, w)]))
    n = int(sum(e["n_samples"] for e in usable))
    conf = float(np.clip(max(e.get("confidence", 0) for e in usable), 0, 1))
    return {
        "radius": r,
        "area": a,
        "diameter": r * 2.0,
        "n_samples": n,
        "confidence": conf,
        "trustworthy": any(e.get("trustworthy") for e in usable),
    }
