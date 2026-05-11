const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

// Disable hardware acceleration for GPU stability on Mini PC
app.disableHardwareAcceleration();

// Detect if running in development mode
const isDev = !app.isPackaged;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,        // Portrait orientation
    height: 800,       // Portrait orientation
    fullscreen: true,
    frame: false,
    kiosk: true,
    resizable: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0f1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    }
  });

  // Disable text selection and context menu globally
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Disable zoom controls
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  // Disable devtools in production
  if (!isDev) {
    mainWindow.webContents.closeDevTools();
  }

  // Prevent navigation away from app
  mainWindow.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
  });

  // Prevent new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Load the app - use isDev for correct detection
  if (isDev) {
    console.log('[RAFIQ GUI] Loading development server at http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    // Open devtools in development
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('[RAFIQ GUI] Loading production build from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Log when page starts loading
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[RAFIQ GUI] Page loading started...');
  });

  // Log successful load
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[RAFIQ GUI] Page loaded successfully');
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('[RAFIQ GUI] Window ready and shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log any load failures with details
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[RAFIQ GUI] Failed to load:', errorCode, errorDescription);
  });

  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warning', 'error'];
    const levelName = levels[level] || 'unknown';
    if (level >= 2) { // Only log warnings and errors
      console.log(`[RAFIQ Renderer ${levelName}]:`, message);
    }
  });

  // Log page crash
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[RAFIQ GUI] Render process gone:', details.reason);
  });
}

app.whenReady().then(() => {
  console.log('[RAFIQ GUI] Starting...');
  console.log('[RAFIQ GUI] Mode:', isDev ? 'Development' : 'Production');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[RAFIQ GUI] Shutting down...');
});

// IPC handlers
ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) mainWindow.maximize();
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    isDev: isDev
  };
});

ipcMain.handle('is-development', () => {
  return isDev;
});