# Benchy

Scientific Image Analysis & Research Workspace for the Bloom Lab — endpoint scoring, colony CFU, Fiji-parity gel quantification, and QuantStudio qPCR — as an Electron desktop app and a Vercel-hosted web/PWA.

## Quick start

```bash
npm install
npm run dev            # web (Vite)
npm run electron:dev   # desktop
npm test               # gel + persistence tests
```

Requirements: Node `>=22.9.0`, npm `>=11`.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/project-overview.md](docs/project-overview.md) | What the app is, users, features |
| [docs/architecture.md](docs/architecture.md) | Shell, tools, Electron, data flow |
| [docs/development-guide.md](docs/development-guide.md) | Run, build, test, release, Vercel |
| [docs/database-schema.md](docs/database-schema.md) | Storage schema + protected formulas |
| [docs/design-decisions.md](docs/design-decisions.md) | Why key choices were made |
| [docs/roadmap.md](docs/roadmap.md) | Priorities and planned work |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | UI tokens and components |
| [docs/PERSISTENCE.md](docs/PERSISTENCE.md) | `.benchy` and autosave |

## Active tools

- **qPCR Analysis** — `src/apps/qpcr-insight/` (tool id `qpcr-analyzer`)
- **Gel Analysis** — `src/apps/gel-quantification/`
- **Endpoint Analysis** — `src/apps/endpoint-analysis/`
- **Colony Counter** — `src/apps/colony-counter/`

## Important

Do not change Fiji gel formulas, ΔΔCt math, endpoint category tables, or CFU calculations without explicit approval and tests. See [docs/database-schema.md](docs/database-schema.md).

## License / repo

See repository metadata in `package.json`.
