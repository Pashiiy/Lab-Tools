"""
Colony detection pipeline — classical OpenCV only.
Bias: under-count rather than over-count. Mask is required.

Robust multi-scale ensemble tiling (Part B) + cluster fallback (Part C).
Debug stages are captured from the *same* run that produces the count (Part D).
"""
from __future__ import annotations

import cv2
import numpy as np

from .masking import apply_mask, build_mask_from_spec
from .preprocessing import preprocess
from .tiling import run_tiled_detection
from .clusters import estimate_fused_clusters
from .segmentation import segment_colonies
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

    # Hold numpy snapshots during the real run; encode only if debug=True
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
    pre = tiled["pre_cluster"]
    rejected = tiled["rejected_large"]
    rough = tiled["rough_scale"]
    rough_params = tiled["rough_params"]
    local_est = tiled["local_est_area_fn"]
    force_cluster = tiled.get("force_cluster_mask")

    if debug:
        snaps["binary"] = binary.copy()
        # Morph cleanup from a representative param set (same scale as count)
        morph_bin, _ = segment_colonies(
            masked["gray"],
            masked["glare_mask"],
            masked["work_mask"],
            gray_raw=gray_raw,
            params=rough_params,
        )
        snaps["morph"] = morph_bin
        labels_vis, _meta_vis = separate_touching(
            binary, masked["work_mask"], params=rough_params, gray_raw=gray_raw
        )
        dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
        snaps["distance"] = normalize_heatmap(dist)
        seed_pts = [(int(c["y"]), int(c["x"])) for c in colonies_crop[:800]]
        snaps["seeds"] = overlay_points(normalize_heatmap(dist), seed_pts)
        snaps["watershed"] = colorize_labels(labels_vis)
        filt = masked["bgr"].copy()
        filt[rejected > 0] = (40, 40, 180)
        for c in colonies_crop:
            cv2.circle(filt, (int(c["x"]), int(c["y"])), max(2, int(c["radius"])), (80, 220, 120), 1)
        snaps["filtered"] = filt

    accepted_for_residual = [
        {"x": c["x"], "y": c["y"], "radius": c["radius"]} for c in colonies_crop
    ]

    clusters = estimate_fused_clusters(
        binary=binary,
        rejected_large=rejected,
        disagreement_mask=force_cluster,
        pre_cluster_mask=pre,
        accepted_regions=accepted_for_residual,
        hsv=masked["hsv"],
        params=rough_params,
        origin_xy=(x0, y0),
        local_est_area_fn=local_est,
    )

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
        for cl in clusters:
            pts = np.array([[int(p[0]), int(p[1])] for p in cl["contour"]], dtype=np.int32)
            if len(pts) >= 3:
                overlay = final.copy()
                cv2.fillPoly(overlay, [pts], (180, 180, 80))
                cv2.addWeighted(overlay, 0.25, final, 0.75, 0, final)
                cv2.polylines(final, [pts], True, (0, 200, 255), 2)
        snaps["final"] = final

    estimated_from_clusters = int(sum(int(c["estimatedCount"]) for c in clusters))
    individually = len(colonies)

    count_by_type = {"yeast": 0, "contaminant": 0, "uncertain": 0}
    for c in colonies:
        t = c.get("colonyType") or "uncertain"
        if t not in count_by_type:
            t = "uncertain"
            c["colonyType"] = t
        count_by_type[t] += 1
    for cl in clusters:
        t = cl.get("colonyType") or "uncertain"
        if t not in count_by_type:
            t = "uncertain"
        count_by_type[t] += int(cl["estimatedCount"])

    result = {
        "count": individually + estimated_from_clusters,
        "individuallyDetected": individually,
        "estimatedFromClusters": estimated_from_clusters,
        "countByType": count_by_type,
        "scale": {
            "estimatedRadius": rough["radius"],
            "estimatedArea": rough["area"],
            "nSamples": rough["n_samples"],
            "confidence": rough.get("confidence"),
            "tileCount": tiled["tile_count"],
        },
        "colonies": colonies,
        "clusters": clusters,
    }

    if debug:
        # Encode only now — same run as count above
        order = [
            ("masked_input", "1. Masked input"),
            ("illumination", "2. Illumination-corrected"),
            ("denoised", "3. Denoised"),
            ("glare_mask", "4. Glare / reflection mask"),
            ("binary", "5. Adaptive threshold binary"),
            ("morph", "6. Morphological cleanup"),
            ("distance", "7. Distance transform"),
            ("seeds", "8. Watershed seeds"),
            ("watershed", "9. Segmentation regions"),
            ("filtered", "10. Filtered (accepted green / rejected red)"),
            ("final", "11. Final overlay"),
        ]
        stages = []
        for key, label in order:
            img = snaps.get(key)
            if img is None:
                continue
            stages.append(encode_stage(key, label, img))
        result["stages"] = stages

    return result
