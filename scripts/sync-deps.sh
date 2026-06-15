#!/usr/bin/env bash
#
# sync-deps.sh — authoritative dependency resync / lockfile auto-fix.
#
# Use this whenever package.json deps change or `npm run validate:lock` reports
# drift. It rebuilds node_modules and package-lock.json from scratch with a real
# `npm install` (the ONLY way to produce an npm-ci-consistent lock — note that
# `npm install --package-lock-only` does NOT fully resolve nested optional deps
# and can leave a lock that npm ci rejects), then proves the result is in sync.
#
# Usage:  bash scripts/sync-deps.sh   |   npm run sync
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "• Removing node_modules and package-lock.json…"
rm -rf node_modules package-lock.json

echo "• Reinstalling from package.json (regenerates a consistent lockfile)…"
npm install

echo "• Validating the regenerated lockfile…"
npm run validate:lock

echo "✔ Dependencies synced. Commit the updated package-lock.json."
