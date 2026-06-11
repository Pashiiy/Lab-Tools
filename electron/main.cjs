const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;

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

ipcMain.handle('save-session', async (_event, { defaultName, jsonContent }) => {
  const result = await dialog.showSaveDialog({
    title: 'Save Colony Counter Session',
    defaultPath: `${defaultName}.colonycount`,
    filters: [
      { name: 'Colony Counter Sessions', extensions: ['colonycount'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, jsonContent, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('load-session', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Colony Counter Session',
    filters: [
      { name: 'Colony Counter Sessions', extensions: ['colonycount'] },
      { name: 'JSON', extensions: ['json'] },
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
