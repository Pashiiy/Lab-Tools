#!/usr/bin/env bash
#
# verify-mac.sh — macOS Electron build integrity safety gate.
#
# Validates a packaged "Lab Tools.app" bundle (from electron-builder output
# or mounted inside a DMG) BEFORE it is published to a GitHub Release.
#
# Usage:
#   bash scripts/verify-mac.sh [path/to/Some.app]
#   npm run verify:mac
#
# If no path is given, the newest "Lab Tools.app" under release/ is used.
#
# Exit codes:
#   0  signature is valid (Gatekeeper rejection alone is tolerated for
#      unsigned / ad-hoc builds without notarization)
#   1  invalid signature, missing resources, or broken bundle (FAIL)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Collect the bundle(s) to verify. With an explicit path, verify just that
# bundle; otherwise verify EVERY "Lab Tools.app" under release/ (CI builds
# both arm64 and x64, so there can be more than one).
APPS=()
if [[ -n "${1:-}" ]]; then
  APPS+=("$1")
else
  while IFS= read -r p; do
    [[ -n "$p" ]] && APPS+=("$p")
  done < <(find "$ROOT/release" -maxdepth 3 -path '*/Lab Tools.app' 2>/dev/null)
fi

if [[ ${#APPS[@]} -eq 0 ]]; then
  echo "FAIL: no .app bundle found (pass a path as the first argument)" >&2
  echo "      searched: $ROOT/release/**/Lab Tools.app" >&2
  exit 1
fi

# verify_one <app-path> -> 0 = valid, 1 = FAIL
verify_one() {
  local APP_PATH="$1"

  if [[ ! -d "$APP_PATH" ]]; then
    echo "FAIL: not a bundle directory: $APP_PATH" >&2
    return 1
  fi

  echo "=============================================================="
  echo "Verifying: $APP_PATH"
  echo "=============================================================="

  # 1) Strict signature integrity check. Any non-zero exit is a hard FAIL.
  echo
  echo ">> codesign --verify --deep --strict"
  local verify_out verify_rc
  verify_out="$(codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1)" && verify_rc=0 || verify_rc=$?
  echo "$verify_out"

  if [[ $verify_rc -ne 0 ]]; then
    echo
    if echo "$verify_out" | grep -qiE 'no resources but signature indicates|resource envelope is obsolete|a sealed resource is missing or invalid'; then
      echo "FAIL: broken bundle — sealed/linker signature is inconsistent with bundle contents."
      echo "      This is the classic 'app is damaged' state. Do NOT publish."
    else
      echo "FAIL: invalid code signature (codesign --verify exited $verify_rc)."
    fi
    return 1
  fi
  echo "OK: codesign --verify --deep --strict passed."

  # 2) Signature detail dump (debugging / provenance in CI logs).
  echo
  echo ">> codesign -dv --verbose=4"
  codesign -dv --verbose=4 "$APP_PATH" 2>&1 || true

  # 3) Gatekeeper assessment (informational only). spctl rejection is EXPECTED
  #    for unsigned / ad-hoc builds that are not notarized, and must NOT fail.
  echo
  echo ">> spctl -a -vv (informational)"
  local spctl_out
  spctl_out="$(spctl -a -vv "$APP_PATH" 2>&1)" || true
  echo "$spctl_out"
  if echo "$spctl_out" | grep -qi 'rejected'; then
    echo "INFO: Gatekeeper rejected (expected for ad-hoc / unsigned, un-notarized builds)."
  else
    echo "INFO: Gatekeeper accepted."
  fi
  echo
  return 0
}

failed=0
for app in "${APPS[@]}"; do
  if ! verify_one "$app"; then
    failed=1
  fi
done

if [[ $failed -ne 0 ]]; then
  echo "=============================================================="
  echo "FAIL: one or more bundles have an invalid signature — NOT safe to publish."
  echo "=============================================================="
  exit 1
fi

echo "=============================================================="
echo "PASS: all ${#APPS[@]} bundle(s) signature-consistent — safe to package/publish."
echo "=============================================================="
