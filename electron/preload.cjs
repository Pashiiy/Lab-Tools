const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('isElectron', true);

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    keys: () => ipcRenderer.invoke('store:keys'),
  },
  saveProjectFile: (defaultName, content) =>
    ipcRenderer.invoke('project:save', { defaultName, content }),
  openProjectFile: () => ipcRenderer.invoke('project:open'),
  openResearchWindow: (projectId) =>
    ipcRenderer.invoke('window:open-research', { projectId }),
  colonyCounter: {
    ensureService: () => ipcRenderer.invoke('colony:ensure-service'),
    countColonies: (imageBase64, filename, mask, debug = false) =>
      ipcRenderer.invoke('colony:count', { imageBase64, filename, mask, debug }),
    suggestDish: (imageBase64, filename) =>
      ipcRenderer.invoke('colony:suggest-dish', { imageBase64, filename }),
    saveGroundTruth: (payload) => ipcRenderer.invoke('colony:save-ground-truth', payload),
  },
  onClosing: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app-closing', handler);
    return () => ipcRenderer.removeListener('app-closing', handler);
  },
  confirmClose: () => ipcRenderer.send('close-confirmed'),
  cancelClose: () => ipcRenderer.send('close-cancelled'),
});
