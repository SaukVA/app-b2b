import { EventEmitter } from 'node:events';
import {
  MAX_CONSECUTIVE_RESTARTS,
  READY_TIMEOUT_MS,
  createBackendProcess,
  type BackendChild,
  type BackendProcessOptions,
} from './backendProcess';

/** Proceso hijo falso: emite 'message' y 'exit' como el UtilityProcess de Electron. */
class FakeChild extends EventEmitter implements BackendChild {
  killed = false;
  sent: unknown[] = [];
  constructor(readonly env: Record<string, string>) {
    super();
  }
  postMessage(message: unknown): void {
    this.sent.push(message);
  }
  kill(): boolean {
    this.killed = true;
    this.emit('exit', 0);
    return true;
  }
  ready(port: number): void {
    this.emit('message', { type: 'ready', port });
  }
  crash(): void {
    this.emit('exit', 1);
  }
}

function setup(overrides: Partial<BackendProcessOptions> = {}) {
  const children: FakeChild[] = [];
  let uri: string | null = 'mongodb://localhost:27017/escritorio';
  const options: BackendProcessOptions = {
    fork: jest.fn((_entry: string, env: Record<string, string>) => {
      const child = new FakeChild(env);
      children.push(child);
      return child;
    }),
    entryPath: '/app/server/dist/embedded.js',
    getUri: () => uri,
    devClientUrl: 'http://localhost:5173',
    ...overrides,
  };
  const backend = createBackendProcess(options);
  const last = () => children[children.length - 1];
  return { backend, children, last, options, setUri: (next: string | null) => (uri = next) };
}

describe('createBackendProcess · entorno del hijo (contracts/embedded-backend.md)', () => {
  it('lanza la entrada con PORT=0, HOST=127.0.0.1, NODE_ENV=production y CORS de la app', () => {
    const { backend, last, options } = setup();
    backend.start();
    expect(options.fork).toHaveBeenCalledWith('/app/server/dist/embedded.js', expect.any(Object));
    expect(last().env).toMatchObject({
      PORT: '0',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      CORS_ORIGINS: 'app://.,http://localhost:5173',
      MONGODB_URI: 'mongodb://localhost:27017/escritorio',
    });
  });

  it('sin cliente de desarrollo, CORS solo admite app://.', () => {
    const { backend, last } = setup({ devClientUrl: undefined });
    backend.start();
    expect(last().env.CORS_ORIGINS).toBe('app://.');
  });

  it('el secreto JWT son 48 bytes aleatorios en base64url y cambia en cada arranque', () => {
    const { backend, children } = setup();
    backend.start();
    backend.restart();
    const [first, second] = children.map((child) => child.env.JWT_ACCESS_SECRET);
    expect(first).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(first).not.toBe(second);
  });

  it('sin base de datos configurada pasa MONGODB_URI vacía (no hereda la del .env de desarrollo)', () => {
    const { backend, last, setUri } = setup();
    setUri(null);
    backend.start();
    expect(last().env.MONGODB_URI).toBe('');
  });
});

describe('createBackendProcess · entorno heredado', () => {
  afterEach(() => {
    delete process.env.SMOKE_SYSTEM_VAR;
    delete process.env.MONGODB_URI;
  });

  // En Windows, sin las variables del sistema (SystemRoot…) el hijo no puede abrir sockets.
  it('hereda el entorno del sistema, pero las variables del backend lo sobrescriben', () => {
    process.env.SMOKE_SYSTEM_VAR = 'sistema';
    process.env.MONGODB_URI = 'mongodb://heredada:27017/no';
    const { backend, last } = setup();
    backend.start();
    expect(last().env.SMOKE_SYSTEM_VAR).toBe('sistema');
    expect(last().env.MONGODB_URI).toBe('mongodb://localhost:27017/escritorio');
  });
});

describe('createBackendProcess · getUrl', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resuelve http://127.0.0.1:<puerto>/api cuando el hijo envía ready', async () => {
    const { backend, last } = setup();
    backend.start();
    const url = backend.getUrl();
    last().ready(51234);
    await expect(url).resolves.toBe('http://127.0.0.1:51234/api');
    await expect(backend.getUrl()).resolves.toBe('http://127.0.0.1:51234/api');
  });

  it(`rechaza si ready no llega en ${READY_TIMEOUT_MS / 1000} s`, async () => {
    const { backend } = setup();
    backend.start();
    const url = backend.getUrl();
    jest.advanceTimersByTime(READY_TIMEOUT_MS);
    await expect(url).rejects.toThrow(/backend local/);
  });

  it('tras restart() espera al ready del hijo nuevo, no al puerto anterior', async () => {
    const { backend, children, last } = setup();
    backend.start();
    last().ready(51234);
    backend.restart();
    expect(children[0].killed).toBe(true);
    const url = backend.getUrl();
    last().ready(60000);
    await expect(url).resolves.toBe('http://127.0.0.1:60000/api');
  });

  it('restart() lee de nuevo la cadena de conexión', () => {
    const { backend, last, setUri } = setup();
    backend.start();
    setUri('mongodb://localhost:27017/otra');
    backend.restart();
    expect(last().env.MONGODB_URI).toBe('mongodb://localhost:27017/otra');
  });
});

describe('createBackendProcess · caídas', () => {
  it(`relanza el hijo si termina inesperadamente, como mucho ${MAX_CONSECUTIVE_RESTARTS} veces seguidas`, () => {
    const { backend, children, last } = setup();
    backend.start();
    for (let i = 0; i < MAX_CONSECUTIVE_RESTARTS + 2; i++) last().crash();
    expect(children).toHaveLength(1 + MAX_CONSECUTIVE_RESTARTS);
  });

  it('stop() mata el hijo y no lo relanza', () => {
    const { backend, children } = setup();
    backend.start();
    backend.stop();
    expect(children[0].killed).toBe(true);
    expect(children).toHaveLength(1);
  });

  it('restart() vuelve a permitir relanzamientos tras agotar los reintentos', () => {
    const { backend, children, last } = setup();
    backend.start();
    for (let i = 0; i < MAX_CONSECUTIVE_RESTARTS + 1; i++) last().crash();
    backend.restart();
    last().crash();
    expect(children).toHaveLength(1 + MAX_CONSECUTIVE_RESTARTS + 2);
  });
});

describe('createBackendProcess · testConnection (US1, research R10)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const URI = 'mongodb://localhost:27017/otra';
  const sentTests = (child: FakeChild) => child.sent as { type: string; id: string; uri: string }[];

  it('envía test-connection con un id único y resuelve con el test-result de ese id', async () => {
    const { backend, last } = setup();
    backend.start();
    const first = backend.testConnection(URI);
    const second = backend.testConnection(URI);
    const [a, b] = sentTests(last());
    expect(a).toMatchObject({ type: 'test-connection', uri: URI });
    expect(a.id).not.toBe(b.id);
    last().emit('message', { type: 'test-result', id: b.id, result: { ok: true } });
    const failed = { ok: false, code: 'DATABASE_AUTH_FAILED', message: 'x' };
    last().emit('message', { type: 'test-result', id: a.id, result: failed });
    await expect(first).resolves.toEqual(failed);
    await expect(second).resolves.toEqual({ ok: true });
  });

  it(`sin respuesta en ${READY_TIMEOUT_MS / 1000} s resuelve DATABASE_UNREACHABLE`, async () => {
    const { backend } = setup();
    backend.start();
    const result = backend.testConnection(URI);
    jest.advanceTimersByTime(READY_TIMEOUT_MS);
    await expect(result).resolves.toMatchObject({ ok: false, code: 'DATABASE_UNREACHABLE' });
  });

  it('sin backend en marcha resuelve DATABASE_UNREACHABLE sin esperar', async () => {
    const { backend } = setup();
    await expect(backend.testConnection(URI)).resolves.toMatchObject({
      ok: false,
      code: 'DATABASE_UNREACHABLE',
    });
  });
});
