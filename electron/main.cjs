const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;

/* ------------------------------------------------------------------ *
 * Lightweight persistent JSON store (electron-store equivalent).
 * Lives in userData so it survives app updates and restarts.
 * ------------------------------------------------------------------ */
const STORE_PATH = path.join(app.getPath('userData'), 'labtools-store.json');
let storeCache = null;

function readStore() {
  if (storeCache) return storeCache;
  try {
    storeCache = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    storeCache = {};
  }
  return storeCache;
}

let writeTimer = null;
function scheduleWrite() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(storeCache ?? {}), 'utf-8');
    } catch (err) {
      console.error('Failed to persist labtools store:', err);
    }
  }, 150);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#121216',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow = win;

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('close', (e) => {
    if (!win.forceClose) {
      e.preventDefault();
      win.webContents.send('app-closing');
    }
  });
}

// Persistent key/value store (sessions, recents, settings).
ipcMain.handle('store:get', (_event, key) => readStore()[key] ?? null);
ipcMain.handle('store:set', (_event, key, value) => {
  readStore()[key] = value;
  scheduleWrite();
  return true;
});
ipcMain.handle('store:delete', (_event, key) => {
  delete readStore()[key];
  scheduleWrite();
  return true;
});
ipcMain.handle('store:keys', () => Object.keys(readStore()));

// Unified `.labtools` project export.
ipcMain.handle('project:save', async (_event, { defaultName, content }) => {
  const result = await dialog.showSaveDialog({
    title: 'Export Lab Tools Project',
    defaultPath: `${defaultName}.labtools`,
    filters: [
      { name: 'Lab Tools Project', extensions: ['labtools'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

// Unified `.labtools` project import (also accepts legacy `.colonycount`).
ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Lab Tools Project',
    filters: [
      { name: 'Lab Tools Project', extensions: ['labtools'] },
      { name: 'Legacy / JSON', extensions: ['colonycount', 'json'] },
    ],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { success: true, content };
  }
  return { success: false };
});

ipcMain.on('close-confirmed', () => {
  if (mainWindow) {
    mainWindow.forceClose = true;
    mainWindow.close();
  }
});

ipcMain.on('close-cancelled', () => {});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
