/**
 * Distinguish clean shutdown from crash/unexpected close.
 *
 * On a normal close/refresh we set `lab-tools-clean-exit` in sessionStorage
 * during beforeunload / Electron app-closing. If the flag is absent on the
 * next startup but a saved workspace exists, we treat it as a crash recovery.
 */

export const CLEAN_EXIT_KEY = 'lab-tools-clean-exit';

export function markCleanExit() {
  try {
    sessionStorage.setItem(CLEAN_EXIT_KEY, '1');
  } catch {
    /* sessionStorage may be unavailable in some contexts */
  }
}

export function consumeCleanExitFlag() {
  try {
    const wasClean = sessionStorage.getItem(CLEAN_EXIT_KEY) === '1';
    sessionStorage.removeItem(CLEAN_EXIT_KEY);
    return wasClean;
  } catch {
    return false;
  }
}

/** Mark an autosaved session as resulting from an unexpected shutdown. */
export function markCrashSession(project) {
  return {
    ...project,
    session: { ...project.session, reason: 'crash', crashedAt: new Date().toISOString() },
  };
}
