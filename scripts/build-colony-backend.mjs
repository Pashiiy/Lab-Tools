#!/usr/bin/env node
/**
 * Freeze the Colony Auto Count FastAPI sidecar with PyInstaller.
 *
 * Output (default onedir):
 *   backend/colony_counter/dist-bin/{os}-{arch}/colony_counter_service[/…]
 *
 * electron-builder copies that folder into Resources via ${os}-${arch} macros
 * so each installer only ships its own native binary.
 *
 * Usage:
 *   npm run build:colony-backend
 *   npm run build:colony-backend -- --mode onefile
 *   npm run build:colony-backend -- --arch arm64
 *   npm run build:colony-backend -- --arch x64   # macOS: runs under Rosetta when needed
 *   npm run build:colony-backend -- --all-mac-archs
 */
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  chmodSync,
  writeFileSync,
} from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { resolveVenvPaths, getSystemPython, resolvePythonBin } = require('../electron/colonyVenv.cjs');
const { copyTreePreserveSymlinks } = require('./colonyMacSign.cjs');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, 'backend', 'colony_counter');
const SPEC = join(BACKEND, 'colony_counter.spec');
const REQUIREMENTS = join(BACKEND, 'requirements.txt');
const REQUIREMENTS_BUILD = join(BACKEND, 'requirements-build.txt');
const DIST_BIN = join(BACKEND, 'dist-bin');
const WORK = join(BACKEND, 'build', 'pyinstaller-work');

function parseArgs(argv) {
  const out = {
    mode: process.env.COLONY_PYINSTALLER_MODE || 'onedir',
    arch: null,
    allMacArchs: false,
    skipInstall: false,
    timeCompare: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode' && argv[i + 1]) out.mode = argv[++i];
    else if (a === '--arch' && argv[i + 1]) out.arch = argv[++i];
    else if (a === '--all-mac-archs') out.allMacArchs = true;
    else if (a === '--skip-install') out.skipInstall = true;
    else if (a === '--time-compare') out.timeCompare = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/build-colony-backend.mjs [options]
  --mode onedir|onefile   Bundle mode (default: onedir)
  --arch arm64|x64        Target arch (default: host)
  --all-mac-archs         Build arm64 + x64 on macOS
  --skip-install          Skip pip install of requirements / pyinstaller
  --time-compare          Build both modes and print cold-start timings`);
      process.exit(0);
    }
  }
  if (!['onedir', 'onefile'].includes(out.mode)) {
    throw new Error(`Invalid --mode ${out.mode}`);
  }
  return out;
}

/** electron-builder ${os} macro values */
function electronOs(platform = process.platform) {
  if (platform === 'darwin') return 'mac';
  if (platform === 'win32') return 'win';
  return 'linux';
}

function hostArch() {
  return process.arch === 'ia32' ? 'ia32' : process.arch === 'arm64' ? 'arm64' : 'x64';
}

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

function runCapture(command, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...opts,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: err.message });
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/**
 * Python used to freeze. For mac x64 on arm64 host, prefer an x86_64 interpreter
 * so wheels match the Electron x64 DMG.
 */
async function pythonMachine(python, prefix = []) {
  const cmd = [...prefix, python, '-c', 'import platform; print(platform.machine())'];
  const r = await runCapture(cmd[0], cmd.slice(1));
  return (r.stdout || r.stderr || '').trim();
}

async function resolveBuildPython(targetArch) {
  const wantX86 = targetArch === 'x64';
  const hostIsArmMac = process.platform === 'darwin' && process.arch === 'arm64';

  // Prefer an already-matching interpreter on PATH (e.g. setup-python architecture: x64).
  const pathPy = getSystemPython();
  const pathMachine = await pythonMachine(pathPy);
  const pathIsX86 = /x86_64|amd64|i386|i686/i.test(pathMachine);
  const pathIsArm = /arm64|aarch64/i.test(pathMachine);

  if (wantX86 && pathIsX86) {
    return { python: pathPy, prefix: hostIsArmMac ? ['arch', '-x86_64'] : [] };
  }
  if (!wantX86 && pathIsArm && targetArch === 'arm64') {
    // May still prefer project venv below
  }

  if (hostIsArmMac && wantX86) {
    const x86Venv = join(BACKEND, '.venv-x86');
    const x86Python = join(x86Venv, 'bin', 'python');
    if (!existsSync(x86Python)) {
      const candidates = [pathPy, '/usr/bin/python3', 'python3'].filter(Boolean);
      let created = false;
      for (const py of candidates) {
        const probe = await runCapture('arch', ['-x86_64', py, '--version']);
        if (probe.code !== 0) continue;
        console.log(
          `Creating x86_64 venv with ${py} (${(probe.stdout || probe.stderr).trim()})…`
        );
        mkdirSync(BACKEND, { recursive: true });
        await run('arch', ['-x86_64', py, '-m', 'venv', x86Venv], { cwd: BACKEND });
        created = true;
        break;
      }
      if (!created) {
        throw new Error(
          'Cannot build mac x64 sidecar on Apple Silicon: no x86_64 Python under Rosetta. ' +
            'Install Rosetta + an x86/universal Python, or use actions/setup-python with architecture: x64.'
        );
      }
    }
    return { python: x86Python, prefix: ['arch', '-x86_64'] };
  }

  // Prefer project venv when present and arch matches host.
  const venvPython = resolveVenvPaths(BACKEND).python;
  if (existsSync(venvPython) && targetArch === hostArch()) {
    return { python: venvPython, prefix: [] };
  }
  return { python: resolvePythonBin(BACKEND), prefix: [] };
}

async function ensureDeps(python, prefix, skipInstall) {
  if (skipInstall) return;
  const pip = [...prefix, python, '-m', 'pip'];
  await run(pip[0], [...pip.slice(1), 'install', '--upgrade', 'pip'], { cwd: BACKEND });
  await run(pip[0], [...pip.slice(1), 'install', '-r', REQUIREMENTS], { cwd: BACKEND });
  await run(pip[0], [...pip.slice(1), 'install', '-r', REQUIREMENTS_BUILD], { cwd: BACKEND });
}

function exeName() {
  return process.platform === 'win32' ? 'colony_counter_service.exe' : 'colony_counter_service';
}

function findBuiltArtifact(distRoot, mode) {
  const name = exeName();
  if (mode === 'onefile') {
    const p = join(distRoot, name);
    if (existsSync(p)) return { type: 'onefile', path: p };
    throw new Error(`onefile artifact missing: ${p}`);
  }
  const dir = join(distRoot, 'colony_counter_service');
  const nested = join(dir, name);
  if (existsSync(nested)) return { type: 'onedir', path: nested, dir };
  throw new Error(`onedir artifact missing: ${nested}`);
}

async function coldStartMs(artifactPath, mode) {
  const http = await import('node:http');
  const net = await import('node:net');
  const port = await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
    s.on('error', reject);
  });

  const t0 = Date.now();
  const child = spawn(artifactPath, ['--host', '127.0.0.1', '--port', String(port)], {
    cwd: mode === 'onedir' ? dirname(artifactPath) : BACKEND,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let err = '';
  child.stderr.on('data', (d) => {
    err += d.toString();
  });

  try {
    for (let i = 0; i < 120; i++) {
      try {
        const ok = await new Promise((resolve, reject) => {
          http
            .get(`http://127.0.0.1:${port}/health`, { timeout: 800 }, (res) => {
              let b = '';
              res.on('data', (c) => {
                b += c;
              });
              res.on('end', () => resolve(res.statusCode === 200 && b.includes('ok')));
            })
            .on('error', reject);
        });
        if (ok) return Date.now() - t0;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`health check failed: ${err.slice(-800)}`);
  } finally {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

async function buildOnce({ mode, arch, skipInstall }) {
  const targetArch = arch || hostArch();
  const osKey = electronOs();
  const outDir = join(DIST_BIN, `${osKey}-${targetArch}`);
  const stagingDist = join(WORK, 'dist', mode);
  const stagingWork = join(WORK, 'work', mode);

  console.log(`\n══ Building colony sidecar (${osKey}-${targetArch}, ${mode}) ══`);
  mkdirSync(outDir, { recursive: true });
  rmSync(stagingDist, { recursive: true, force: true });
  rmSync(stagingWork, { recursive: true, force: true });
  mkdirSync(stagingDist, { recursive: true });
  mkdirSync(stagingWork, { recursive: true });

  const { python, prefix } = await resolveBuildPython(targetArch);
  console.log(`Python: ${python}`);
  await ensureDeps(python, prefix, skipInstall);

  const env = {
    ...process.env,
    COLONY_PYINSTALLER_MODE: mode,
    PYTHONUNBUFFERED: '1',
  };

  const pyInstallerArgs = [
    ...prefix,
    python,
    '-m',
    'PyInstaller',
    '--noconfirm',
    '--clean',
    `--distpath=${stagingDist}`,
    `--workpath=${stagingWork}`,
    SPEC,
  ];
  await run(pyInstallerArgs[0], pyInstallerArgs.slice(1), { cwd: BACKEND, env });

  const artifact = findBuiltArtifact(stagingDist, mode);

  // Clear previous published layout for this os-arch
  for (const name of ['colony_counter_service', 'colony_counter_service.exe', '_internal']) {
    rmSync(join(outDir, name), { recursive: true, force: true });
  }

  if (mode === 'onefile') {
    const dest = join(outDir, exeName());
    cpSync(artifact.path, dest);
    if (process.platform !== 'win32') chmodSync(dest, 0o755);
  } else {
    const destDir = join(outDir, 'colony_counter_service');
    // CRITICAL on macOS: Node fs.cpSync rewrites relative framework/dylib
    // symlinks as absolute paths → codesign "unsealed contents" on Python.framework.
    copyTreePreserveSymlinks(artifact.dir, destDir);
    const destExe = join(destDir, exeName());
    if (process.platform !== 'win32') chmodSync(destExe, 0o755);
  }

  const meta = {
    mode,
    os: osKey,
    arch: targetArch,
    builtAt: new Date().toISOString(),
    platform: process.platform,
    hostArch: hostArch(),
    exe: mode === 'onefile' ? exeName() : join('colony_counter_service', exeName()),
  };
  writeFileSync(join(outDir, 'build-meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

  const finalExe =
    mode === 'onefile'
      ? join(outDir, exeName())
      : join(outDir, 'colony_counter_service', exeName());

  console.log(`✓ Wrote ${finalExe}`);
  return { finalExe, mode, outDir, meta };
}

async function main() {
  if (!existsSync(SPEC)) throw new Error(`Missing ${SPEC}`);
  if (!existsSync(REQUIREMENTS)) throw new Error(`Missing ${REQUIREMENTS}`);

  const args = parseArgs(process.argv.slice(2));
  mkdirSync(DIST_BIN, { recursive: true });

  if (args.timeCompare) {
    const results = [];
    for (const mode of ['onedir', 'onefile']) {
      const built = await buildOnce({
        mode,
        arch: args.arch || hostArch(),
        skipInstall: args.skipInstall && results.length > 0,
      });
      const ms = await coldStartMs(built.finalExe, mode);
      results.push({ mode, ms, path: built.finalExe });
      console.log(`Cold start (${mode}): ${ms} ms`);
    }
    const winner = results.reduce((a, b) => (a.ms <= b.ms ? a : b));
    writeFileSync(
      join(DIST_BIN, 'startup-compare.json'),
      `${JSON.stringify({ results, winner: winner.mode, measuredAt: new Date().toISOString() }, null, 2)}\n`
    );
    console.log(`\nRecommended mode (faster cold start): ${winner.mode}`);
    // Rebuild preferred mode into the published slot if onedir didn't win and we want default out.
    if (winner.mode !== 'onedir') {
      console.log('Rebuilding default publish layout with winning mode…');
      await buildOnce({ mode: winner.mode, arch: args.arch || hostArch(), skipInstall: true });
    }
    return;
  }

  const arches =
    args.allMacArchs && process.platform === 'darwin'
      ? ['arm64', 'x64']
      : [args.arch || hostArch()];

  for (const arch of arches) {
    await buildOnce({ mode: args.mode, arch, skipInstall: args.skipInstall });
  }

  console.log('\n✓ Colony backend freeze complete.');
  console.log(`  Artifacts under ${DIST_BIN}`);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message || err}`);
  process.exit(1);
});
