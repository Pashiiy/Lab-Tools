#!/usr/bin/env node
/**
 * Cross-platform colony API launcher (replaces .venv/bin/uvicorn hardcode).
 *   npm run colony-api
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
const port = process.env.COLONY_PORT || '8765';

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
  const child = spawn(
    python,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: BACKEND, stdio: 'inherit', env: { ...process.env, PYTHONUNBUFFERED: '1' } }
  );
  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
