# Benchy — Storage Schema & Protected Formulas

There is **no SQL/NoSQL database**. This document is the storage + calculation contract so assistants do not invent APIs or “improve” lab math.

For full persistence behavior, see [PERSISTENCE.md](./PERSISTENCE.md).

## Storage approach

| Platform | Metadata / KV | Binary blobs |
|----------|---------------|--------------|
| Web (Vercel) | IndexedDB `kv` | IndexedDB `blobs` |
| Electron | `userData/benchy-store.json` via IPC | IndexedDB blobs in renderer |
| Tests | In-memory Maps | In-memory Maps |

### Important KV keys

| Key | Role |
|-----|------|
| `session:current` | Live workspace autosave |
| `project:<id>` | Named projects |
| Recent lists | Recent files / recent projects for the home screen |

Schema source of truth: `src/shared/persistence/labtoolsSchema.js`  
(`format: benchy-project`, `schemaVersion: 1`)

### `.benchy` container (logical schema)

```jsonc
{
  "format": "benchy-project",
  "schemaVersion": 1,
  "metadata": { "id", "name", "appVersion", "createdAt", "lastModifiedAt" },
  "workspace": { "tabs": [{ "id", "toolId", "label" }], "activeTabId" },
  "tools": { "<tabId>": { "toolId", "stateVersion", "state": { /* tool-owned */ } } },
  "files": {},
  "settings": { "theme" },
  "session": { "savedAt", "reason" }
}
```

- Measurements and analysis results live **inside** each tool’s `state`, not as top-level tables.
- Legacy `.colonycount` files migrate into `.benchy` (see `labtoolsSchema.js`).
- Do not bump `schemaVersion` or drop fields without a migration plan and persistence tests.

## Protected formulas (do not change without explicit approval)

### 1. Gel — Fiji / Excel compatibility

**File:** `src/apps/gel-quantification/engine/fijiExcelWorkflow.js`  
**Tests:** `npm run test:gel`

```
Background = (OuterIntDen − InnerIntDen) × InnerArea / (OuterArea − InnerArea)
Corrected  = InnerIntDen − Background
Ratio      = Corrected_A / Corrected_B
```

Also preserve ROI IntDen/Mean/Area identity and BT.601 grayscale (`fijiConstants.js`). Keep `FIJI_EXCEL_COMPATIBILITY_MODE` routing intact.

### 2. qPCR — ΔΔCt / RQ

**File:** `src/apps/qpcr-insight/utils/computeDDCt.js`

```
ΔCt = meanCq(target) − meanCq(reference gene)
RQ  = 2^(−ΔCt)   (and optional ΔΔCt / fold change vs calibrator)
```

SE propagation uses replicate SD/n as implemented — do not “simplify” without approval and UI formula-panel alignment.

### 3. Endpoint — repair categories A–I

**File:** `src/apps/endpoint-analysis/constants/categories.js`

Classification maps `galcen` / `cen3` / `rearrangement` / `reciprocal` flags → HR, SSA, NHEJ, UNRERRANGED, ANEUPLOID, etc. Changing category definitions changes scientific results.

### 4. Colony CFU

**File:** `src/apps/colony-counter/utils/cfu.js`

```
CFU = count / (dilutionFactor × volumeMl)
```

### 5. Lab calculators

**File:** `src/shared/labCalculators.js`

- Dilution: `C1V1 = C2V2`
- Fixed GoTaq master-mix volumes

### 6. Strain reference

**File:** `src/shared/data/strains.json` — treat as lab reference data; update deliberately.

## Relationships (conceptual)

```
workspace.tabs[i].id  →  tools[tabId]
tools[tabId].toolId   →  registered tool in toolRegistry
files{}               →  blob refs for recent reopen (inline image migration still incomplete)
```

## What not to do

- Do not add Prisma, SQLite, Supabase, or a remote DB “for convenience.”
- Do not move gel/qPCR math into a server.
- Do not rewrite Fiji background formulas or ΔΔCt without lab approval + tests.
- Do not break `.benchy` round-trips or legacy `.colonycount` import.
