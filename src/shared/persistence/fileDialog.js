/**
 * Platform-aware text file save/open for `.labtools` projects.
 *
 * Electron → native save/open dialogs over IPC (window.electronAPI.project*).
 * Web      → blob download + hidden <input type=file> read.
 */

export async function downloadText(text, filename) {
  if (typeof window !== 'undefined' && window.electronAPI?.saveProjectFile) {
    const defaultName = filename.replace(/\.[^.]+$/, '');
    const res = await window.electronAPI.saveProjectFile(defaultName, text);
    return !!res?.success;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * @param {string[]} acceptExtensions e.g. ['.labtools', '.json']
 * @returns {Promise<string|null>} file text, or null if cancelled
 */
export async function pickTextFile(acceptExtensions = ['.labtools']) {
  if (typeof window !== 'undefined' && window.electronAPI?.openProjectFile) {
    const res = await window.electronAPI.openProjectFile();
    return res?.success ? res.content : null;
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptExtensions.join(',');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result ?? null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    // If the user cancels, there is no reliable event; resolve(null) on focus return.
    input.click();
  });
}
