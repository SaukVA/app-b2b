import mongoose, { type ConnectOptions, type Connection } from 'mongoose';
import {
  DATABASE_ERROR_CODES,
  DATABASE_MESSAGES,
  DATABASE_TEST_TIMEOUT_MS,
  type DatabaseTestResult,
} from '@app/shared';

/**
 * Backend embebido en escritorio (research R4): sin conexión, las operaciones fallan enseguida en vez de
 * quedarse esperando, y la selección de servidor no tarda más de 5 s.
 */
export const EMBEDDED_CONNECTION_OPTIONS: ConnectOptions = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5000,
};

export async function connectDatabase(uri: string, options?: ConnectOptions): Promise<void> {
  await mongoose.connect(uri, options);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

const AUTH_FAILED_CODE = 18;

/**
 * Resultado de «Probar conexión» a partir del error del driver. El mensaje es siempre uno propio: el del
 * driver puede incluir la cadena de conexión.
 */
export function classifyConnectionError(err: unknown): DatabaseTestResult {
  const { code, codeName } = (err ?? {}) as { code?: unknown; codeName?: unknown };
  if (code === AUTH_FAILED_CODE || codeName === 'AuthenticationFailed') {
    return {
      ok: false,
      code: DATABASE_ERROR_CODES.authFailed,
      message: DATABASE_MESSAGES.authFailed,
    };
  }
  return {
    ok: false,
    code: DATABASE_ERROR_CODES.unreachable,
    message: DATABASE_MESSAGES.unreachable,
  };
}

/** Conexión temporal, ping y cierre: no toca la conexión global de Mongoose (research R10). */
export async function testConnection(
  uri: string,
  timeoutMs = DATABASE_TEST_TIMEOUT_MS,
): Promise<DatabaseTestResult> {
  let connection: Connection | null = null;
  try {
    connection = mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs,
    });
    await connection.asPromise();
    await connection.db!.admin().ping();
    return { ok: true };
  } catch (err) {
    return classifyConnectionError(err);
  } finally {
    await connection?.close().catch(() => undefined);
  }
}
