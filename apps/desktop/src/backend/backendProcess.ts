import { randomBytes, randomUUID } from 'node:crypto';
import {
  DATABASE_ERROR_CODES,
  DATABASE_MESSAGES,
  DATABASE_TEST_TIMEOUT_MS,
  type DatabaseTestResult,
} from '@app/shared';

// Backend local del escritorio (research R1–R3, R5; contracts/embedded-backend.md): el proceso principal lo
// lanza como hijo, espera a que escuche y lo reinicia al cambiar de base de datos. fork se inyecta para
// probarlo sin Electron (en main.ts es utilityProcess.fork).

export const READY_TIMEOUT_MS = 10_000;
export const MAX_CONSECUTIVE_RESTARTS = 3;

export const BACKEND_CHANNELS = { getUrl: 'backend:get-url' } as const;

/** Lo que se usa de UtilityProcess. */
export interface BackendChild {
  postMessage(message: unknown): void;
  on(event: 'message', listener: (message: unknown) => void): unknown;
  on(event: 'exit', listener: (code: number) => void): unknown;
  kill(): boolean;
}

export interface BackendProcessOptions {
  fork(entryPath: string, env: Record<string, string>): BackendChild;
  entryPath: string;
  /** Cadena de conexión descifrada, o null si no hay base de datos configurada. */
  getUri(): string | null;
  /** URL del cliente Vite en desarrollo, admitida por CORS además de app://. */
  devClientUrl?: string;
}

export interface BackendProcess {
  start(): void;
  /** Mata el hijo actual y lanza otro con la cadena y un secreto JWT nuevos (R5, R6). */
  restart(): void;
  stop(): void;
  /** http://127.0.0.1:<puerto>/api cuando el hijo ha enviado ready; rechaza a los 10 s. */
  getUrl(): Promise<string>;
  /** «Probar conexión» por mensaje al hijo, nunca por HTTP (research R10); como mucho 10 s. */
  testConnection(uri: string): Promise<DatabaseTestResult>;
}

const UNREACHABLE: DatabaseTestResult = {
  ok: false,
  code: DATABASE_ERROR_CODES.unreachable,
  message: DATABASE_MESSAGES.unreachable,
};

/** Entorno del sistema sin valores vacíos (process.env admite undefined). */
function inheritedEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

/**
 * Se hereda el entorno del sistema (en Windows, sin SystemRoot el hijo no puede abrir sockets: listen falla
 * con UNKNOWN) y las variables del backend lo sobrescriben.
 */
function childEnv(options: BackendProcessOptions): Record<string, string> {
  return {
    ...inheritedEnv(),
    PORT: '0',
    HOST: '127.0.0.1',
    NODE_ENV: 'production',
    CORS_ORIGINS: ['app://.', options.devClientUrl].filter(Boolean).join(','),
    JWT_ACCESS_SECRET: randomBytes(48).toString('base64url'),
    // Vacía (no ausente) si no hay configuración: así dotenv no carga la del .env de desarrollo.
    MONGODB_URI: options.getUri() ?? '',
  };
}

function isReady(message: unknown): message is { type: 'ready'; port: number } {
  const candidate = message as { type?: unknown; port?: unknown } | null;
  return candidate?.type === 'ready' && typeof candidate.port === 'number';
}

/** Promesa de la URL del hijo actual: se resuelve con su ready y se sustituye en cada arranque. */
function createUrlSlot() {
  let resolveUrl: (url: string) => void = () => {};
  const promise = new Promise<string>((resolve) => (resolveUrl = resolve));
  return { promise, resolve: (port: number) => resolveUrl(`http://127.0.0.1:${port}/api`) };
}

function withTimeout(promise: Promise<string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('El backend local no ha arrancado a tiempo')),
      READY_TIMEOUT_MS,
    );
    promise.then((url) => {
      clearTimeout(timer);
      resolve(url);
    }, reject);
  });
}

function isTestResult(
  message: unknown,
): message is { type: 'test-result'; id: string; result: DatabaseTestResult } {
  const candidate = message as { type?: unknown; id?: unknown } | null;
  return candidate?.type === 'test-result' && typeof candidate.id === 'string';
}

/** Pruebas de conexión en curso, emparejadas con su respuesta por id. */
function createTestRequests() {
  const pending = new Map<string, (result: DatabaseTestResult) => void>();

  function request(child: BackendChild, uri: string): Promise<DatabaseTestResult> {
    const id = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => settle(id, UNREACHABLE), DATABASE_TEST_TIMEOUT_MS);
      pending.set(id, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
      child.postMessage({ type: 'test-connection', id, uri });
    });
  }

  function settle(id: string, result: DatabaseTestResult): void {
    pending.get(id)?.(result);
    pending.delete(id);
  }

  return { request, settle };
}

/** Mensajes del hijo: ready resuelve la URL; test-result, la prueba de conexión con ese id. */
function routeMessage(
  message: unknown,
  urlSlot: ReturnType<typeof createUrlSlot>,
  tests: ReturnType<typeof createTestRequests>,
): void {
  if (isReady(message)) urlSlot.resolve(message.port);
  if (isTestResult(message)) tests.settle(message.id, message.result);
}

export function createBackendProcess(options: BackendProcessOptions): BackendProcess {
  let current: BackendChild | null = null;
  let slot = createUrlSlot();
  let crashes = 0;
  const tests = createTestRequests();

  function launch(): void {
    slot = createUrlSlot();
    const child = options.fork(options.entryPath, childEnv(options));
    const urlSlot = slot;
    current = child;
    child.on('message', (message) => routeMessage(message, urlSlot, tests));
    child.on('exit', () => onExit(child));
  }

  /** Solo cuenta si muere el hijo actual sin que se haya pedido (stop/restart lo sueltan antes). */
  function onExit(child: BackendChild): void {
    if (child !== current) return;
    current = null;
    if (crashes >= MAX_CONSECUTIVE_RESTARTS) return;
    crashes += 1;
    launch();
  }

  function stop(): void {
    const child = current;
    current = null;
    child?.kill();
  }

  /** Arranque pedido (no una caída): vuelve a permitir los relanzamientos automáticos. */
  function restart(): void {
    stop();
    crashes = 0;
    launch();
  }

  return {
    start: restart,
    restart,
    stop,
    getUrl: () => withTimeout(slot.promise),
    testConnection: (uri) => (current ? tests.request(current, uri) : Promise.resolve(UNREACHABLE)),
  };
}
