const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('isElectron', true);

contextBridge.exposeInMainWorld('electronAPI', {
  saveSession: (defaultName, jsonContent) =>
    ipcRenderer.invoke('save-session', { defaultName, jsonContent }),
  loadSession: () => ipcRenderer.invoke('load-session'),
  onClosing: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app-closing', handler);
    return () => ipcRenderer.removeListener('app-closing', handler);
  },
  confirmClose: () => ipcRenderer.send('close-confirmed'),
  cancelClose: () => ipcRenderer.send('close-cancelled'),
});
