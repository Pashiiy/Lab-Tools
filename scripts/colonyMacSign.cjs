/**
 * macOS helpers for the PyInstaller colony sidecar:
 * - Preserve / restore relative symlinks (Node cpSync turns them absolute)
 * - Restore canonical Python.framework layout for codesign
 * - Bottom-up codesign of nested dylibs → frameworks → main executable
 *
 * Used by scripts/build-colony-backend.mjs and scripts/after-pack-sign-colony.cjs.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Copy a directory tree preserving relative symlinks (cp -a / rsync). */
function copyTreePreserveSymlinks(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (process.platform === 'win32') {
    // Windows: no framework signing; cpSync is fine for onedir there.
    fs.cpSync(src, dest, { recursive: true });
    return;
  }
  // Prefer rsync when available (preserves relative links); else cp -a.
  const rsync = spawnSync('rsync', ['-a', '--delete', `${src}/`, `${dest}/`], {
    encoding: 'utf8',
  });
  if (rsync.status === 0) return;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const cp = spawnSync('cp', ['-a', `${src}/.`, dest], { encoding: 'utf8' });
  if (cp.status !== 0) {
    throw new Error(`Failed to copy preserving symlinks: ${cp.stderr || rsync.stderr}`);
  }
}

/**
 * If `linkPath` is an absolute symlink whose target lies under `rootDir`,
 * rewrite it to a relative path. Returns true if rewritten.
 */
function relativizeAbsoluteSymlink(linkPath, rootDir) {
  if (!isSymlink(linkPath)) return false;
  const target = fs.readlinkSync(linkPath);
  if (!path.isAbsolute(target)) return false;

  const root = path.resolve(rootDir);
  let resolved;
  try {
    resolved = fs.realpathSync(target);
  } catch {
    // Dangling absolute link — try string rewrite if target is under a known prefix
    resolved = target;
  }

  // Prefer rewriting based on the absolute target string if it contains rootDir
  // or the sibling pyinstaller work tree that shares the same relative suffix.
  const linkDir = path.dirname(linkPath);
  let newTarget = null;

  if (resolved.startsWith(root + path.sep) || resolved === root) {
    newTarget = path.relative(linkDir, resolved);
  } else {
    // Absolute link pointing at the PyInstaller staging tree — map by basename path
    // under _internal when possible.
    const marker = `${path.sep}_internal${path.sep}`;
    const idx = target.lastIndexOf(marker);
    if (idx !== -1) {
      const suffix = target.slice(idx + 1); // "_internal/..."
      const candidate = path.join(root, suffix);
      if (fs.existsSync(candidate) || isSymlink(candidate) || true) {
        // Even if candidate doesn't exist yet, prefer relative form under this tree.
        const underRoot = path.join(root, suffix);
        newTarget = path.relative(linkDir, underRoot);
      }
    }
  }

  if (!newTarget) return false;
  fs.unlinkSync(linkPath);
  fs.symlinkSync(newTarget, linkPath);
  return true;
}

/** Walk `rootDir` and convert absolute symlinks that can be made relative. */
function relativizeSymlinksUnder(rootDir) {
  let fixed = 0;
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) {
        if (relativizeAbsoluteSymlink(full, rootDir)) fixed += 1;
      } else if (ent.isDirectory()) {
        walk(full);
      }
    }
  };
  walk(rootDir);
  return fixed;
}

/**
 * Restore canonical macOS .framework layout required by codesign:
 *   Versions/Current -> <version>
 *   Python -> Versions/Current/Python
 *   Resources -> Versions/Current/Resources
 *   Headers -> Versions/Current/Headers (if present)
 */
function restorePythonFrameworkLayout(frameworkPath) {
  if (!isDir(frameworkPath)) return false;

  const versionsDir = path.join(frameworkPath, 'Versions');
  if (!isDir(versionsDir)) return false;

  const versionNames = fs
    .readdirSync(versionsDir)
    .filter((n) => n !== 'Current' && isDir(path.join(versionsDir, n)));
  if (versionNames.length === 0) return false;

  // Prefer numeric / dotted version dirs (e.g. 3.14); fall back to first.
  versionNames.sort();
  const versionDirName = versionNames[versionNames.length - 1];
  const currentLink = path.join(versionsDir, 'Current');

  // Ensure Current is a relative symlink to the version directory.
  if (isSymlink(currentLink)) {
    const t = fs.readlinkSync(currentLink);
    if (path.isAbsolute(t) || t !== versionDirName) {
      fs.unlinkSync(currentLink);
      fs.symlinkSync(versionDirName, currentLink);
    }
  } else if (isDir(currentLink)) {
    fs.rmSync(currentLink, { recursive: true, force: true });
    fs.symlinkSync(versionDirName, currentLink);
  } else {
    fs.symlinkSync(versionDirName, currentLink);
  }

  for (const item of ['Python', 'Resources', 'Headers']) {
    const top = path.join(frameworkPath, item);
    const rel = path.join('Versions', 'Current', item);
    const versioned = path.join(versionsDir, versionDirName, item);
    if (!fs.existsSync(versioned) && !isSymlink(versioned)) continue;

    if (isSymlink(top)) {
      const t = fs.readlinkSync(top);
      if (path.isAbsolute(t) || t !== rel) {
        fs.unlinkSync(top);
        fs.symlinkSync(rel, top);
      }
    } else if (fs.existsSync(top)) {
      fs.rmSync(top, { recursive: true, force: true });
      fs.symlinkSync(rel, top);
    } else {
      fs.symlinkSync(rel, top);
    }
  }

  // Root of a framework must not contain extra regular files besides symlinks
  // and Versions/ — remove stray _CodeSignature at root if present (sign fresh).
  const rootSig = path.join(frameworkPath, '_CodeSignature');
  if (fs.existsSync(rootSig)) {
    fs.rmSync(rootSig, { recursive: true, force: true });
  }

  return true;
}

function findFrameworks(rootDir) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name.endsWith('.framework')) found.push(full);
        else walk(full);
      }
    }
  };
  walk(rootDir);
  // Innermost first (deeper paths first)
  found.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length || b.length - a.length);
  return found;
}

function listMachOFiles(rootDir) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) {
        // Skip signing framework roots here — handled separately
        if (ent.name.endsWith('.framework')) continue;
        walk(full);
      } else if (ent.isFile()) {
        // Heuristic: dylib / so / no-extension binaries inside _internal
        const name = ent.name;
        if (
          name.endsWith('.dylib') ||
          name.endsWith('.so') ||
          (!name.includes('.') && isLikelyMachO(full))
        ) {
          out.push(full);
        }
      }
    }
  };
  walk(rootDir);
  return out;
}

function isLikelyMachO(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    // MH_MAGIC_64 / CIGAM / FAT
    const n = buf.readUInt32BE(0);
    return (
      n === 0xfeedfacf ||
      n === 0xcffaedfe ||
      n === 0xfeedface ||
      n === 0xcefaedfe ||
      n === 0xcafebabe ||
      n === 0xbebafeca
    );
  } catch {
    return false;
  }
}

function removeSignature(target) {
  try {
    execFileSync('codesign', ['--remove-signature', target], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch {
    /* not signed or not signable — ignore */
  }
}

function codesign(target, { identity, entitlements, deep = false }) {
  const args = ['--force', '--sign', identity, '--timestamp'];
  if (identity !== '-') {
    args.push('--options', 'runtime');
  }
  if (deep) args.push('--deep');
  if (entitlements && fs.existsSync(entitlements)) {
    args.push('--entitlements', entitlements);
  }
  args.push(target);
  execFileSync('/usr/bin/codesign', args, { stdio: 'inherit' });
}

/**
 * Prepare + bottom-up sign the onedir colony_counter_service bundle.
 * @param {string} serviceRoot  …/colony_counter_service/ (dir containing exe + _internal)
 * @param {{ identity: string, entitlements?: string }} opts
 */
function prepareAndSignColonyService(serviceRoot, opts) {
  const identity = opts.identity || '-';
  const entitlements = opts.entitlements;

  if (!isDir(serviceRoot)) {
    throw new Error(`colony service root missing: ${serviceRoot}`);
  }

  const internal = path.join(serviceRoot, '_internal');
  if (isDir(internal)) {
    const n = relativizeSymlinksUnder(serviceRoot);
    if (n > 0) console.log(`[colony-sign] Relativized ${n} absolute symlink(s)`);

    for (const fw of findFrameworks(serviceRoot)) {
      console.log(`[colony-sign] Restoring framework layout: ${path.relative(serviceRoot, fw)}`);
      restorePythonFrameworkLayout(fw);
    }

    // Sign nested Mach-O libraries first (skip framework bundles' roots).
    const libs = listMachOFiles(internal);
    console.log(`[colony-sign] Signing ${libs.length} nested libraries…`);
    for (const lib of libs) {
      removeSignature(lib);
      try {
        codesign(lib, { identity, entitlements });
      } catch (err) {
        console.warn(`[colony-sign] warn: could not sign ${lib}: ${err.message || err}`);
      }
    }

    // Then each .framework bundle (innermost already sorted first).
    for (const fw of findFrameworks(serviceRoot)) {
      const versionPython = path.join(fw, 'Versions', 'Current', 'Python');
      if (isFile(versionPython) || isSymlink(versionPython)) {
        removeSignature(versionPython);
        codesign(versionPython, { identity, entitlements });
      }
      removeSignature(fw);
      console.log(`[colony-sign] Signing framework: ${path.basename(fw)}`);
      codesign(fw, { identity, entitlements });
    }
  }

  // Main executable last
  const exeName =
    process.platform === 'win32' ? 'colony_counter_service.exe' : 'colony_counter_service';
  const exe = path.join(serviceRoot, exeName);
  if (!fs.existsSync(exe)) {
    throw new Error(`colony executable missing: ${exe}`);
  }
  try {
    fs.chmodSync(exe, 0o755);
  } catch {
    /* ignore */
  }
  removeSignature(exe);
  console.log(`[colony-sign] Signing executable: ${exeName}`);
  codesign(exe, { identity, entitlements });
}

/**
 * Resolve the codesign identity electron-builder will use.
 * Prefer explicit CSC_NAME / CSC_IDENTITY; fall back to package.json mac.identity;
 * finally ad-hoc `-`.
 */
function resolveSignIdentity(projectDir) {
  const envId = process.env.CSC_NAME || process.env.CSC_IDENTITY;
  if (envId && envId !== 'null') return envId;

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    const id = pkg.build?.mac?.identity;
    if (id != null && id !== '') return id;
  } catch {
    /* ignore */
  }
  return '-';
}

module.exports = {
  copyTreePreserveSymlinks,
  relativizeSymlinksUnder,
  restorePythonFrameworkLayout,
  prepareAndSignColonyService,
  resolveSignIdentity,
  findFrameworks,
};
