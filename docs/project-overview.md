# Benchy — Project Overview

## What it is

Benchy is a unified molecular-biology analysis platform for the Bloom Lab. It packages endpoint gel scoring, colony counting/CFU, Fiji-parity gel quantification, and QuantStudio qPCR analysis into one desktop (Electron) app and a static web/PWA build (Vercel).

## Goals

- Replace fragmented lab spreadsheets and one-off scripts with validated, reproducible tools.
- Keep Fiji/Excel gel math and ΔΔCt calculations bit-compatible with existing lab workflows.
- Persist work locally with a single `.benchy` project format (no backend, no auth, no cloud DB).
- Ship both Electron installers (macOS DMG / Windows NSIS) and a Vercel-hosted web build.

## Target users

Microbiology / DNA-repair researchers in the Bloom Lab working with petri images, gel TIFFs, QuantStudio `.eds`/`.xlsx` exports, and repair-endpoint colony classification.

## Core features

| Tool | ID | Purpose |
|------|-----|---------|
| qPCR Analysis | `qpcr-analyzer` | Parse QuantStudio `.eds`/`.xlsx`; plate/run overview, averaged Cq, ΔΔCt/RQ, time course, standard curves, Excel export. Implementation lives in `src/apps/qpcr-insight/`. |
| Gel Analysis | `gel-quantification` | Fiji-equivalent ROI measurement, box-in-box background correction, pair ratios, CSV/Excel export. |
| Endpoint Analysis | `endpoint-analysis` | Score gels, classify colonies into DNA-repair categories (HR/SSA/NHEJ/etc.), charts + Excel. |
| Colony Counter | `colony-counter` | Mark colonies on one or many dish images (batch plates), CFU calculator, per-plate metadata, session persistence. |

Cross-cutting: notepad with dilution + PCR master-mix calculators, strain reference, theme, in-app help/onboarding, unified `.benchy` save/import/export.

## Current development status

- **Version:** see `package.json` (currently 1.1.x).
- **Active tools:** four analysis tools above, registered in `src/shell/toolRegistry.js`.
- **Removed:** legacy `src/apps/qpcr-analyzer/` (superseded by qPCR Insight) and archived Figure Generator (to be rebuilt later).
- **Deploy targets:** Electron releases via GitHub Actions tags; web/PWA via Vercel (static Vite build).
- **Docs:** design system + persistence are mature; this folder is the product/architecture source of truth for AI-assisted development.

## Related docs

- [architecture.md](./architecture.md) — system structure and data flow
- [development-guide.md](./development-guide.md) — run, test, build, release
- [database-schema.md](./database-schema.md) — storage schema and protected formulas
- [design-decisions.md](./design-decisions.md) — why key choices were made
- [roadmap.md](./roadmap.md) — priorities and planned work
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — UI tokens and shell patterns
- [PERSISTENCE.md](./PERSISTENCE.md) — `.benchy` and autosave detail
