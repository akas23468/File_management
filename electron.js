const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let pyProc = null;
let mainWindow = null;

function startPythonBackend() {
  const isPackaged = app.isPackaged;
  
  // PyInstaller --onedir outputs to app/app.exe inside dist during dev, or app_backend/app.exe in resources when packaged
  const scriptPath = isPackaged
    ? path.join(process.resourcesPath, 'app_backend', 'app.exe')
    : path.join(__dirname, 'dist', 'app', 'app.exe');

  // Verify backend executable exists before spawning
  if (fs.existsSync(scriptPath)) {
    console.log('[Electron] Spawning Python Backend at:', scriptPath);
    pyProc = spawn(scriptPath, [], { stdio: 'ignore' });

    pyProc.on('error', (err) => {
      console.error('[Electron] Failed to start Python backend:', err);
    });
  } else {
    console.warn('[Electron] Warning: Python executable not found at path:', scriptPath);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Prevents CORS / local file:// protocol access errors
      allowRunningInsecureContent: true
    }
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.includes('access_token=') || url.includes('localhost:3000')) {
      event.preventDefault();
      const hash = url.split('#')[1] || '';
      mainWindow.loadFile(indexPath, { hash });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('access_token=')) {
      const hash = url.split('#')[1] || '';
      mainWindow.loadFile(indexPath, { hash });
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Verify UI build exists before loading
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Electron] Failed to load index.html:', err);
    });
  } else {
    console.error('[Electron] Error: dist/index.html does not exist. Run "npm run build" first.');
  }

  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startPythonBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (pyProc) {
    try {
      pyProc.kill();
    } catch (e) {
      console.error('[Electron] Error terminating Python process:', e);
    }
  }
  if (process.platform !== 'darwin') app.quit();
});