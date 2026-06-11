import { hasAnyDirtyInstance } from './dirtyStateRegistry';

let initialized = false;

export function initElectronCloseHandler() {
  if (initialized || !window.electronAPI?.onClosing) return;
  initialized = true;

  window.electronAPI.onClosing(() => {
    if (hasAnyDirtyInstance()) {
      const confirmed = window.confirm(
        'You have unsaved changes. Close without saving?'
      );
      if (confirmed) window.electronAPI.confirmClose();
      else window.electronAPI.cancelClose();
    } else {
      window.electronAPI.confirmClose();
    }
  });
}
