"""
Colony detection pipeline — classical OpenCV only.
Bias: under-count rather than over-count. Mask is required.
"""
from __future__ import annotations

from .masking import apply_mask, build_mask_from_spec
from .preprocessing import preprocess
from .segmentation import segment_colonies
from .watershed import separate_touching
from .filtering import filter_regions
from .classification import classify_colonies
from .confidence import score_and_threshold


def count_colonies(image_bytes: bytes, mask_spec: dict) -> dict:
    """
    Run detection inside an explicit user mask.

    mask_spec:
      { "type": "ellipse", "cx": float, "cy": float, "rx": float, "ry": float }
      { "type": "polygon", "points": [{"x": float, "y": float}, ...] }
    """
    if not mask_spec or not isinstance(mask_spec, dict):
        raise ValueError("A mask is required for Auto Count")

    prep = preprocess(image_bytes)
    bgr = prep["bgr"]
    h, w = bgr.shape[:2]

    full_mask = build_mask_from_spec(mask_spec, (h, w))
    if full_mask is None or int(full_mask.sum()) == 0:
        raise ValueError("Invalid or empty mask")

    # Crop to mask bbox for speed; keep offsets for coordinate remap
    masked = apply_mask(prep, full_mask)

    binary = segment_colonies(
        masked["gray"],
        masked["glare_mask"],
        masked["work_mask"],
        gray_raw=masked.get("gray_raw"),
    )
    labels = separate_touching(binary, masked["work_mask"])
    regions = filter_regions(
        labels,
        work_mask=masked["work_mask"],
        glare_mask=masked["glare_mask"],
        origin=(masked["x0"], masked["y0"]),
    )
    classified = classify_colonies(regions, masked["hsv"], origin=(masked["x0"], masked["y0"]))
    colonies = score_and_threshold(classified, masked["gray"], origin=(masked["x0"], masked["y0"]))

    # Remap crop coords → full image
    x0, y0 = masked["x0"], masked["y0"]
    for c in colonies:
        c["x"] = float(c["x"] + x0)
        c["y"] = float(c["y"] + y0)

    count_by_type = {"yeast": 0, "contaminant": 0, "uncertain": 0}
    for c in colonies:
        t = c.get("colonyType") or "uncertain"
        if t not in count_by_type:
            t = "uncertain"
            c["colonyType"] = t
        count_by_type[t] += 1

    return {
        "count": len(colonies),
        "countByType": count_by_type,
        "colonies": colonies,
    }
