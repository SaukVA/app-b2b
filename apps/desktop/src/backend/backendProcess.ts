import { randomBytes } from 'node:crypto';

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
}

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

export function createBackendProcess(options: BackendProcessOptions): BackendProcess {
  let current: BackendChild | null = null;
  let slot = createUrlSlot();
  let crashes = 0;

  function launch(): void {
    slot = createUrlSlot();
    const child = options.fork(options.entryPath, childEnv(options));
    const urlSlot = slot;
    current = child;
    child.on('message', (message) => isReady(message) && urlSlot.resolve(message.port));
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

  return {
    start: () => {
      crashes = 0;
      launch();
    },
    restart: () => {
      stop();
      crashes = 0;
      launch();
    },
    stop,
    getUrl: () => withTimeout(slot.promise),
  };
}
