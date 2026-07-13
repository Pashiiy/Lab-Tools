/**
 * Detect launch mode for Electron multi-window.
 * Research windows load with ?mode=research&projectId=...
 */
export function getLaunchMode() {
  if (typeof window === 'undefined') {
    return { mode: 'dashboard', projectId: null };
  }
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') === 'research' ? 'research' : 'dashboard';
  return { mode, projectId: params.get('projectId') };
}

export function isElectronApp() {
  return typeof window !== 'undefined' && Boolean(window.isElectron);
}
