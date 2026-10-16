import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, net, protocol, safeStorage, utilityProcess } from 'electron';
import {
  BACKEND_CHANNELS,
  createBackendProcess,
  type BackendProcess,
} from './backend/backendProcess';
import { createRefreshTokenStore, registerAuthIpc } from './ipc/auth';
import { createDatabaseStore, registerDatabaseIpc } from './ipc/database';

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
    const target =
      insideRenderer && fs.existsSync(filePath) && fs.statSync(filePath).isFile()
        ? filePath
        : path.join(RENDERER_DIR, 'index.html');
    return net.fetch(pathToFileURL(target).toString());
  });
}

/** La configuración de servidor de 001 US6 (config.json) ya no se usa: el escritorio no tiene modo API (R13). */
function removeLegacyConfig(userDataDir: string): void {
  fs.rmSync(path.join(userDataDir, 'config.json'), { force: true });
}

/** Backend local con la base de datos configurada (research R1–R3). */
function createBackend(getUri: () => string | null): BackendProcess {
  return createBackendProcess({
    fork: (entryPath, env) =>
      utilityProcess.fork(entryPath, [], { env, serviceName: 'app-b2b-backend', stdio: 'inherit' }),
    entryPath: require.resolve('@app/server/dist/embedded.js'),
    getUri,
    devClientUrl: app.isPackaged ? undefined : DEV_SERVER_URL,
  });
}

/** Arranca el backend y registra los handlers de window.desktop (contracts/desktop-bridge.md). */
function startBackendAndIpc(): BackendProcess {
  const userDataDir = app.getPath('userData');
  removeLegacyConfig(userDataDir);
  const databaseStore = createDatabaseStore({ userDataDir, encryptor: safeStorage });
  const backend = createBackend(() => databaseStore.read());
  const sessionStore = createRefreshTokenStore({ userDataDir, encryptor: safeStorage });
  registerAuthIpc(ipcMain, sessionStore);
  registerDatabaseIpc(ipcMain, { store: databaseStore, backend, sessionStore });
  ipcMain.handle(BACKEND_CHANNELS.getUrl, () => backend.getUrl());
  backend.start();
  return backend;
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
  const backend = startBackendAndIpc();
  app.on('before-quit', () => backend.stop());
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
