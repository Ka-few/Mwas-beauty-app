/// <reference types="node" />
/// <reference types="electron" />

interface Window {
  electronAPI: {
    log: (msg: string) => void;
    // Add more methods exposed from preload here
  };
}
