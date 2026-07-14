#!/usr/bin/env node
/**
 * Verify colony venv helper + clean-venv setup + sidecar health.
 * Does not touch the detection pipeline.
 *
 *   node scripts/verify-colony-venv.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, rmSync, renameSync } from 'node:fs';
import { spawn } from 'node:child_process';
import http from 'node:http';

const require = createRequire(import.meta.url);
const {
  resolveVenvPaths,
  resolvePythonBin,
  getSetupCommand,
  verifyPythonEnvironment,
  missingDepsError,
} = require('../electron/colonyVenv.cjs');
const { ensureColonyService, stopColonyService, getBackendDir } =
  require('../electron/colonyCounterService.cjs');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, 'backend', 'colony_counter');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function section(title) {
  console.log(`\n══ ${title} ══`);
}

async function testPathResolution() {
  section('Path resolution (darwin / win32 / linux)');
  for (const platform of ['darwin', 'linux', 'win32']) {
    const p = resolveVenvPaths(BACKEND, platform);
    if (platform === 'win32') {
      assert(p.pythonRel === '.venv\\Scripts\\python.exe', `win pythonRel: ${p.pythonRel}`);
      assert(p.pipRel === '.venv\\Scripts\\pip.exe', `win pipRel: ${p.pipRel}`);
      assert(getSetupCommand(BACKEND, 'win32').includes('.venv\\Scripts\\pip.exe'), 'win setup mentions Scripts\\pip');
      assert(!getSetupCommand(BACKEND, 'win32').includes('.venv/bin/'), 'win setup must not use bin/');
    } else {
      assert(p.pythonRel === '.venv/bin/python', `${platform} pythonRel: ${p.pythonRel}`);
      assert(p.pipRel === '.venv/bin/pip', `${platform} pipRel: ${p.pipRel}`);
      assert(getSetupCommand(BACKEND, platform).includes('.venv/bin/pip'), `${platform} setup uses bin/pip`);
    }
    console.log(`  ✓ ${platform}: ${p.pythonRel} / ${p.pipRel}`);
  }
}

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function testCleanVenvAndSidecar() {
  section(`Clean .venv setup + sidecar (${process.platform} / ${process.arch})`);
  const venvDir = join(BACKEND, '.venv');
  const backup = join(BACKEND, `.venv.bak-verify-${Date.now()}`);
  let moved = false;

  try {
    if (existsSync(venvDir)) {
      console.log(`  Moving existing .venv → ${backup}`);
      renameSync(venvDir, backup);
      moved = true;
    }

    // Preflight without venv should fail clearly (system python likely lacks uvicorn)
    const bare = resolvePythonBin(BACKEND);
    console.log(`  Resolved python without venv: ${bare}`);
    const before = await verifyPythonEnvironment(bare);
    if (before.ok) {
      console.log('  ⚠ System Python already has deps — setup will still create a venv.');
    } else {
      console.log(`  ✓ Preflight correctly reports missing deps`);
      const msg = missingDepsError(BACKEND, before.reason);
      assert(msg.includes('Auto Count backend dependencies are missing'), 'error headline');
      assert(
        process.platform === 'win32'
          ? msg.includes('Scripts')
          : msg.includes('.venv/bin/pip'),
        'error includes platform-correct pip path'
      );
    }

    console.log('  Running npm run setup:colony …');
    await new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', 'setup:colony'], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      child.on('error', reject);
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`setup exit ${code}`))));
    });

    const { python } = resolveVenvPaths(BACKEND);
    assert(existsSync(python), `venv python exists: ${python}`);
    const after = await verifyPythonEnvironment(python);
    assert(after.ok, after.reason || 'verify after setup');
    console.log(`  ✓ Venv ready: ${python}`);

    console.log('  Starting sidecar via ensureColonyService…');
    const info = await ensureColonyService();
    assert(info.port > 0, 'got port');
    const health = await httpGet(`${info.baseUrl}/health`);
    assert(health.status === 200, `health ${health.status}`);
    assert(health.body.includes('"ok"'), `health body: ${health.body}`);
    console.log(`  ✓ Sidecar healthy on ${info.baseUrl}`);
    stopColonyService();
  } finally {
    stopColonyService();
    if (moved) {
      if (existsSync(venvDir)) {
        rmSync(venvDir, { recursive: true, force: true });
      }
      console.log('  Restoring previous .venv');
      renameSync(backup, venvDir);
    }
  }
}

async function testMacIntelPathsIfPossible() {
  section('macOS Intel path note');
  // Both Apple Silicon and Intel Mac use the Unix bin/ layout — only the
  // Python arch differs. Path helper is identical for darwin regardless of arch.
  const arm = resolveVenvPaths(BACKEND, 'darwin');
  assert(arm.pythonRel.includes(join('bin', 'python')), 'darwin uses bin/python');
  console.log(`  ✓ darwin layout (arm64 and x64 Macs): ${arm.pythonRel}`);
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    // Optional: confirm Rosetta can run an x86_64 python for a separate venv smoke.
    const check = await new Promise((resolve) => {
      const child = spawn('arch', ['-x86_64', '/usr/bin/true'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0));
    });
    if (check) {
      console.log('  ✓ Rosetta available (x64 Mac apps / x86 Python can run on this host)');
    } else {
      console.log('  ℹ Rosetta not available — skipped x86 runtime smoke');
    }
  }
}

async function main() {
  console.log(`Host: ${process.platform} ${process.arch}`);
  console.log(`Backend: ${getBackendDir()}`);
  await testPathResolution();
  await testMacIntelPathsIfPossible();
  await testCleanVenvAndSidecar();
  console.log('\nPASS — colony venv helper + setup + sidecar checks OK');
}

main().catch((err) => {
  console.error(`\nFAIL: ${err.message || err}`);
  process.exit(1);
});
