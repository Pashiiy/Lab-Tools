"""
Multi-scale tiling + ensemble parameter detection.

Accuracy over speed: coarse+fine tiles, 3 param brackets per tile, vote reconcile.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

import cv2
import numpy as np

from .scale_estimate import (
    MIN_CLEAN_SAMPLES,
    blend_estimates,
    estimate_colony_scale,
    scale_params,
)
from .segmentation import segment_colonies
from .watershed import separate_touching
from .filtering import filter_regions
from .classification import classify_colonies
from .confidence import score_and_threshold

ENSEMBLE_SCALES = (0.8, 1.0, 1.25)


@dataclass
class Tile:
    x0: int
    y0: int
    x1: int
    y1: int
    cx: float
    cy: float
    level: str  # "coarse" | "fine"


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


def _detect_once(
    g, gr, hs, gl, wm, params, ox: int, oy: int
) -> tuple[list[dict], np.ndarray, np.ndarray, np.ndarray, dict]:
    binary, bright_fill = segment_colonies(g, gl, wm, gray_raw=gr, params=params)
    labels, ws_meta = separate_touching(binary, wm, params=params, gray_raw=gr)
    pre = ws_meta.get("pre_cluster_mask")
    if bright_fill is not None and np.any(bright_fill):
        pre = bright_fill if pre is None else cv2.bitwise_or(pre, bright_fill)
        labels[bright_fill > 0] = 0
    regions, rejected_large = filter_regions(labels, wm, gl, params=params)
    classified = classify_colonies(regions, hs)
    for r, c in zip(regions, classified):
        if "mask" in r:
            c["mask"] = r["mask"]
    scored = score_and_threshold(classified, g, params=params)
    colonies = []
    for c in scored:
        colonies.append(
            {
                "x": float(c["x"] + ox),
                "y": float(c["y"] + oy),
                "radius": float(c["radius"]),
                "area": float(c["area"]),
                "circularity": c.get("circularity"),
                "confidence": float(c.get("confidence") or 0),
                "colonyType": c.get("colonyType") or "uncertain",
            }
        )
    disagree = ws_meta.get("disagreement_mask")
    return colonies, binary, pre if pre is not None else np.zeros_like(binary), rejected_large, {
        "seed_count": ws_meta.get("seed_count", 0),
        "log_count": len(ws_meta.get("log_blobs") or []),
        "disagreement": disagree,
    }


def _vote_colonies(runs: list[list[dict]]) -> tuple[list[dict], float]:
    """
    Keep detections that appear in >=2 ensemble runs (or sole run if only one).
    Returns (colonies, disagreement_ratio 0–1).
    Under-count bias: single-run detections need high confidence to survive.
    """
    if not runs:
        return [], 1.0
    if len(runs) == 1:
        return runs[0], 0.0

    buckets: dict[tuple[int, int], list[tuple[int, dict]]] = {}
    for ri, run in enumerate(runs):
        for c in run:
            key = (int(round(c["x"] / 3.0)), int(round(c["y"] / 3.0)))
            buckets.setdefault(key, []).append((ri, c))

    kept: list[dict] = []
    single_vote = 0
    for items in buckets.values():
        runs_hit = {ri for ri, _ in items}
        best = max((c for _ri, c in items), key=lambda c: c["confidence"])
        if len(runs_hit) >= 2:
            best = dict(best)
            best["confidence"] = min(1.0, best["confidence"] + 0.08)
            best["ensemble_votes"] = len(runs_hit)
            kept.append(best)
        else:
            single_vote += 1
            if best["confidence"] >= 0.72:
                best = dict(best)
                best["ensemble_votes"] = 1
                kept.append(best)

    total = max(1, len(buckets))
    disagreement = float(single_vote) / float(total)
    return kept, disagreement


def _process_tile(
    tile: Tile,
    gray: np.ndarray,
    gray_raw: np.ndarray,
    hsv: np.ndarray,
    glare: np.ndarray,
    work_mask: np.ndarray,
    global_est: dict,
    neighbor_ests: list[dict],
) -> dict:
    x0, y0, x1, y1 = tile.x0, tile.y0, tile.x1, tile.y1
    g = gray[y0:y1, x0:x1]
    gr = gray_raw[y0:y1, x0:x1]
    hs = hsv[y0:y1, x0:x1]
    gl = glare[y0:y1, x0:x1]
    wm = work_mask[y0:y1, x0:x1]

    local = estimate_colony_scale(gr, wm, gl)
    if local.get("trustworthy"):
        est = local
    elif neighbor_ests:
        est = blend_estimates([global_est, local] + neighbor_ests)
    elif global_est.get("trustworthy") or global_est.get("n_samples", 0) >= 8:
        est = blend_estimates([global_est, local])
    else:
        # Sparse-safe default
        r = float(np.clip(global_est.get("radius") or local.get("radius") or 8.0, 4.0, 14.0))
        est = {
            "radius": r,
            "area": float(np.pi * r * r),
            "diameter": r * 2.0,
            "n_samples": local.get("n_samples", 0),
            "confidence": 0.3,
            "trustworthy": False,
        }

    run_lists = []
    binary_u = np.zeros_like(wm)
    pre_u = np.zeros_like(wm)
    rej_u = np.zeros_like(wm)
    meta_flags = []

    for sf in ENSEMBLE_SCALES:
        params = scale_params(est, scale_factor=sf)
        cols, binary, pre, rej, meta = _detect_once(g, gr, hs, gl, wm, params, x0, y0)
        run_lists.append(cols)
        binary_u = cv2.bitwise_or(binary_u, binary)
        if pre is not None:
            pre_u = cv2.bitwise_or(pre_u, pre)
        if rej is not None:
            rej_u = cv2.bitwise_or(rej_u, rej)
        meta_flags.append(meta)

    colonies, disagreement = _vote_colonies(run_lists)

    # LoG vs watershed disagreement from center scale run
    log_ws_disagree = False
    for m in meta_flags:
        sc, lc = m.get("seed_count", 0), m.get("log_count", 0)
        if sc > 0 and lc > 0 and max(sc, lc) / max(min(sc, lc), 1) >= 2.0:
            log_ws_disagree = True
        if m.get("disagreement") is not None and np.any(m["disagreement"]):
            d = m["disagreement"]
            # map into tile-sized already
            if d.shape == pre_u.shape:
                pre_u = cv2.bitwise_or(pre_u, d)

    return {
        "tile": tile,
        "estimate": est,
        "colonies": colonies,
        "disagreement": disagreement,
        "log_ws_disagree": log_ws_disagree,
        "binary": binary_u,
        "pre_cluster": pre_u,
        "rejected_large": rej_u,
        "force_cluster": disagreement >= 0.45 or log_ws_disagree,
    }


def reconcile_colonies(colonies: list[dict]) -> list[dict]:
    if not colonies:
        return []
    ordered = sorted(
        colonies,
        key=lambda c: (-int(c.get("ensemble_votes") or 1), -float(c.get("confidence") or 0)),
    )
    kept: list[dict] = []
    for c in ordered:
        r = max(2.0, float(c.get("radius") or 4.0))
        ok = True
        for k in kept:
            kr = max(2.0, float(k.get("radius") or 4.0))
            lim = 0.7 * (r + kr) / 2.0
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
    stage_cb=None,
) -> dict:
    global_est = estimate_colony_scale(gray_raw, work_mask, glare)
    if stage_cb:
        stage_cb("scale", f"Global scale r={global_est['radius']:.1f} n={global_est['n_samples']}")

    coarse_tiles = make_tiles(work_mask, global_est["radius"], "coarse")
    fine_tiles = make_tiles(work_mask, global_est["radius"], "fine")

    # Coarse pass first (sequential estimates for neighbor blending)
    coarse_results = []
    for t in coarse_tiles:
        coarse_results.append(
            _process_tile(t, gray, gray_raw, hsv, glare, work_mask, global_est, [])
        )

    def nearest_coarse_ests(tile: Tile, k: int = 3) -> list[dict]:
        scored = sorted(
            coarse_results,
            key=lambda r: (r["tile"].cx - tile.cx) ** 2 + (r["tile"].cy - tile.cy) ** 2,
        )
        return [r["estimate"] for r in scored[:k]]

    # Fine pass parallel
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
            ): t
            for t in fine_tiles
        }
        for fut in as_completed(futs):
            fine_results.append(fut.result())

    all_cols: list[dict] = []
    pre = np.zeros(work_mask.shape, dtype=np.uint8)
    rej = np.zeros(work_mask.shape, dtype=np.uint8)
    binary = np.zeros(work_mask.shape, dtype=np.uint8)
    force_cluster_mask = np.zeros(work_mask.shape, dtype=np.uint8)
    param_at_tiles = []

    for r in coarse_results + fine_results:
        all_cols.extend(r["colonies"])
        y0, y1, x0, x1 = r["tile"].y0, r["tile"].y1, r["tile"].x0, r["tile"].x1
        tb = r["binary"]
        if tb.shape == (y1 - y0, x1 - x0):
            binary[y0:y1, x0:x1] = cv2.bitwise_or(binary[y0:y1, x0:x1], tb)
            pre[y0:y1, x0:x1] = cv2.bitwise_or(pre[y0:y1, x0:x1], r["pre_cluster"])
            rej[y0:y1, x0:x1] = cv2.bitwise_or(rej[y0:y1, x0:x1], r["rejected_large"])
            if r.get("force_cluster"):
                # Only large-vs-local components, not the whole tile binary
                est_a = float(r["estimate"].get("area") or 50.0)
                n0, lab0, st0, _ = cv2.connectedComponentsWithStats(tb, connectivity=8)
                tile_force = np.zeros_like(tb)
                for i in range(1, n0):
                    area = int(st0[i, cv2.CC_STAT_AREA])
                    if area >= est_a * 6.0:
                        tile_force[lab0 == i] = 255
                if np.any(tile_force):
                    force_cluster_mask[y0:y1, x0:x1] = cv2.bitwise_or(
                        force_cluster_mask[y0:y1, x0:x1], tile_force
                    )
        param_at_tiles.append((r["tile"], scale_params(r["estimate"]), r["estimate"]))

    colonies = reconcile_colonies(all_cols)

    def local_est_area(x: float, y: float) -> float:
        best = float(global_est["area"])
        best_d = 1e18
        for tile, _params, est in param_at_tiles:
            d = (x - tile.cx) ** 2 + (y - tile.cy) ** 2
            if d < best_d:
                best_d = d
                best = float(est["area"])
        return best

    # Merge force-cluster regions into pre_cluster
    pre = cv2.bitwise_or(pre, force_cluster_mask)

    return {
        "colonies": colonies,
        "binary": binary,
        "pre_cluster": pre,
        "rejected_large": rej,
        "rough_scale": global_est,
        "rough_params": scale_params(global_est),
        "local_est_area_fn": local_est_area,
        "tile_count": len(coarse_tiles) + len(fine_tiles),
        "tile_params": param_at_tiles,
        "force_cluster_mask": force_cluster_mask,
    }
