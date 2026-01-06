"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// Get __dirname correctly (works with ts-node + CommonJS)
const isDev = process.env.ELECTRON_START_URL !== undefined;
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'), // secure preload
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    if (isDev) {
        // During dev, use Vite React server
        win.loadURL(process.env.ELECTRON_START_URL);
        win.webContents.openDevTools(); // optional, for debugging
    }
    else {
        // Production build: load React build index.html
        win.loadFile(path_1.default.join(__dirname, '../frontend/build/index.html'));
    }
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
