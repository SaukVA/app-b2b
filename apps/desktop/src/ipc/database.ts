import fs from 'node:fs';
import path from 'node:path';
import type { IpcMain } from 'electron';
import {
  DATABASE_URI_MAX_LENGTH,
  parseMongoUri,
  type DatabaseSaveResult,
  type DatabaseState,
  type DatabaseSummary,
  type DatabaseTestResult,
} from '@app/shared';
import type { BackendProcess } from '../backend/backendProcess';
import type { Encryptor, RefreshTokenStore } from './auth';

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
  backend: Pick<BackendProcess, 'testConnection' | 'restart' | 'getUrl'>;
  /** Refresh token del equipo (001 R2): se borra al cambiar de base de datos (FR-012, research R6). */
  sessionStore: Pick<RefreshTokenStore, 'clear'>;
  /** Se inyecta para probarlo sin red; por defecto, fetch global. */
  fetchImpl?: typeof fetch;
}

/** Tiempo máximo para conocer el estado de la base de datos (plan, Performance Goals). */
export const STATUS_TIMEOUT_MS = 5000;

/** Lo que dice /api/health del backend local; cualquier fallo es «Sin conexión». */
async function askHealth(deps: DatabaseIpcDeps): Promise<DatabaseState> {
  try {
    const response = await (deps.fetchImpl ?? fetch)(`${await deps.backend.getUrl()}/health`, {});
    if (!response.ok) return 'disconnected';
    const body = (await response.json()) as { data?: { database?: unknown } };
    return body.data?.database === 'connected' ? 'connected' : 'disconnected';
  } catch {
    return 'disconnected';
  }
}

/** Pausa entre preguntas a /api/health mientras el backend todavía no ha conectado. */
export const STATUS_RETRY_MS = 500;

/**
 * Tras guardar, el backend reiniciado escucha antes de conectar con la base de datos: se vuelve a preguntar
 * hasta que responda connected o hasta que se cancele (bug login-db-status-offline).
 */
async function waitForConnected(
  deps: DatabaseIpcDeps,
  attempt: { cancelled: boolean },
): Promise<DatabaseState> {
  while (!attempt.cancelled) {
    if ((await askHealth(deps)) === 'connected') return 'connected';
    await new Promise((resolve) => setTimeout(resolve, STATUS_RETRY_MS));
  }
  return 'disconnected';
}

/** Estado real (FR-005): sin configuración no se pregunta; si no está connected en 5 s, disconnected. */
async function databaseStatus(deps: DatabaseIpcDeps): Promise<{ state: DatabaseState }> {
  if (!deps.store.read()) return { state: 'unconfigured' };
  const attempt = { cancelled: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DatabaseState>((resolve) => {
    timer = setTimeout(() => resolve('disconnected'), STATUS_TIMEOUT_MS);
  });
  const state = await Promise.race([waitForConnected(deps, attempt), timeout]);
  attempt.cancelled = true;
  clearTimeout(timer);
  return { state };
}

/** Valida formato y TLS sin conectar: ningún error de esta fase llega al backend (FR-010, FR-016). */
function validate(uri: string): DatabaseTestResult {
  const parsed = parseMongoUri(uri);
  return parsed.ok ? { ok: true } : { ok: false, code: parsed.code, message: parsed.message };
}

async function testDatabase(deps: DatabaseIpcDeps, uri: unknown): Promise<DatabaseTestResult> {
  assertUriArg(uri);
  const validation = validate(uri);
  return validation.ok ? deps.backend.testConnection(uri) : validation;
}

/** Se guarda aunque la base de datos no responda ahora: puede ser una caída temporal (spec, Edge Cases). */
async function saveDatabase(deps: DatabaseIpcDeps, uri: unknown): Promise<DatabaseSaveResult> {
  assertUriArg(uri);
  const validation = validate(uri);
  if (!validation.ok) return validation;
  deps.store.write(uri);
  // Antes de reiniciar: ninguna sesión de la base de datos anterior sobrevive al cambio (FR-012).
  deps.sessionStore.clear();
  deps.backend.restart();
  return { ok: true, summary: toSummary(uri, deps.store.isPersistent()) };
}

export function registerDatabaseIpc(ipcMain: IpcMain, deps: DatabaseIpcDeps): void {
  const { store } = deps;
  ipcMain.handle(DATABASE_CHANNELS.get, () => toSummary(store.read(), store.isPersistent()));
  ipcMain.handle(DATABASE_CHANNELS.status, () => databaseStatus(deps));
  ipcMain.handle(DATABASE_CHANNELS.test, (_event, uri: unknown) => testDatabase(deps, uri));
  ipcMain.handle(DATABASE_CHANNELS.save, (_event, uri: unknown) => saveDatabase(deps, uri));
}
