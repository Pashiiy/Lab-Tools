const STORAGE_KEY = 'lab-tools-onboarding-v1';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

/**
 * @param {string} toolId
 */
export function getToolOnboardingState(toolId) {
  return readAll()[toolId] ?? {};
}

/**
 * @param {string} toolId
 * @param {Record<string, unknown>} patch
 */
export function patchToolOnboardingState(toolId, patch) {
  const all = readAll();
  all[toolId] = { ...all[toolId], ...patch };
  writeAll(all);
  return all[toolId];
}

export function resetToolOnboarding(toolId) {
  const all = readAll();
  delete all[toolId];
  writeAll(all);
}
