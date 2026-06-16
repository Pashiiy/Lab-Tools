let initialized = false;
let flushFn = null;

/**
 * Register a callback that persists the current workspace before the Electron
 * window closes. Returns an unregister function. Set by the workspace session
 * orchestrator so close = autosave + continue-where-you-left-off.
 */
export function registerCloseFlush(fn) {
  flushFn = fn;
  return () => {
    if (flushFn === fn) flushFn = null;
  };
}

export function initElectronCloseHandler() {
  if (initialized || !window.electronAPI?.onClosing) return;
  initialized = true;

  window.electronAPI.onClosing(async () => {
    try {
      await flushFn?.();
    } catch {
      // Never block close on a failed autosave.
    }
    window.electronAPI.confirmClose();
  });
}
