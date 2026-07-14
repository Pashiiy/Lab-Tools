#!/usr/bin/env node
/**
 * Cross-platform Colony Auto Count backend setup.
 * Creates .venv (if needed) and installs requirements.txt using the
 * platform-correct Scripts/ or bin/ layout from electron/colonyVenv.cjs.
 *
 * Usage (repo root):
 *   npm run setup:colony
 *   node scripts/setup-colony-backend.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const {
  resolveVenvPaths,
  getSystemPython,
  verifyPythonEnvironment,
  runCapture,
} = require('../electron/colonyVenv.cjs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BACKEND = join(ROOT, 'backend', 'colony_counter');
const REQUIREMENTS = join(BACKEND, 'requirements.txt');

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...opts,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!existsSync(join(BACKEND, 'main.py'))) {
    throw new Error(`Backend not found at ${BACKEND}`);
  }
  if (!existsSync(REQUIREMENTS)) {
    throw new Error(`Missing ${REQUIREMENTS}`);
  }

  mkdirSync(BACKEND, { recursive: true });

  const { python, pip, pythonRel, pipRel } = resolveVenvPaths(BACKEND);
  const sysPython = getSystemPython();

  console.log(`Platform: ${process.platform}`);
  console.log(`Venv python: ${pythonRel}`);
  console.log(`Venv pip:    ${pipRel}`);

  if (!existsSync(python)) {
    console.log('\nCreating virtualenv…');
    await run(sysPython, ['-m', 'venv', '.venv'], { cwd: BACKEND });
  } else {
    console.log('\nVirtualenv already present.');
  }

  if (!existsSync(python)) {
    throw new Error(`Expected venv python at ${python} after creation.`);
  }
  if (!existsSync(pip)) {
    // Some venvs only ship ensurepip — fall back to python -m pip
    console.log(`pip executable missing at ${pip}; using python -m pip`);
  }

  console.log('\nInstalling requirements…');
  if (existsSync(pip)) {
    await run(pip, ['install', '--upgrade', 'pip'], { cwd: BACKEND });
    await run(pip, ['install', '-r', 'requirements.txt'], { cwd: BACKEND });
  } else {
    await run(python, ['-m', 'pip', 'install', '--upgrade', 'pip'], { cwd: BACKEND });
    await run(python, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: BACKEND });
  }

  console.log('\nVerifying imports…');
  const check = await verifyPythonEnvironment(python);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  // Quick uvicorn module path check (same as spawn uses)
  const uv = await runCapture(python, ['-c', 'import uvicorn; print(uvicorn.__version__)'], {
    cwd: BACKEND,
  });
  if (uv.code !== 0) {
    throw new Error(`uvicorn import failed: ${uv.stderr || uv.stdout}`);
  }
  console.log(`uvicorn ${uv.stdout.trim()}`);

  console.log('\n✓ Colony Auto Count backend is ready.');
  console.log(`  Python: ${python}`);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message || err}`);
  process.exit(1);
});
