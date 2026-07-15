#!/usr/bin/env bash
#
# verify-win.sh — Windows installer existence / integrity gate.
#
# Confirms electron-builder produced the expected NSIS installer under
# release/ before the workflow uploads it as a release artifact.
#
# Usage:
#   bash scripts/verify-win.sh [path/to/Setup.exe]
#   npm run verify:win
#
# Exit codes:
#   0  installer found and non-empty
#   1  missing or empty installer (FAIL)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

NAME="$(
  node -p "require('${ROOT}/package.json').name || 'benchy'" 2>/dev/null || echo "benchy"
)"
VERSION="$(
  node -p "require('${ROOT}/package.json').version" 2>/dev/null || echo ""
)"

EXES=()
if [[ -n "${1:-}" ]]; then
  EXES+=("$1")
else
  # Prefer the configured artifactName pattern: ${name}-Setup-${version}.exe
  if [[ -n "$VERSION" ]]; then
    while IFS= read -r p; do
      [[ -n "$p" ]] && EXES+=("$p")
    done < <(find "$ROOT/release" -maxdepth 1 -type f \( -name "${NAME}-Setup-${VERSION}.exe" -o -iname '*Setup*.exe' \) 2>/dev/null | sort)
  fi
  if [[ ${#EXES[@]} -eq 0 ]]; then
    while IFS= read -r p; do
      [[ -n "$p" ]] && EXES+=("$p")
    done < <(find "$ROOT/release" -maxdepth 1 -type f -iname '*.exe' 2>/dev/null | sort)
  fi
fi

if [[ ${#EXES[@]} -eq 0 ]]; then
  echo "FAIL: no Windows installer (.exe) found under $ROOT/release/" >&2
  echo "      expected something like: ${NAME}-Setup-${VERSION:-<version>}.exe" >&2
  exit 1
fi

failed=0
for exe in "${EXES[@]}"; do
  echo "=============================================================="
  echo "Verifying: $exe"
  echo "=============================================================="
  if [[ ! -f "$exe" ]]; then
    echo "FAIL: not a file: $exe" >&2
    failed=1
    continue
  fi
  size="$(wc -c < "$exe" | tr -d ' ')"
  if [[ "$size" -lt 1000000 ]]; then
    echo "FAIL: installer suspiciously small (${size} bytes)" >&2
    failed=1
    continue
  fi
  echo "OK: installer present (${size} bytes)."

  # Unpackaged dir (if present) should include the frozen colony sidecar.
  unpacked_dir="$ROOT/release/win-unpacked/resources/colony_counter"
  if [[ -f "$unpacked_dir/colony_counter_service/colony_counter_service.exe" ]] || \
     [[ -f "$unpacked_dir/colony_counter_service.exe" ]]; then
    echo "OK: colony_counter_service present in win-unpacked resources."
  else
    echo "WARN: win-unpacked colony_counter_service not found (may already be cleaned); installer size check still passed."
  fi
  echo
done

if [[ $failed -ne 0 ]]; then
  echo "FAIL: Windows installer verification failed."
  exit 1
fi

echo "PASS: ${#EXES[@]} Windows installer(s) look intact."
