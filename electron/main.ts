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

let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

function createSplash() {
  const iconPath = path.join(__dirname, '../../assets/icon.ico');
  splashWindow = new BrowserWindow({
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

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  return splashWindow;
}

function createMainWindow() {
  const iconPath = path.join(__dirname, '../../assets/icon.ico');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show immediately
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL!);
    mainWindow.webContents.openDevTools();
  } else {
    // Use relative path resolution for production
    const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
    log(`Loading frontend from: ${indexPath}`);

    if (!fs.existsSync(indexPath)) {
      log(`CRITICAL ERROR: Index file not found at ${indexPath}`);
    }

    mainWindow.loadFile(indexPath).catch(e => {
      log(`Failed to load index.html: ${e.message}`);
    });
  }

  // Log load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Window failed to load: ${errorCode} - ${errorDescription}`);
  });

  // Wait for content to finish loading or a set time before showing main window
  mainWindow.once('ready-to-show', () => {
    log('Main window ready to show');
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
      }
    }, 1000);
  });
}

// Helper to check if backend is ready
const checkBackend = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const { net } = require('electron');
    const request = net.request('http://localhost:3001/api/auth/users'); // Use an existing endpoint to check
    request.on('response', (response: any) => {
      resolve(true); // Any response means server is up (even 401/404)
    });
    request.on('error', (error: any) => {
      resolve(false);
    });
    request.end();
  });
};

async function waitForBackend() {
  log('Waiting for backend to start...');
  for (let i = 0; i < 20; i++) { // Try for 20 seconds (20 * 1000ms)
    if (await checkBackend()) {
      log('Backend is ready!');
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  log('Backend failed to start within timeout.');
}

app.whenReady().then(async () => {
  createSplash(); // Show splash immediately
  log('App Ready. Splash shown. Starting services...');

  startBackend();
  await waitForBackend(); // Wait for backend while splash is visible

  createMainWindow(); // Create main window (will close splash when ready)
});

app.on('window-all-closed', () => {
  log('Window all closed');
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('quit', () => {
  log('App Quitting');
  if (backendProcess) {
    backendProcess.kill();
  }
});
