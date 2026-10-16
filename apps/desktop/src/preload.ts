import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '@app/shared';

// window.desktop v2 (specs/002-desktop-local-backend/contracts/desktop-bridge.md). El preload corre en
// sandbox y no puede importar módulos propios, así que los canales se repiten aquí (deben coincidir con
// backend/backendProcess.ts, ipc/database.ts e ipc/auth.ts).
const bridge: DesktopBridge = {
  isDesktop: true,
  getServerUrl: () => ipcRenderer.invoke('backend:get-url'),
  getDatabase: () => ipcRenderer.invoke('database:get'),
  getDatabaseStatus: () => ipcRenderer.invoke('database:status'),
  testDatabase: (uri) => ipcRenderer.invoke('database:test', uri),
  saveDatabase: (uri) => ipcRenderer.invoke('database:save', uri),
  getRefreshToken: () => ipcRenderer.invoke('auth:get-refresh'),
  setRefreshToken: (token, persistent) => ipcRenderer.invoke('auth:set-refresh', token, persistent),
  clearRefreshToken: () => ipcRenderer.invoke('auth:clear-refresh'),
};

contextBridge.exposeInMainWorld('desktop', bridge);
