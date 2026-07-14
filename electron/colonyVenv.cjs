/**
 * Shared Colony Auto Count venv path resolution + dependency checks.
 * Used by Electron sidecar spawn and the setup script — keep platform logic here only.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/** Packages that must import cleanly before uvicorn is spawned. */
const REQUIRED_MODULES = [
  'uvicorn',
  'fastapi',
  'cv2',
  'numpy',
  'PIL',
  'skimage',
  'multipart',
];

function pathFor(platform = process.platform) {
  return platform === 'win32' ? path.win32 : path.posix;
}

/**
 * @param {string} [platform] defaults to process.platform
 * @returns {{ pythonRel: string, pipRel: string, activateHint: string }}
 */
function venvLayout(platform = process.platform) {
  const p = pathFor(platform);
  if (platform === 'win32') {
    return {
      pythonRel: p.join('.venv', 'Scripts', 'python.exe'),
      pipRel: p.join('.venv', 'Scripts', 'pip.exe'),
      activateHint: '.venv\\Scripts\\activate',
    };
  }
  return {
    pythonRel: p.join('.venv', 'bin', 'python'),
    pipRel: p.join('.venv', 'bin', 'pip'),
    activateHint: 'source .venv/bin/activate',
  };
}

/**
 * Absolute paths for a backendDir's venv executables on this (or given) platform.
 * @param {string} backendDir
 * @param {string} [platform]
 */
function resolveVenvPaths(backendDir, platform = process.platform) {
  const p = pathFor(platform);
  const layout = venvLayout(platform);
  return {
    python: p.join(backendDir, layout.pythonRel),
    pip: p.join(backendDir, layout.pipRel),
    pythonRel: layout.pythonRel,
    pipRel: layout.pipRel,
    activateHint: layout.activateHint,
    platform,
  };
}

/**
 * System Python used to create a venv when none exists.
 * @param {string} [platform]
 */
function getSystemPython(platform = process.platform) {
  return platform === 'win32' ? 'python' : 'python3';
}

/**
 * Prefer an existing platform-correct venv Python; else fall back to system Python.
 * Also accepts the other OS layout if present (e.g. checking out a shared disk),
 * but never invents a Unix path on Windows or vice versa as the primary choice.
 * @param {string} backendDir
 * @param {string} [platform]
 */
function resolvePythonBin(backendDir, platform = process.platform) {
  const primary = resolveVenvPaths(backendDir, platform);
  if (fs.existsSync(primary.python)) return primary.python;

  // Secondary: opposite layout (rare — e.g. WSL vs Windows sharing a tree)
  const other = resolveVenvPaths(backendDir, platform === 'win32' ? 'darwin' : 'win32');
  if (fs.existsSync(other.python)) return other.python;

  return getSystemPython(platform);
}

/**
 * Human-readable setup instructions with platform-correct paths.
 * @param {string} [backendDir] for display; default relative path
 * @param {string} [platform]
 */
function getSetupCommand(backendDir = 'backend/colony_counter', platform = process.platform) {
  const sys = getSystemPython(platform);
  const { pythonRel, pipRel } = resolveVenvPaths(backendDir, platform);
  if (platform === 'win32') {
    return (
      `cd ${backendDir}\n` +
      `${sys} -m venv .venv\n` +
      `${pipRel} install -r requirements.txt\n\n` +
      `Or from the repo root: npm run setup:colony`
    );
  }
  return (
    `cd ${backendDir}\n` +
    `${sys} -m venv .venv\n` +
    `${pipRel} install -r requirements.txt\n\n` +
    `Or from the repo root: npm run setup:colony`
  );
}

/**
 * Run a short command; resolve with { code, stdout, stderr }.
 */
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
 * Verify the Python executable exists and required packages import.
 * @param {string} pythonBin
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
async function verifyPythonEnvironment(pythonBin) {
  if (!pythonBin) {
    return { ok: false, reason: 'No Python executable resolved.' };
  }

  // System commands like "python3" may not be absolute paths — only check exists for paths.
  const looksLikePath = pythonBin.includes(path.sep) || pythonBin.endsWith('.exe');
  if (looksLikePath && !fs.existsSync(pythonBin)) {
    return {
      ok: false,
      reason: `Python executable not found at ${pythonBin}`,
    };
  }

  const mods = REQUIRED_MODULES.map((m) => JSON.stringify(m)).join(', ');
  const code = `
import importlib, sys
missing = []
for name in [${mods}]:
    try:
        importlib.import_module(name)
    except Exception:
        missing.append(name)
if missing:
    print("MISSING:" + ",".join(missing))
    sys.exit(2)
print("OK")
`;

  const result = await runCapture(pythonBin, ['-c', code], {
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  if (result.code === 0 && /OK/.test(result.stdout)) {
    return { ok: true };
  }

  if (result.code === 2 || /MISSING:/.test(result.stdout)) {
    const line = result.stdout.split('\n').find((l) => l.startsWith('MISSING:')) || '';
    const missing = line.replace(/^MISSING:/, '').trim() || 'required packages';
    return {
      ok: false,
      reason: `Missing Python packages in ${pythonBin}: ${missing}`,
    };
  }

  const detail = (result.stderr || result.stdout || 'unknown error').trim().slice(0, 500);
  return {
    ok: false,
    reason: `Could not run Python at ${pythonBin}: ${detail}`,
  };
}

/**
 * Error message for UI / logs when deps are missing.
 * @param {string} backendDir
 * @param {string} [detail]
 * @param {string} [platform]
 */
function missingDepsError(backendDir, detail = '', platform = process.platform) {
  const setup = getSetupCommand(backendDir, platform);
  const head =
    'Auto Count backend dependencies are missing — run setup.\n\n' +
    setup;
  return detail ? `${head}\n\nDetails: ${detail}` : head;
}

module.exports = {
  REQUIRED_MODULES,
  venvLayout,
  resolveVenvPaths,
  getSystemPython,
  resolvePythonBin,
  getSetupCommand,
  verifyPythonEnvironment,
  missingDepsError,
  runCapture,
};
