import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, net, protocol } from 'electron';

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
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
