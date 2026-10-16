import fs from 'node:fs';
import path from 'node:path';
import type { IpcMain } from 'electron';
import { DATABASE_URI_MAX_LENGTH, parseMongoUri, type DatabaseSummary } from '@app/shared';
import type { Encryptor } from './auth';

// Base de datos configurada en el equipo (research R7, R9; data-model.md «DatabaseConfig»): la cadena de
// conexión se guarda cifrada con safeStorage en userData/database.bin y nunca sale hacia el renderer.

export const DATABASE_CHANNELS = {
  get: 'database:get',
  status: 'database:status',
  test: 'database:test',
  save: 'database:save',
} as const;

export interface DatabaseStore {
  /** Cadena descifrada, o null si no hay configuración (o no se puede descifrar). */
  read(): string | null;
  write(uri: string): void;
  /** false si el sistema no permite cifrar: la configuración dura lo que la aplicación abierta (FR-017). */
  isPersistent(): boolean;
}

const DATABASE_FILE = 'database.bin';

export function createDatabaseStore(options: {
  userDataDir: string;
  encryptor: Encryptor;
}): DatabaseStore {
  const { userDataDir, encryptor } = options;
  const file = path.join(userDataDir, DATABASE_FILE);
  let inMemory: string | null = null;

  /** Si no existe, está corrupto o es de otra cuenta del sistema, equivale a «sin configurar». */
  function readFile(): string | null {
    try {
      const { uri } = JSON.parse(encryptor.decryptString(fs.readFileSync(file))) as {
        uri?: unknown;
      };
      return typeof uri === 'string' ? uri : null;
    } catch {
      return null;
    }
  }

  return {
    read: () => inMemory ?? readFile(),
    write(uri) {
      inMemory = uri;
      // Sin cifrado disponible no se escribe nada en disco: nunca en texto plano (FR-014).
      if (!encryptor.isEncryptionAvailable()) return;
      fs.mkdirSync(userDataDir, { recursive: true });
      fs.writeFileSync(file, encryptor.encryptString(JSON.stringify({ uri })));
    },
    isPersistent: () => encryptor.isEncryptionAvailable(),
  };
}

/** Lo único que recibe el renderer: host y cadena enmascarada, nunca la contraseña (FR-006, FR-015). */
export function toSummary(uri: string | null, persisted: boolean): DatabaseSummary {
  const parsed = uri ? parseMongoUri(uri) : null;
  if (!parsed?.ok) return { configured: false, host: null, maskedUri: null, persisted };
  return {
    configured: true,
    host: parsed.value.display,
    maskedUri: parsed.value.masked,
    persisted,
  };
}

/** Lo que llega por IPC viene del renderer: se valida antes de usarlo. */
export function assertUriArg(value: unknown): asserts value is string {
  const valid =
    typeof value === 'string' && value.length > 0 && value.length <= DATABASE_URI_MAX_LENGTH;
  if (!valid) {
    throw new Error(
      `Se espera una cadena de conexión de 1 a ${DATABASE_URI_MAX_LENGTH} caracteres`,
    );
  }
}

export interface DatabaseIpcDeps {
  store: DatabaseStore;
}

export function registerDatabaseIpc(ipcMain: IpcMain, deps: DatabaseIpcDeps): void {
  const { store } = deps;
  ipcMain.handle(DATABASE_CHANNELS.get, () => toSummary(store.read(), store.isPersistent()));
}
