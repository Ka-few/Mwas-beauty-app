"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Example: expose a method to log messages
    log: (msg) => console.log('From preload:', msg)
});
