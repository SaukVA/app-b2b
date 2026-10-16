import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IpcMain } from 'electron';
import type { Encryptor } from './auth';
import {
  DATABASE_CHANNELS,
  assertUriArg,
  createDatabaseStore,
  registerDatabaseIpc,
  toSummary,
} from './database';

/** safeStorage falso: "cifra" invirtiendo el texto para poder comprobar que no se guarda en claro. */
function fakeEncryptor(available = true): Encryptor {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (plain) => Buffer.from([...plain].reverse().join(''), 'utf8'),
    decryptString: (encrypted) => [...encrypted.toString('utf8')].reverse().join(''),
  };
}

/** ipcMain falso: guarda los handlers para invocarlos como lo haría el renderer. */
function fakeIpcMain() {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  const ipcMain = {
    handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) =>
      handlers.set(channel, handler),
  } as unknown as IpcMain;
  const invoke = (channel: string, ...args: unknown[]) => handlers.get(channel)!({}, ...args);
  return { ipcMain, invoke };
}

const URI = 'mongodb://ana:s3cr3t@db.ejemplo.net:27017/ventas?tls=true';
let userDataDir: string;
const databaseFile = () => path.join(userDataDir, 'database.bin');

beforeEach(() => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-b2b-desktop-'));
});
afterEach(() => fs.rmSync(userDataDir, { recursive: true, force: true }));

describe('createDatabaseStore', () => {
  it('sin nada guardado no hay base de datos configurada', () => {
    expect(createDatabaseStore({ userDataDir, encryptor: fakeEncryptor() }).read()).toBeNull();
  });

  it('guarda { uri } cifrado en database.bin y lo recupera tras reiniciar', () => {
    createDatabaseStore({ userDataDir, encryptor: fakeEncryptor() }).write(URI);
    expect(fs.readFileSync(databaseFile(), 'utf8')).not.toContain('s3cr3t');
    const afterRestart = createDatabaseStore({ userDataDir, encryptor: fakeEncryptor() });
    expect(afterRestart.read()).toBe(URI);
  });

  it('un database.bin que no se puede descifrar equivale a sin configurar', () => {
    fs.writeFileSync(databaseFile(), 'basura');
    const broken: Encryptor = {
      ...fakeEncryptor(),
      decryptString: () => {
        throw new Error('otra cuenta del sistema');
      },
    };
    expect(createDatabaseStore({ userDataDir, encryptor: broken }).read()).toBeNull();
  });

  it('sin cifrado disponible la guarda solo en memoria y no escribe en disco (FR-017)', () => {
    const store = createDatabaseStore({ userDataDir, encryptor: fakeEncryptor(false) });
    store.write(URI);
    expect(store.read()).toBe(URI);
    expect(store.isPersistent()).toBe(false);
    expect(fs.existsSync(databaseFile())).toBe(false);
  });
});

describe('toSummary (lo único que recibe el renderer, FR-015)', () => {
  it('sin cadena: configured false', () => {
    expect(toSummary(null, true)).toEqual({
      configured: false,
      host: null,
      maskedUri: null,
      persisted: true,
    });
  });

  it('con cadena: host y versión enmascarada, nunca la contraseña', () => {
    const summary = toSummary(URI, false);
    expect(summary).toEqual({
      configured: true,
      host: 'db.ejemplo.net:27017',
      maskedUri: 'mongodb://ana:••••••••@db.ejemplo.net:27017/ventas?tls=true',
      persisted: false,
    });
    expect(JSON.stringify(summary)).not.toContain('s3cr3t');
  });
});

describe('assertUriArg (lo que llega por IPC se valida)', () => {
  it.each([undefined, 42, '', 'x'.repeat(2049)])('lanza con %p', (value) => {
    expect(() => assertUriArg(value)).toThrow();
  });

  it('acepta un string de hasta 2048 caracteres', () => {
    expect(() => assertUriArg('x'.repeat(2048))).not.toThrow();
  });
});

describe('registerDatabaseIpc · database:get', () => {
  it('devuelve el resumen sin la cadena completa', async () => {
    const store = createDatabaseStore({ userDataDir, encryptor: fakeEncryptor() });
    store.write(URI);
    const { ipcMain, invoke } = fakeIpcMain();
    registerDatabaseIpc(ipcMain, { store, backend: fakeBackend() });
    const summary = await invoke(DATABASE_CHANNELS.get);
    expect(summary).toMatchObject({ configured: true, host: 'db.ejemplo.net:27017' });
    expect(JSON.stringify(summary)).not.toContain('s3cr3t');
  });
});

/** Backend falso: testConnection y restart controlables. */
function fakeBackend() {
  return {
    testConnection: jest.fn().mockResolvedValue({ ok: true }),
    restart: jest.fn(),
    getUrl: jest.fn().mockResolvedValue('http://127.0.0.1:51234/api'),
  };
}

/** fetch falso que responde /health con el estado indicado. */
function healthFetch(database: string, ok = true) {
  return jest.fn().mockResolvedValue({
    ok,
    json: async () => ({ success: true, data: { status: 'ok', database } }),
  });
}

function setupIpc(fetchImpl: jest.Mock = healthFetch('connected')) {
  const store = createDatabaseStore({ userDataDir, encryptor: fakeEncryptor() });
  const backend = fakeBackend();
  const { ipcMain, invoke } = fakeIpcMain();
  registerDatabaseIpc(ipcMain, { store, backend, fetchImpl: fetchImpl as unknown as typeof fetch });
  return { store, backend, invoke, fetchImpl };
}

const REMOTE_NO_TLS = 'mongodb://ana:s3cr3t@db.ejemplo.net:27017/ventas';

describe('registerDatabaseIpc · database:test (US1)', () => {
  it.each([
    ['formato no válido', 'postgres://localhost/db', 'DATABASE_URI_INVALID'],
    ['remota sin TLS', REMOTE_NO_TLS, 'DATABASE_TLS_REQUIRED'],
  ])('con %s responde %s sin llamar al backend ni guardar', async (_case, uri, code) => {
    const { store, backend, invoke } = setupIpc();
    await expect(invoke(DATABASE_CHANNELS.test, uri)).resolves.toMatchObject({ ok: false, code });
    expect(backend.testConnection).not.toHaveBeenCalled();
    expect(store.read()).toBeNull();
  });

  it('con una cadena válida delega en el backend y no guarda nada (FR-009)', async () => {
    const { store, backend, invoke } = setupIpc();
    const failed = { ok: false, code: 'DATABASE_UNREACHABLE', message: 'x' };
    backend.testConnection.mockResolvedValue(failed);
    await expect(invoke(DATABASE_CHANNELS.test, URI)).resolves.toEqual(failed);
    expect(backend.testConnection).toHaveBeenCalledWith(URI);
    expect(store.read()).toBeNull();
  });
});

describe('registerDatabaseIpc · database:save (US1)', () => {
  it('guarda, reinicia el backend y devuelve el resumen sin conectar antes', async () => {
    const { store, backend, invoke } = setupIpc();
    const result = await invoke(DATABASE_CHANNELS.save, URI);
    expect(result).toEqual({ ok: true, summary: toSummary(URI, true) });
    expect(store.read()).toBe(URI);
    expect(backend.restart).toHaveBeenCalledTimes(1);
    expect(backend.testConnection).not.toHaveBeenCalled();
  });

  it('con una cadena no válida no guarda ni reinicia', async () => {
    const { store, backend, invoke } = setupIpc();
    const result = await invoke(DATABASE_CHANNELS.save, REMOTE_NO_TLS);
    expect(result).toMatchObject({ ok: false, code: 'DATABASE_TLS_REQUIRED' });
    expect(store.read()).toBeNull();
    expect(backend.restart).not.toHaveBeenCalled();
  });

  it.each([42, '', 'x'.repeat(2049)])('test y save lanzan con un argumento %p', async (value) => {
    const { invoke } = setupIpc();
    await expect(async () => invoke(DATABASE_CHANNELS.test, value)).rejects.toThrow();
    await expect(async () => invoke(DATABASE_CHANNELS.save, value)).rejects.toThrow();
  });
});

describe('registerDatabaseIpc · database:status (US2, FR-005)', () => {
  it('sin configuración responde unconfigured sin preguntar al backend', async () => {
    const { invoke, fetchImpl } = setupIpc();
    await expect(invoke(DATABASE_CHANNELS.status)).resolves.toEqual({ state: 'unconfigured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(['connected', 'disconnected'])(
    'devuelve el database de /health: %s',
    async (database) => {
      const { store, invoke, fetchImpl } = setupIpc(healthFetch(database));
      store.write(URI);
      await expect(invoke(DATABASE_CHANNELS.status)).resolves.toEqual({ state: database });
      expect(fetchImpl).toHaveBeenCalledWith(
        'http://127.0.0.1:51234/api/health',
        expect.anything(),
      );
    },
  );

  it.each([
    ['la respuesta no es OK', healthFetch('connected', false)],
    ['fetch falla', jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))],
  ])('si %s responde disconnected', async (_case, fetchImpl) => {
    const { store, invoke } = setupIpc(fetchImpl);
    store.write(URI);
    await expect(invoke(DATABASE_CHANNELS.status)).resolves.toEqual({ state: 'disconnected' });
  });

  it('si el backend no está listo responde disconnected', async () => {
    const { store, backend, invoke } = setupIpc();
    backend.getUrl.mockRejectedValue(new Error('El backend local no ha arrancado a tiempo'));
    store.write(URI);
    await expect(invoke(DATABASE_CHANNELS.status)).resolves.toEqual({ state: 'disconnected' });
  });
});

describe('registerDatabaseIpc · database:status con tiempo máximo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('sin respuesta en 5 s responde disconnected', async () => {
    const { store, invoke } = setupIpc(jest.fn(() => new Promise(() => {})));
    store.write(URI);
    const status = invoke(DATABASE_CHANNELS.status) as Promise<unknown>;
    await jest.advanceTimersByTimeAsync(5000);
    await expect(status).resolves.toEqual({ state: 'disconnected' });
  });
});
