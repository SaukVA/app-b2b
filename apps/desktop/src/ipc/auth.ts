import fs from 'node:fs';
import path from 'node:path';
import type { IpcMain } from 'electron';

// Refresh token del escritorio (research R2, contracts/desktop-bridge.md): siempre en memoria y,
// si la sesión es persistente, también cifrado con safeStorage en userData/session.bin.

/** Lo que se usa de safeStorage; se inyecta para poder probarlo sin Electron. */
export interface Encryptor {
  isEncryptionAvailable(): boolean;
  encryptString(plainText: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

export interface RefreshTokenStore {
  get(): string | null;
  set(token: string, persistent: boolean): void;
  clear(): void;
}

export const AUTH_CHANNELS = {
  get: 'auth:get-refresh',
  set: 'auth:set-refresh',
  clear: 'auth:clear-refresh',
} as const;

const SESSION_FILE = 'session.bin';

export function createRefreshTokenStore(options: {
  userDataDir: string;
  encryptor: Encryptor;
}): RefreshTokenStore {
  const { userDataDir, encryptor } = options;
  const file = path.join(userDataDir, SESSION_FILE);
  let inMemory: string | null = null;

  const removeFile = () => fs.rmSync(file, { force: true });

  /** Si no existe o no se puede descifrar (p. ej. otra cuenta del sistema), no hay sesión guardada. */
  function readFile(): string | null {
    try {
      return encryptor.decryptString(fs.readFileSync(file));
    } catch {
      return null;
    }
  }

  return {
    get: () => inMemory ?? readFile(),
    set(token, persistent) {
      inMemory = token;
      // Sin cifrado disponible no se guarda en claro: la sesión dura lo que dure la aplicación abierta.
      if (!persistent || !encryptor.isEncryptionAvailable()) {
        removeFile();
        return;
      }
      fs.mkdirSync(userDataDir, { recursive: true });
      fs.writeFileSync(file, encryptor.encryptString(token));
    },
    clear() {
      inMemory = null;
      removeFile();
    },
  };
}

/** Lo que llega por IPC viene del renderer: se valida antes de tocar el almacén. */
function assertSetArgs(token: unknown, persistent: unknown): asserts token is string {
  if (typeof token !== 'string' || token.length === 0 || typeof persistent !== 'boolean') {
    throw new Error('auth:set-refresh espera (token: string, persistent: boolean)');
  }
}

export function registerAuthIpc(ipcMain: IpcMain, store: RefreshTokenStore): void {
  ipcMain.handle(AUTH_CHANNELS.get, () => store.get());
  ipcMain.handle(AUTH_CHANNELS.set, (_event, token: unknown, persistent: unknown) => {
    assertSetArgs(token, persistent);
    store.set(token, persistent as boolean);
  });
  ipcMain.handle(AUTH_CHANNELS.clear, () => store.clear());
}
