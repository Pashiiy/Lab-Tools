# Accuracy fixtures for colony Auto Count

Put one folder per plate:

```
fixtures/
  my_plate_001/
    image.png          # or .jpg
    truth.json
```

`truth.json` example:

```json
{
  "count": 214,
  "density": "moderate",
  "mask": { "type": "ellipse", "cx": 900, "cy": 880, "rx": 720, "ry": 710 },
  "notes": "Manual count from Benchy Colony Counter"
}
```

Densities to cover: `sparse`, `moderate`, `dense`, `mixed`, plus at least one with pink/red contamination if possible.

Run harness:

```bash
cd backend/colony_counter
.venv/bin/python -m tests.accuracy_harness
```

Without real plates, the harness generates approximate synthetic cases under `_synthetic/` and will not hard-fail on them. Replace those with your manually counted plates for real regression protection.

## Save from the app

In the Benchy desktop Colony Counter (Mark Colonies view):

1. Draw a mask, then mark colonies manually (or correct auto results).
2. Stay in normal marking mode (not Mask Area / Polygon Mask).
3. Pick a density label and click **Save as Ground Truth**.

That writes `image.png` + `truth.json` into this folder using the plate sample name.
