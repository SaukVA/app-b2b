import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '@app/shared';

// window.desktop (contracts/desktop-bridge.md). El preload corre en sandbox y no puede importar
// módulos propios, así que los canales se repiten aquí (deben coincidir con ipc/auth.ts y main.ts).
// checkServer llega con la fase 9 (T095–T096).
const bridge: Omit<DesktopBridge, 'checkServer'> = {
  isDesktop: true,
  getServerUrl: () => ipcRenderer.invoke('server:get-url'),
  getRefreshToken: () => ipcRenderer.invoke('auth:get-refresh'),
  setRefreshToken: (token, persistent) => ipcRenderer.invoke('auth:set-refresh', token, persistent),
  clearRefreshToken: () => ipcRenderer.invoke('auth:clear-refresh'),
};

contextBridge.exposeInMainWorld('desktop', bridge);
