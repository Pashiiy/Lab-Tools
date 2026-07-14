#!/usr/bin/env python3
"""
Accuracy regression harness for colony Auto Count.

Place ground-truth plates under:
  backend/colony_counter/tests/fixtures/
    <name>/
      image.png|jpg
      truth.json   # { "count": N, "mask": {...}, "density": "sparse|moderate|dense|mixed", "notes": "" }

Run:
  cd backend/colony_counter
  .venv/bin/python -m tests.accuracy_harness

If fixtures are missing, the harness reports that and exits 0 with a notice
(so CI doesn't fail until you add plates). With fixtures, fails on over-count
or absolute error beyond tolerance.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from image_processing import count_colonies  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures"
# Allow slightly under-counting; over-counting is flagged harder
TOL_UNDER = 0.12  # 12% under OK
TOL_OVER = 0.05  # 5% over max


def load_fixture(folder: Path) -> dict | None:
    truth_path = folder / "truth.json"
    if not truth_path.exists():
        return None
    truth = json.loads(truth_path.read_text())
    img_path = None
    for name in ("image.png", "image.jpg", "image.jpeg", "plate.png", "plate.jpg"):
        p = folder / name
        if p.exists():
            img_path = p
            break
    if img_path is None:
        for p in folder.glob("*.png"):
            img_path = p
            break
        if img_path is None:
            for p in folder.glob("*.jpg"):
                img_path = p
                break
    if img_path is None:
        return None
    return {"folder": folder, "truth": truth, "image": img_path}


def synthesize_demo_fixtures(out: Path) -> None:
    """Create synthetic sparse/dense/mixed fixtures for smoke runs when no real GT exists."""
    out.mkdir(parents=True, exist_ok=True)

    def write_case(name: str, density: str, n: int, fused: bool = False):
        d = out / name
        d.mkdir(exist_ok=True)
        size = 700
        img = np.zeros((size, size, 3), dtype=np.uint8)
        img[:] = (40, 90, 60)
        cv2.circle(img, (size // 2, size // 2), size // 2 - 30, (35, 80, 55), -1)
        rng = np.random.default_rng(abs(hash(name)) % (2**32))
        cx = cy = size // 2
        R = size // 2 - 50
        for _ in range(n):
            ang = rng.uniform(0, 2 * np.pi)
            rad = R * np.sqrt(rng.uniform(0, 1))
            x = int(cx + rad * np.cos(ang))
            y = int(cy + rad * np.sin(ang))
            cv2.circle(img, (x, y), 5 if density != "dense" else 4, (240, 240, 240), -1)
        if fused:
            cv2.ellipse(img, (cx, cy), (55, 45), 0, 0, 360, (235, 235, 235), -1)
        cv2.imwrite(str(d / "image.png"), img)
        # Truth count for synthetic is approximate — used as soft smoke, not hard GT
        truth = {
            "count": n + (40 if fused else 0),
            "countIsApproximate": True,
            "density": density,
            "mask": {"type": "ellipse", "cx": cx, "cy": cy, "rx": R + 10, "ry": R + 10},
            "notes": "Synthetic fixture — replace with manually counted plates",
        }
        (d / "truth.json").write_text(json.dumps(truth, indent=2))

    write_case("synthetic_sparse", "sparse", 35)
    write_case("synthetic_moderate", "moderate", 180)
    write_case("synthetic_dense", "dense", 450)
    write_case("synthetic_mixed", "mixed", 120, fused=True)


def evaluate(fixture: dict) -> dict:
    truth = fixture["truth"]
    gt = int(truth["count"])
    mask = truth["mask"]
    data = fixture["image"].read_bytes()
    t0 = time.time()
    result = count_colonies(data, mask, debug=False)
    dt = time.time() - t0
    auto = int(result["count"])
    err = auto - gt
    pct = (err / gt * 100.0) if gt else 0.0
    over = err > 0
    approx = bool(truth.get("countIsApproximate"))
    return {
        "name": fixture["folder"].name,
        "density": truth.get("density", "?"),
        "gt": gt,
        "auto": auto,
        "indiv": result.get("individuallyDetected"),
        "clusters": result.get("estimatedFromClusters") or 0,
        "err": err,
        "pct": pct,
        "over": over,
        "approx": approx,
        "seconds": dt,
        "byType": result.get("countByType"),
    }


def main() -> int:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    cases = []
    for child in sorted(FIXTURES.iterdir()):
        if child.is_dir():
            fx = load_fixture(child)
            if fx:
                cases.append(fx)

    if not cases:
        print("No ground-truth fixtures found under", FIXTURES)
        print("Generating synthetic smoke fixtures (approximate counts)…")
        synthesize_demo_fixtures(FIXTURES / "_synthetic")
        for child in sorted((FIXTURES / "_synthetic").iterdir()):
            if child.is_dir():
                fx = load_fixture(child)
                if fx:
                    cases.append(fx)
        print(
            "\nNOTE: Please add manually counted plates (image + truth.json) under\n"
            f"  {FIXTURES}\n"
            "so the harness can catch real regressions. Synthetic cases are approximate only.\n"
        )

    print(f"{'name':28} {'dens':8} {'gt':>5} {'auto':>5} {'err':>5} {'pct':>7} {'flag':10} {'s':>5}")
    print("-" * 80)
    hard_fail = False
    for fx in cases:
        row = evaluate(fx)
        flag = ""
        if row["over"] and not row["approx"]:
            if abs(row["pct"]) > TOL_OVER * 100:
                flag = "OVER✗"
                hard_fail = True
            else:
                flag = "over~"
        elif not row["approx"] and row["err"] < 0 and abs(row["pct"]) > TOL_UNDER * 100:
            flag = "UNDER✗"
            hard_fail = True
        elif row["approx"]:
            flag = "synth"
        else:
            flag = "ok"
        print(
            f"{row['name'][:28]:28} {row['density'][:8]:8} {row['gt']:5d} {row['auto']:5d} "
            f"{row['err']:+5d} {row['pct']:+6.1f}% {flag:10} {row['seconds']:5.2f}"
        )

    print("-" * 80)
    real = [c for c in cases if not bool(c["truth"].get("countIsApproximate"))]
    synth = [c for c in cases if bool(c["truth"].get("countIsApproximate"))]
    if not real:
        print(
            "\n*** NO REAL GROUND TRUTH ***\n"
            "Only synthetic/approximate fixtures ran. Numbers above are smoke checks only.\n"
            "Add manually counted plates via the desktop app (Save as Ground Truth), or place:\n"
            f"  {FIXTURES}/<plate-name>/image.png + truth.json\n"
            "Need at least: 1–2 sparse, 1–2 moderate, 1–2 dense, 1 mixed (+ contamination if you care).\n"
            "truth.json: { \"count\": N, \"mask\": {...}, \"density\": \"sparse|moderate|dense|mixed\" }\n"
        )
    if hard_fail:
        print("FAILED: regression beyond tolerance on one or more real fixtures")
        return 1
    if real:
        print(f"PASS — {len(real)} real fixture(s) within tolerance")
    else:
        print(f"PASS (synthetic-only smoke, {len(synth)} cases) — add real GT before trusting accuracy")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
