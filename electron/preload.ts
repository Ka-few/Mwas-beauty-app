import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Example: expose a method to log messages
  log: (msg: string) => console.log('From preload:', msg)
});
