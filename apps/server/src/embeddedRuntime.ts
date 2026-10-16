import type { BackendToMainMessage } from '@app/shared';
import type { Env } from './config/env';

// Ciclo de vida del backend embebido en escritorio (contracts/embedded-backend.md). Las dependencias se
// inyectan para probarlo sin red, sin MongoDB y sin Electron; embedded.ts hace el cableado real.

export const CONNECT_RETRY_MS = 5000;

/** Lo que se usa de process.parentPort (utilityProcess de Electron). */
export interface ParentPortLike {
  postMessage(message: BackendToMainMessage): void;
  on(event: 'message', listener: (event: { data: unknown }) => void): void;
}

export interface EmbeddedDeps {
  env: Pick<Env, 'PORT' | 'HOST' | 'MONGODB_URI'>;
  /** Empieza a escuchar y devuelve el puerto real (PORT=0 lo asigna el sistema). */
  listen(host: string, port: number): Promise<number>;
  connect(uri: string): Promise<void>;
  ensureBootstrap(): Promise<void>;
  parentPort: ParentPortLike;
  log(message: string): void;
}

const DEFAULT_HOST = '127.0.0.1';

/** Nombre del error, nunca su mensaje: los del driver pueden incluir la cadena de conexión. */
function errorName(err: unknown): string {
  return err instanceof Error ? err.name : 'Error';
}

/** Conecta en segundo plano; si falla reintenta cada 5 s. Mongoose reconecta solo tras la primera vez. */
function connectWithRetry(deps: EmbeddedDeps, uri: string): void {
  deps.connect(uri).then(
    () =>
      deps
        .ensureBootstrap()
        .catch((err) => deps.log(`No se pudo crear la cuenta inicial (${errorName(err)})`)),
    (err) => {
      deps.log(
        `Sin conexión con la base de datos (${errorName(err)}); reintento en ${CONNECT_RETRY_MS / 1000} s`,
      );
      setTimeout(() => connectWithRetry(deps, uri), CONNECT_RETRY_MS);
    },
  );
}

export async function startEmbedded(deps: EmbeddedDeps): Promise<void> {
  const port = await deps.listen(deps.env.HOST ?? DEFAULT_HOST, deps.env.PORT);
  deps.parentPort.postMessage({ type: 'ready', port });
  if (deps.env.MONGODB_URI) connectWithRetry(deps, deps.env.MONGODB_URI);
}
