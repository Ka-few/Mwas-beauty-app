import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';

const isDev = !!process.env.ELECTRON_START_URL;
let backendProcess: any = null;

// Disable hardware acceleration to prevent common GL/VSync errors on Linux
app.disableHardwareAcceleration();

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
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'salon.db');

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
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data: any) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code: number) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../../assets/vecteezy_beauty-salon-logo-vector-icon-design-template-vector_24720789.ico');

  const splash = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: iconPath
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
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL!);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
    // win.webContents.openDevTools(); // Removed for production
  }

  // Wait for content to finish loading or a set time before showing main window
  win.once('ready-to-show', () => {
    setTimeout(() => {
      splash.destroy();
      win.show();
    }, 2500); // Show splash for at least 2.5 seconds
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
