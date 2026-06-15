#!/usr/bin/env node
/**
 * validate-lockfile.mjs — fail fast on package-lock.json drift.
 *
 * package-lock.json is the single source of truth and must always satisfy
 * package.json exactly. This runs the SAME reconciliation `npm ci` performs,
 * but via `npm ci --dry-run` so it is fast and NON-DESTRUCTIVE (node_modules
 * is never touched). If the lock and package.json disagree — including nested
 * optional deps like @emnapi/* / sharp platform binaries — it exits non-zero
 * with exact fix instructions BEFORE any build or CI step proceeds.
 *
 * Usage:  node scripts/validate-lockfile.mjs   |   npm run validate:lock
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const FIX = 'Lockfile out of sync. Run `npm install` and commit the updated package-lock.json';

if (!existsSync('package-lock.json')) {
  console.error('✖ package-lock.json is missing.');
  console.error(`  → ${FIX}`);
  process.exit(1);
}

console.log('• Validating package-lock.json against package.json (npm ci --dry-run)…');

const res = spawnSync(
  'npm',
  ['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'],
  { encoding: 'utf8' },
);

if (res.status === 0) {
  console.log('✔ Lockfile is in sync — npm ci will succeed deterministically.');
  process.exit(0);
}

// Out of sync (or another ci preflight failure). Surface npm's specific
// Invalid/Missing lines so the cause (e.g. @emnapi/* drift) is obvious.
const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
const details = out
  .split('\n')
  .filter((l) => /Invalid:|Missing:|Extraneous:|can only install|EUSAGE/i.test(l))
  .map((l) => l.replace(/^npm error\s*/i, '').trim())
  .filter(Boolean);

console.error('\n✖ Lockfile drift detected — `npm ci` would FAIL.');
if (details.length) {
  console.error('\n  npm reported:');
  for (const line of details) console.error(`    • ${line}`);
}
console.error(`\n  FIX: ${FIX}`);
console.error('       (do NOT hand-edit package-lock.json)\n');
process.exit(1);
