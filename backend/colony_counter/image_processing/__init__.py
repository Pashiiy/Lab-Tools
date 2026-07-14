"""
Colony detection pipeline — classical OpenCV only.
Bias: under-count rather than over-count. Mask is required.

Threshold-stability sweep + multi-signal candidate matching.
No fused-cluster / area-estimation fallback.
"""
from __future__ import annotations

import cv2
import numpy as np

from .masking import apply_mask, build_mask_from_spec
from .preprocessing import preprocess
from .tiling import run_tiled_detection
from .debug_stages import (
    colorize_labels,
    encode_stage,
    normalize_heatmap,
    overlay_points,
)
from .watershed import separate_touching


def count_colonies(image_bytes: bytes, mask_spec: dict, debug: bool = False) -> dict:
    if not mask_spec or not isinstance(mask_spec, dict):
        raise ValueError("A mask is required for Auto Count")

    prep = preprocess(image_bytes)
    bgr = prep["bgr"]
    h, w = bgr.shape[:2]

    full_mask = build_mask_from_spec(mask_spec, (h, w))
    if full_mask is None or int(full_mask.sum()) == 0:
        raise ValueError("Invalid or empty mask")

    masked = apply_mask(prep, full_mask)
    gray_raw = masked.get("gray_raw", masked["gray"])
    x0, y0 = masked["x0"], masked["y0"]

    snaps: dict[str, np.ndarray] = {}
    if debug:
        snaps["masked_input"] = masked["bgr"].copy()
        snaps["illumination"] = masked["gray"].copy()
        snaps["denoised"] = gray_raw.copy()
        glare_vis = masked["bgr"].copy()
        glare_vis[masked["glare_mask"] > 0] = (0, 0, 255)
        snaps["glare_mask"] = glare_vis

    tiled = run_tiled_detection(
        masked["gray"],
        gray_raw,
        masked["hsv"],
        masked["glare_mask"],
        masked["work_mask"],
    )

    colonies_crop = tiled["colonies"]
    binary = tiled["binary"]
    morph = tiled["morph"]
    stab_map = tiled["stability_map"]
    rough = tiled["rough_scale"]
    rough_params = tiled["rough_params"]

    if debug:
        snaps["binary"] = binary.copy()
        snaps["morph"] = morph.copy()
        # Stability heatmap (how often a pixel looked colony-like across thresholds)
        snaps["stability"] = cv2.applyColorMap(stab_map, cv2.COLORMAP_VIRIDIS)
        labels_vis, _ = separate_touching(
            binary, masked["work_mask"], params=rough_params, gray_raw=gray_raw
        )
        dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
        snaps["distance"] = normalize_heatmap(dist)
        seed_pts = [(int(c["y"]), int(c["x"])) for c in colonies_crop[:1200]]
        snaps["seeds"] = overlay_points(normalize_heatmap(dist), seed_pts)
        snaps["watershed"] = colorize_labels(labels_vis)
        filt = masked["bgr"].copy()
        for c in colonies_crop:
            cv2.circle(filt, (int(c["x"]), int(c["y"])), max(2, int(c["radius"])), (80, 220, 120), 1)
        snaps["filtered"] = filt

    colonies = []
    for c in colonies_crop:
        colonies.append(
            {
                "id": c["id"],
                "x": float(c["x"] + x0),
                "y": float(c["y"] + y0),
                "radius": float(c["radius"]),
                "area": float(c["area"]),
                "circularity": c.get("circularity"),
                "confidence": c.get("confidence"),
                "colonyType": c.get("colonyType") or "uncertain",
            }
        )

    if debug:
        final = prep["bgr"].copy()
        for c in colonies:
            color = {
                "yeast": (220, 220, 220),
                "contaminant": (60, 60, 220),
                "uncertain": (40, 180, 240),
            }.get(c.get("colonyType") or "yeast", (200, 200, 200))
            cv2.circle(final, (int(c["x"]), int(c["y"])), max(2, int(c["radius"])), color, 2)
        snaps["final"] = final

    individually = len(colonies)
    count_by_type = {"yeast": 0, "contaminant": 0, "uncertain": 0}
    for c in colonies:
        t = c.get("colonyType") or "uncertain"
        if t not in count_by_type:
            t = "uncertain"
            c["colonyType"] = t
        count_by_type[t] += 1

    result = {
        "count": individually,
        "individuallyDetected": individually,
        "estimatedFromClusters": 0,
        "countByType": count_by_type,
        "scale": {
            "estimatedRadius": rough["radius"],
            "estimatedArea": rough["area"],
            "nSamples": rough["n_samples"],
            "confidence": rough.get("confidence"),
            "densityMode": tiled.get("density_mode"),
            "tileCount": tiled["tile_count"],
        },
        "colonies": colonies,
        "clusters": [],
    }

    if debug:
        order = [
            ("masked_input", "1. Masked input"),
            ("illumination", "2. Illumination-corrected"),
            ("denoised", "3. Denoised"),
            ("glare_mask", "4. Glare / reflection mask"),
            ("binary", "5. Stability binary (union)"),
            ("morph", "6. Morphological cleanup (mid-threshold)"),
            ("stability", "7. Threshold-stability heatmap"),
            ("distance", "8. Distance transform"),
            ("seeds", "9. Accepted colony centers"),
            ("watershed", "10. Segmentation viz"),
            ("filtered", "11. Filtered detections"),
            ("final", "12. Final overlay"),
        ]
        stages = []
        for key, label in order:
            img = snaps.get(key)
            if img is None:
                continue
            stages.append(encode_stage(key, label, img))
        result["stages"] = stages

    return result
