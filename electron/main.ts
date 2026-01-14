import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const isDev = !!process.env.ELECTRON_START_URL;
let backendProcess: any = null;

// Disable hardware acceleration to prevent common GL/VSync errors on Linux
app.disableHardwareAcceleration();

// Setup Logging
const userDataPath = app.getPath('userData');
const logPath = path.join(userDataPath, 'logs.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

const log = (msg: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${msg}\n`;
  try {
    logStream.write(logMessage);
    if (isDev) console.log(msg); // Keep console logging for dev
  } catch (e) {
    console.error("Failed to write to log file", e);
  }
};

// Global Error Handlers
process.on('uncaughtException', (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message} \n ${error.stack}`);
});

process.on('unhandledRejection', (reason: any) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

function startBackend() {
  if (isDev) {
    // In development, backend is already running separately
    return;
  }

  // In production, start the backend server
  let backendPath = path.join(__dirname, '../../backend/dist/server.bundle.js');

  // If we're running inside an asar archive, we must use the unpacked path for spawn
  if (backendPath.includes('app.asar')) {
    backendPath = backendPath.replace('app.asar', 'app.asar.unpacked');
  }

  // Use a writable directory for the database in production
  const dbPath = path.join(userDataPath, 'salon.db');

  log(`Starting Backend... Path: ${backendPath}`);
  log(`DB Path: ${dbPath}`);

  if (!fs.existsSync(backendPath)) {
    log(`CRITICAL ERROR: Backend bundle not found at ${backendPath}`);
    return;
  }

  try {
    backendProcess = spawn(process.execPath, [backendPath], {
      cwd: path.dirname(backendPath),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1',
        DB_PATH: dbPath
      }
    });

    backendProcess.stdout.on('data', (data: any) => {
      log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data: any) => {
      log(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code: number) => {
      log(`Backend process exited with code ${code}`);
      logStream.end();
    });

    backendProcess.on('error', (err: any) => {
      log(`Failed to spawn backend process: ${err.message}`);
    });

  } catch (err: any) {
    log(`Exception spawning backend: ${err.message}`);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../../assets/icon.ico');

  const splash = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: iconPath,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show immediately
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true // Ensure web security is on
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL!);
    win.webContents.openDevTools();
  } else {
    // Use relative path resolution for production
    const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
    log(`Loading frontend from: ${indexPath}`);

    if (!fs.existsSync(indexPath)) {
      log(`CRITICAL ERROR: Index file not found at ${indexPath}`);
    }

    win.loadFile(indexPath).catch(e => {
      log(`Failed to load index.html: ${e.message}`);
    });
    // win.webContents.openDevTools(); // Removed for production
  }

  // Log load failures
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Window failed to load: ${errorCode} - ${errorDescription}`);
  });

  // Wait for content to finish loading or a set time before showing main window
  win.once('ready-to-show', () => {
    log('Main window ready to show');
    // Ensure splash stays for at least a moment to show the branding, but not too long if ready
    setTimeout(() => {
      // Double check if win is still around
      if (win && !win.isDestroyed()) {
        win.show();
        if (splash && !splash.isDestroyed()) {
          splash.destroy();
        }
      }
    }, 2000);
  });
}

app.whenReady().then(() => {
  log('App Ready. Starting services...');
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  log('Window all closed');
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('quit', () => {
  log('App Quitting');
  if (backendProcess) {
    backendProcess.kill();
  }
});
