"""
Multi-scale tiling + stability detection + candidate matching.

No fused-cluster / area estimation. Ambiguous merges are dropped (under-count).
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

import cv2
import numpy as np

from .scale_estimate import estimate_colony_scale, resolve_scale_estimate, scale_params
from .stability import stability_detect
from .candidates import extract_component_mask, split_merged_region
from .classification import classify_colonies
from .confidence import score_and_threshold


@dataclass
class Tile:
    x0: int
    y0: int
    x1: int
    y1: int
    cx: float
    cy: float
    level: str


def make_tiles(work_mask: np.ndarray, rough_radius: float, level: str) -> list[Tile]:
    h, w = work_mask.shape[:2]
    if level == "coarse":
        side = int(np.clip(rough_radius * 48, 280, 640))
        step_frac = 0.55
    else:
        side = int(np.clip(rough_radius * 24, 140, 360))
        step_frac = 0.6
    step = max(64, int(side * step_frac))
    tiles: list[Tile] = []
    for y0 in range(0, max(h, 1), step):
        for x0 in range(0, max(w, 1), step):
            x1 = min(w, x0 + side)
            y1 = min(h, y0 + side)
            if x1 - x0 < side * 0.45 or y1 - y0 < side * 0.45:
                x0b = max(0, x1 - side)
                y0b = max(0, y1 - side)
                x0, y0 = x0b, y0b
            patch = work_mask[y0:y1, x0:x1]
            if np.count_nonzero(patch) < 60:
                continue
            tiles.append(Tile(x0, y0, x1, y1, (x0 + x1) / 2.0, (y0 + y1) / 2.0, level))
    if not tiles:
        tiles.append(Tile(0, 0, w, h, w / 2.0, h / 2.0, level))
    return tiles


def _infer_density_mode(est: dict, work_mask: np.ndarray, n_stable_hint: int = 0) -> str:
    """Rough density class for filter strictness — sparse gets more conservative."""
    area = float(np.count_nonzero(work_mask))
    colony_a = max(float(est.get("area") or 50.0), 1.0)
    # Expected capacity of the mask if packed
    capacity = max(1.0, area / (colony_a * 4.0))
    n = max(int(est.get("n_samples") or 0), n_stable_hint)
    # Use samples vs capacity: low fill → sparse
    fill = n / capacity
    # Dense by count first — high-n plates can have low fill vs packing capacity
    if n > 400 or fill > 0.35:
        return "dense"
    if fill < 0.08 or n < 40:
        return "sparse"
    return "moderate"


def _process_tile(
    tile: Tile,
    gray: np.ndarray,
    gray_raw: np.ndarray,
    hsv: np.ndarray,
    glare: np.ndarray,
    work_mask: np.ndarray,
    global_est: dict,
    neighbor_ests: list[dict],
    global_density: str,
    global_fill: float = 0.25,
) -> dict:
    x0, y0, x1, y1 = tile.x0, tile.y0, tile.x1, tile.y1
    gr = gray_raw[y0:y1, x0:x1]
    g = gray[y0:y1, x0:x1]
    hs = hsv[y0:y1, x0:x1]
    gl = glare[y0:y1, x0:x1]
    wm = work_mask[y0:y1, x0:x1]

    local = estimate_colony_scale(gr, wm, gl)
    # Never consume untrusted radii (e.g. r=2.5 from rim dust) — resolve falls
    # back to trustworthy neighbors/global, else a conservative default.
    est = resolve_scale_estimate(
        local,
        candidates=[global_est] + list(neighbor_ests or []),
        shape=gr.shape[:2],
    )

    density = global_density
    # Locally sparse pocket inside a dense plate → still be a bit careful
    local_density = _infer_density_mode(est, wm)
    if local_density == "sparse" and density != "sparse":
        density = "moderate"  # don't go full sparse filters on a small empty tile of a dense dish

    params = scale_params(est)
    params["density_mode"] = density
    params["fill_ratio"] = float(global_fill)
    params["max_area_keep"] = float(est["area"] * 80.0)

    stable, binary_u, morph, stab_map = stability_detect(gr, gl, wm, params=params)

    # Build binary for component extraction around stable centers
    regions_out: list[dict] = []
    for s in stable:
        sx, sy = float(s["x"]), float(s["y"])
        if s.get("needs_split"):
            comp = extract_component_mask(binary_u, sx, sy, search_r=max(s["radius"] * 2.5, 8.0))
            if comp is None:
                continue
            parts = split_merged_region(comp, gr, params=params)
            for part in parts:
                regions_out.append(part)
        else:
            regions_out.append(
                {
                    "x": sx,
                    "y": sy,
                    "radius": float(s["radius"]),
                    "area": float(s["area"]),
                    "circularity": float(s.get("circularity") or 0.7),
                    "solidity": float(s.get("solidity") or 0.8),
                    "stability": float(s.get("stability") or 0),
                }
            )

    # Build tiny masks for classification color sampling (disk approx)
    for r in regions_out:
        mask = np.zeros(wm.shape, dtype=np.uint8)
        rad = max(2, int(round(r["radius"])))
        cv2.circle(mask, (int(round(r["x"])), int(round(r["y"]))), rad, 255, -1)
        mask[wm == 0] = 0
        r["mask"] = mask

    classified = classify_colonies(regions_out, hs)
    for r, c in zip(regions_out, classified):
        if "mask" in r:
            c["mask"] = r["mask"]
        c["stability"] = r.get("stability")
        c["solidity"] = r.get("solidity")

    scored = score_and_threshold(classified, g, params={**params, "density_mode": density})

    colonies = []
    for c in scored:
        colonies.append(
            {
                "x": float(c["x"] + x0),
                "y": float(c["y"] + y0),
                "radius": float(c["radius"]),
                "area": float(c["area"]),
                "circularity": c.get("circularity"),
                "confidence": float(c.get("confidence") or 0),
                "colonyType": c.get("colonyType") or "uncertain",
            }
        )

    return {
        "tile": tile,
        "estimate": est,
        "colonies": colonies,
        "binary": binary_u,
        "morph": morph,
        "stability_map": stab_map,
    }


def reconcile_colonies(colonies: list[dict]) -> list[dict]:
    if not colonies:
        return []
    ordered = sorted(colonies, key=lambda c: -float(c.get("confidence") or 0))
    kept: list[dict] = []
    for c in ordered:
        r = max(2.0, float(c.get("radius") or 4.0))
        ok = True
        for k in kept:
            kr = max(2.0, float(k.get("radius") or 4.0))
            lim = 0.75 * (r + kr) / 2.0
            if (c["x"] - k["x"]) ** 2 + (c["y"] - k["y"]) ** 2 < lim * lim:
                ok = False
                break
        if ok:
            kept.append(c)
    for i, c in enumerate(kept, start=1):
        c["id"] = i
    return kept


def run_tiled_detection(
    gray: np.ndarray,
    gray_raw: np.ndarray,
    hsv: np.ndarray,
    glare: np.ndarray,
    work_mask: np.ndarray,
    max_workers: int = 4,
) -> dict:
    raw_global = estimate_colony_scale(gray_raw, work_mask, glare)
    global_est = resolve_scale_estimate(raw_global, candidates=[], shape=gray_raw.shape[:2])
    global_density = _infer_density_mode(global_est, work_mask)
    colony_a = max(float(global_est.get("area") or 50.0), 1.0)
    capacity = max(1.0, float(np.count_nonzero(work_mask)) / (colony_a * 4.0))
    # Prefer raw sample count for fill (default scale has n_samples=0)
    n_for_fill = max(int(raw_global.get("n_samples") or 0), int(global_est.get("n_samples") or 0))
    global_fill = float(n_for_fill / capacity) if capacity > 0 else 0.0

    coarse_tiles = make_tiles(work_mask, global_est["radius"], "coarse")
    fine_tiles = make_tiles(work_mask, global_est["radius"], "fine")

    coarse_results = [
        _process_tile(
            t, gray, gray_raw, hsv, glare, work_mask, global_est, [], global_density, global_fill
        )
        for t in coarse_tiles
    ]

    def nearest_coarse_ests(tile: Tile, k: int = 3) -> list[dict]:
        scored = sorted(
            coarse_results,
            key=lambda r: (r["tile"].cx - tile.cx) ** 2 + (r["tile"].cy - tile.cy) ** 2,
        )
        return [r["estimate"] for r in scored[:k]]

    fine_results = []
    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = {
            ex.submit(
                _process_tile,
                t,
                gray,
                gray_raw,
                hsv,
                glare,
                work_mask,
                global_est,
                nearest_coarse_ests(t),
                global_density,
                global_fill,
            ): t
            for t in fine_tiles
        }
        for fut in as_completed(futs):
            fine_results.append(fut.result())

    all_cols: list[dict] = []
    binary = np.zeros(work_mask.shape, dtype=np.uint8)
    morph = np.zeros(work_mask.shape, dtype=np.uint8)
    stab = np.zeros(work_mask.shape, dtype=np.uint8)

    for r in coarse_results + fine_results:
        all_cols.extend(r["colonies"])
        y0, y1, x0, x1 = r["tile"].y0, r["tile"].y1, r["tile"].x0, r["tile"].x1
        for src, dst in (
            (r["binary"], binary),
            (r["morph"], morph),
            (r["stability_map"], stab),
        ):
            if src is not None and src.shape == (y1 - y0, x1 - x0):
                if dst is stab:
                    dst[y0:y1, x0:x1] = np.maximum(dst[y0:y1, x0:x1], src)
                else:
                    dst[y0:y1, x0:x1] = cv2.bitwise_or(dst[y0:y1, x0:x1], src)

    colonies = reconcile_colonies(all_cols)

    return {
        "colonies": colonies,
        "binary": binary,
        "morph": morph,
        "stability_map": stab,
        "rough_scale": global_est,
        "rough_params": scale_params(global_est),
        "density_mode": global_density,
        "tile_count": len(coarse_tiles) + len(fine_tiles),
    }
