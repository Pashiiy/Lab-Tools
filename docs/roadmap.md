# Benchy — Roadmap

## Completed

- Unified shell + four analysis tools; Electron + Vercel web
- `.benchy` persistence, design system, docs + Cursor rules
- Phase 2 UI consistency (`lt-btn`, FileDropZone, action bars)
- Phase 3 performance (snapshots, PNG cache, blob GC, gel debounce/measure cache)
- Phase 4 batch colony (`plates[]` v2, metadata, strip UI)
- Phase 5 shared viz (`shared/viz`) + colony Batch Summary charts/CSV/JSON/PNG
- Research Project Mode MVP (Electron): `benchy-research-project` inside `.benchy`, hierarchy + qPCR Runs, embedded tools, dashboard New Project window
- Benchy rebrand: product name, `.benchy` format (imports legacy `.labtools`), package/Electron metadata, dashboard/settings/about copy
- Colony Auto Count MVP (Electron): local FastAPI + OpenCV, Auto Count / Recount, drag-to-move markers

## Backlog (optional)

- Web Worker TIFF decode; session image blob-refs; inactive-tab unmount
- New Figure Generator (rebuild from scratch)
- Broader qPCR/endpoint automated tests
- Research Mode: analysis history, multi-experiment UX polish, conflict UI beyond last-write-wins
- Bundle Python runtime with Electron installer for Auto Count

## Do not change without approval

Fiji gel formulas, ΔΔCt, endpoint categories A–I, CFU math (`cfu.js`).
