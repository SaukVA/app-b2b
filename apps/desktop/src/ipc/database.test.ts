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
    registerDatabaseIpc(ipcMain, { store });
    const summary = await invoke(DATABASE_CHANNELS.get);
    expect(summary).toMatchObject({ configured: true, host: 'db.ejemplo.net:27017' });
    expect(JSON.stringify(summary)).not.toContain('s3cr3t');
  });
});
