import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, net, protocol, safeStorage } from 'electron';
import { createRefreshTokenStore, registerAuthIpc } from './ipc/auth';
import { readConfig } from './ipc/config';

// En producción el cliente se sirve desde app://. (origen admitido por CORS_ORIGINS).
const APP_SCHEME = 'app';
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
const RENDERER_DIR = path.join(__dirname, '../renderer');

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** Sirve los archivos del build de apps/client; cualquier ruta desconocida cae en index.html (SPA). */
function registerAppProtocol(): void {
  protocol.handle(APP_SCHEME, (request) => {
    const requested = path.normalize(decodeURIComponent(new URL(request.url).pathname));
    const filePath = path.join(RENDERER_DIR, requested);
    const insideRenderer = filePath.startsWith(RENDERER_DIR);
    const target = insideRenderer && fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : path.join(RENDERER_DIR, 'index.html');
    return net.fetch(pathToFileURL(target).toString());
  });
}

/** Handlers de window.desktop. server:get-url se adelanta de la fase 9 para que el puente esté completo. */
function registerIpc(): void {
  const userDataDir = app.getPath('userData');
  registerAuthIpc(ipcMain, createRefreshTokenStore({ userDataDir, encryptor: safeStorage }));
  ipcMain.handle('server:get-url', () => readConfig(userDataDir).serverUrl);
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const url = app.isPackaged ? `${APP_SCHEME}://./index.html` : DEV_SERVER_URL;
  void window.loadURL(url);
}

app.whenReady().then(() => {
  registerAppProtocol();
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
