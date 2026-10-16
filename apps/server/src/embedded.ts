import type { AddressInfo } from 'node:net';
import { buildApp } from './app';
import { EMBEDDED_CONNECTION_OPTIONS, connectDatabase, testConnection } from './config/database';
import { getEnv } from './config/env';
import { startEmbedded, type ParentPortLike } from './embeddedRuntime';
import { ensureBootstrapAccount } from './modules/auth/bootstrap.service';

// Entrada del backend cuando lo lanza el escritorio con utilityProcess.fork() (research R1). La web arranca
// con server.ts.

/** Pasa a true tras conectar y crear la cuenta inicial; hasta entonces /api responde 503. */
let databaseReady = false;

/** Express 5 llama al callback de listen también si falla (con el error), no solo al escuchar. */
function listen(host: string, port: number): Promise<number> {
  const app = buildApp({ docs: false, isDatabaseReady: () => databaseReady });
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, (error?: Error) => {
      if (error) reject(error);
      else resolve((server.address() as AddressInfo).port);
    });
  });
}

const parentPort = (process as NodeJS.Process & { parentPort?: ParentPortLike }).parentPort;

if (!parentPort) {
  console.error('embedded.js solo se ejecuta como proceso hijo del escritorio (utilityProcess).');
  process.exit(1);
}

startEmbedded({
  env: getEnv(),
  listen,
  connect: (uri) => connectDatabase(uri, EMBEDDED_CONNECTION_OPTIONS),
  ensureBootstrap: ensureBootstrapAccount,
  onDatabaseReady: () => {
    databaseReady = true;
  },
  parentPort,
  testConnection: (uri) => testConnection(uri),
  log: (message) => console.error(message),
}).catch((err: unknown) => {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  console.error(`No se pudo arrancar el backend local (${code ?? 'sin código'})`);
  process.exit(1);
});
