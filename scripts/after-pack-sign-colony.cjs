/**
 * electron-builder afterPack: repair PyInstaller macOS framework/symlink layout
 * and codesign the colony sidecar bottom-up BEFORE electron-builder's outer
 * app signing pass.
 *
 * Skipping this (previous behavior when CSC_IDENTITY_AUTO_DISCOVERY=false)
 * left Python.framework with broken absolute symlinks for the outer
 * `codesign --sign -` pass, which fails with:
 *   "unsealed contents present in the root directory of an embedded framework"
 */
const fs = require('fs');
const path = require('path');
const {
  prepareAndSignColonyService,
  resolveSignIdentity,
  relativizeSymlinksUnder,
  restorePythonFrameworkLayout,
  findFrameworks,
} = require('./colonyMacSign.cjs');

function resolveServiceRoot(resourcesDir) {
  const onedir = path.join(resourcesDir, 'colony_counter_service');
  const onedirExe = path.join(onedir, 'colony_counter_service');
  if (fs.existsSync(onedirExe)) return onedir;

  // onefile: single binary next to nothing to deeply sign
  const onefile = path.join(resourcesDir, 'colony_counter_service');
  if (fs.existsSync(onefile) && fs.statSync(onefile).isFile()) return null;

  return null;
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin' && context.electronPlatformName !== 'mas') {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const resources = path.join(context.appOutDir, appName, 'Contents', 'Resources', 'colony_counter');
  if (!fs.existsSync(resources)) {
    console.warn(`[afterPack] colony_counter resources missing: ${resources}`);
    return;
  }

  const serviceRoot = resolveServiceRoot(resources);
  if (!serviceRoot) {
    // onefile — just chmod + sign the single binary
    const exe = path.join(resources, 'colony_counter_service');
    if (!fs.existsSync(exe)) {
      console.warn(`[afterPack] colony_counter_service not found under ${resources}`);
      return;
    }
    try {
      fs.chmodSync(exe, 0o755);
    } catch {
      /* ignore */
    }
    const identity = resolveSignIdentity(context.packager.projectDir);
    const entitlements = path.join(context.packager.projectDir, 'build', 'entitlements.mac.plist');
    const { execFileSync } = require('child_process');
    const args = ['--force', '--sign', identity, '--timestamp'];
    if (identity !== '-') args.push('--options', 'runtime');
    if (fs.existsSync(entitlements)) args.push('--entitlements', entitlements);
    args.push(exe);
    console.log(`[afterPack] Signing onefile colony sidecar (${identity}): ${exe}`);
    execFileSync('/usr/bin/codesign', args, { stdio: 'inherit' });
    return;
  }

  const identity = resolveSignIdentity(context.packager.projectDir);
  const entitlements = path.join(context.packager.projectDir, 'build', 'entitlements.mac.plist');

  console.log(
    `[afterPack] Preparing + bottom-up codesign of colony sidecar (identity=${identity})`
  );
  console.log(`[afterPack] ${serviceRoot}`);

  // Defense in depth if electron-builder's copy flattened links again.
  relativizeSymlinksUnder(serviceRoot);
  for (const fw of findFrameworks(serviceRoot)) {
    restorePythonFrameworkLayout(fw);
  }

  prepareAndSignColonyService(serviceRoot, { identity, entitlements });
  console.log('[afterPack] Colony sidecar signed bottom-up — outer app sign can proceed.');
};
