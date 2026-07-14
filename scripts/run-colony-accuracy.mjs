#!/usr/bin/env node
/**
 * Cross-platform accuracy harness runner.
 *   npm run test:colony-accuracy
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const {
  resolvePythonBin,
  verifyPythonEnvironment,
  missingDepsError,
} = require('../electron/colonyVenv.cjs');

const BACKEND = join(dirname(fileURLToPath(import.meta.url)), '../backend/colony_counter');

async function main() {
  if (!existsSync(join(BACKEND, 'main.py'))) {
    console.error(`Backend not found: ${BACKEND}`);
    process.exit(1);
  }
  const python = resolvePythonBin(BACKEND);
  const check = await verifyPythonEnvironment(python);
  if (!check.ok) {
    console.error(missingDepsError(BACKEND, check.reason));
    process.exit(1);
  }
  const child = spawn(python, ['-m', 'tests.accuracy_harness'], {
    cwd: BACKEND,
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
