const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('isElectron', true);

contextBridge.exposeInMainWorld('electronAPI', {
  // Persistent key/value store (electron-store equivalent).
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    keys: () => ipcRenderer.invoke('store:keys'),
  },
  // Unified `.labtools` project file dialogs.
  saveProjectFile: (defaultName, content) =>
    ipcRenderer.invoke('project:save', { defaultName, content }),
  openProjectFile: () => ipcRenderer.invoke('project:open'),
  onClosing: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app-closing', handler);
    return () => ipcRenderer.removeListener('app-closing', handler);
  },
  confirmClose: () => ipcRenderer.send('close-confirmed'),
  cancelClose: () => ipcRenderer.send('close-cancelled'),
});
