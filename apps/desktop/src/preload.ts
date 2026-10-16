import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '@app/shared';

// window.desktop (contracts/desktop-bridge.md). El preload corre en sandbox y no puede importar
// módulos propios, así que los canales se repiten aquí (deben coincidir con ipc/auth.ts e ipc/server.ts).
const bridge: DesktopBridge = {
  isDesktop: true,
  getServerUrl: () => ipcRenderer.invoke('server:get-url'),
  checkServer: () => ipcRenderer.invoke('server:check'),
  getRefreshToken: () => ipcRenderer.invoke('auth:get-refresh'),
  setRefreshToken: (token, persistent) => ipcRenderer.invoke('auth:set-refresh', token, persistent),
  clearRefreshToken: () => ipcRenderer.invoke('auth:clear-refresh'),
};

contextBridge.exposeInMainWorld('desktop', bridge);
