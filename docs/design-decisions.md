# Benchy — Design Decisions

## Local-first, no backend / auth

**Decision:** All analysis and persistence run on-device (Electron KV + IndexedDB, or web IndexedDB). No accounts, no server API.

**Why:** Lab data stays on lab machines; offline use; simpler security and ops for a small research group.

**Tradeoffs:** No multi-user sync; web quota limits for large TIFFs; file paths cannot be restored after browser refresh.

**Alternatives considered:** Cloud sync / auth — deferred; would require a new design decision and schema work.

## Dual Electron + Vercel web

**Decision:** One Vite React codebase; Electron wraps it for desktop installers; Vercel hosts the static/PWA build.

**Why:** Researchers can use a browser quickly; power users get a native app with better file dialogs and durable KV.

**Tradeoffs:** Storage backends differ; some Electron-only UX (native dialogs). Must keep `storageBackend` platform-aware.

## Fiji / Excel gel parity over “better” math

**Decision:** Gel quantification reproduces the historical Fiji → Excel spreadsheet formulas exactly (`fijiExcelWorkflow.js`).

**Why:** Existing publications and lab notebooks depend on those numbers. Divergence would invalidate comparisons.

**Tradeoffs:** Cannot freely refactor measurement math. Changes need explicit approval and `test:gel`.

## qPCR Insight as the live qPCR tool

**Decision:** Shell tool id `qpcr-analyzer` mounts `src/apps/qpcr-insight/`. The old `src/apps/qpcr-analyzer/` tree was removed as dead code.

**Why:** Insight is the maintained UI (shell-aligned headers/tabs). Keeping two implementations caused confusion and drift.

**Tradeoffs:** Historical git history still has the legacy tree; do not recreate it without a migration plan.

## Unified `.benchy` project format

**Decision:** One versioned JSON container for every tool; tools own state under `tools[tabId].state`.

**Why:** Cross-tool workspaces, autosave, and portable export/import without per-tool file formats.

**Tradeoffs:** Large inline images in snapshots; blob-ref migration is incomplete (see PERSISTENCE limitations).

## Figure Generator removed (rebuild later)

**Decision:** Archived Figure Generator was deleted from the codebase. A new publication-figure tool will be designed from scratch later.

**Why:** The archived tool was unused in the shell and added maintenance/docs noise.

**Tradeoffs:** No in-app figure export until the replacement ships. Charting elsewhere (Recharts in analysis tools) remains.

## JSX / JavaScript, not TypeScript

**Decision:** App source is JSX/JS with ESLint; no TypeScript migration in progress.

**Why:** Matches existing codebase velocity; `@types/react` is present for editor help only.

**Tradeoffs:** Weaker compile-time guarantees. Prefer clear module boundaries and tests for critical math.

## Soft lint in CI

**Decision:** Lint may be `continue-on-error` in CI while lockfile validation is strict via husky.

**Why:** Historical lint debt should not block packaging; lockfile drift does break installs.

**Future:** Tighten lint gradually without blocking releases.
