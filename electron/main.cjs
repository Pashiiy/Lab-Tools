const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const {
  ensureColonyService,
  stopColonyService,
  countColonies,
  suggestDish,
  saveGroundTruthFixture,
} = require('./colonyCounterService.cjs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const STORE_PATH = path.join(app.getPath('userData'), 'benchy-store.json');
const LEGACY_STORE_PATH = path.join(app.getPath('userData'), 'labtools-store.json');
let storeCache = null;

function readStore() {
  if (storeCache) return storeCache;
  try {
    storeCache = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    try {
      storeCache = JSON.parse(fs.readFileSync(LEGACY_STORE_PATH, 'utf-8'));
      scheduleWrite();
    } catch {
      storeCache = {};
    }
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
      console.error('Failed to persist Benchy store:', err);
    }
  }, 150);
}

function windowUrl(query = '') {
  if (isDev) {
    return `http://localhost:5173/${query ? `?${query}` : ''}`;
  }
  const filePath = path.join(__dirname, '../dist/index.html');
  return query ? `file://${filePath}?${query}` : `file://${filePath}`;
}

function createBrowserWindow(query = '') {
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

  win.loadURL(windowUrl(query));

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

  return win;
}

function createDashboardWindow() {
  return createBrowserWindow('');
}

function createResearchWindow(projectId) {
  const q = new URLSearchParams({ mode: 'research', projectId: projectId || '' });
  return createBrowserWindow(q.toString());
}

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

ipcMain.handle('project:save', async (_event, { defaultName, content }) => {
  const result = await dialog.showSaveDialog({
    title: 'Export Benchy Project',
    defaultPath: `${defaultName}.benchy`,
    filters: [
      { name: 'Benchy Project', extensions: ['benchy'] },
      { name: 'Legacy Lab Tools', extensions: ['labtools'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Benchy Project',
    filters: [
      { name: 'Benchy Project', extensions: ['benchy', 'labtools'] },
      { name: 'Legacy / JSON', extensions: ['colonycount', 'json'] },
    ],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { success: true, content, filePath: result.filePaths[0] };
  }
  return { success: false };
});

ipcMain.handle('window:open-research', (_event, { projectId } = {}) => {
  createResearchWindow(projectId);
  return { success: true };
});

ipcMain.handle('colony:ensure-service', async () => {
  try {
    const info = await ensureColonyService();
    return { success: true, port: info.port };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('colony:count', async (_event, { imageBase64, filename, mask, debug } = {}) => {
  try {
    if (!imageBase64) {
      return { success: false, error: 'Missing image data' };
    }
    if (!mask) {
      return { success: false, error: 'A counting mask is required. Draw Mask Area first.' };
    }
    const buffer = Buffer.from(imageBase64, 'base64');
    const result = await countColonies(buffer, filename || 'plate.png', mask, Boolean(debug));
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('colony:suggest-dish', async (_event, { imageBase64, filename } = {}) => {
  try {
    if (!imageBase64) {
      return { success: false, error: 'Missing image data' };
    }
    const buffer = Buffer.from(imageBase64, 'base64');
    const result = await suggestDish(buffer, filename || 'plate.png');
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('colony:save-ground-truth', async (_event, payload = {}) => {
  try {
    const result = saveGroundTruthFixture(payload);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.on('close-confirmed', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.forceClose = true;
    win.close();
  }
});

ipcMain.on('close-cancelled', () => {});

app.whenReady().then(() => {
  createDashboardWindow();
  // Warm the colony service in the background (non-blocking)
  ensureColonyService().catch(() => {});
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDashboardWindow();
  });
});

app.on('before-quit', () => {
  stopColonyService();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
