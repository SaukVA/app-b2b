import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IpcMain } from 'electron';
import { AUTH_CHANNELS, createRefreshTokenStore, registerAuthIpc, type Encryptor } from './auth';

/** safeStorage falso: "cifra" invirtiendo el texto para poder comprobar que no se guarda en claro. */
function fakeEncryptor(available = true): Encryptor {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (plain) => Buffer.from([...plain].reverse().join(''), 'utf8'),
    decryptString: (encrypted) => [...encrypted.toString('utf8')].reverse().join(''),
  };
}

let userDataDir: string;
const sessionFile = () => path.join(userDataDir, 'session.bin');

beforeEach(() => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-b2b-desktop-'));
});
afterEach(() => fs.rmSync(userDataDir, { recursive: true, force: true }));

describe('createRefreshTokenStore', () => {
  it('persistente: cifra el token en session.bin y lo recupera tras reiniciar', () => {
    createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() }).set('token-1', true);
    expect(fs.readFileSync(sessionFile(), 'utf8')).toBe('1-nekot');
    const afterRestart = createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() });
    expect(afterRestart.get()).toBe('token-1');
  });

  it('no persistente: lo deja solo en memoria y borra session.bin', () => {
    const store = createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() });
    store.set('token-1', true);
    store.set('token-2', false);
    expect(fs.existsSync(sessionFile())).toBe(false);
    expect(store.get()).toBe('token-2');
    expect(createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() }).get()).toBeNull();
  });

  it('get prioriza el token en memoria sobre el guardado', () => {
    createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() }).set('en-disco', true);
    const store = createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() });
    store.set('en-memoria', false);
    expect(store.get()).toBe('en-memoria');
  });

  it('clear borra la memoria y session.bin', () => {
    const store = createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() });
    store.set('token-1', true);
    store.clear();
    expect(store.get()).toBeNull();
    expect(fs.existsSync(sessionFile())).toBe(false);
  });
});

describe('createRefreshTokenStore · sin cifrado o con session.bin ilegible', () => {
  it('sin cifrado disponible no escribe nada en disco', () => {
    const store = createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor(false) });
    store.set('token-1', true);
    expect(fs.existsSync(sessionFile())).toBe(false);
    expect(store.get()).toBe('token-1');
  });

  it('un session.bin que no se puede descifrar cuenta como sin sesión', () => {
    fs.writeFileSync(sessionFile(), 'basura');
    const encryptor = {
      ...fakeEncryptor(),
      decryptString: () => {
        throw new Error('otra cuenta');
      },
    };
    expect(createRefreshTokenStore({ userDataDir, encryptor }).get()).toBeNull();
  });
});

describe('registerAuthIpc', () => {
  type Handler = (event: unknown, ...args: unknown[]) => unknown;

  function register() {
    const handlers = new Map<string, Handler>();
    const ipcMain = {
      handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
    };
    const store = createRefreshTokenStore({ userDataDir, encryptor: fakeEncryptor() });
    registerAuthIpc(ipcMain as unknown as IpcMain, store);
    return {
      store,
      call: (channel: string, ...args: unknown[]) => handlers.get(channel)!({}, ...args),
    };
  }

  it('expone get, set y clear en los canales del contrato', () => {
    const { call } = register();
    call(AUTH_CHANNELS.set, 'token-1', true);
    expect(call(AUTH_CHANNELS.get)).toBe('token-1');
    call(AUTH_CHANNELS.clear);
    expect(call(AUTH_CHANNELS.get)).toBeNull();
    expect(AUTH_CHANNELS).toEqual({
      get: 'auth:get-refresh',
      set: 'auth:set-refresh',
      clear: 'auth:clear-refresh',
    });
  });

  it('rechaza argumentos que no son del tipo esperado', () => {
    const { call, store } = register();
    expect(() => call(AUTH_CHANNELS.set, 123, true)).toThrow();
    expect(() => call(AUTH_CHANNELS.set, 'token-1', 'sí')).toThrow();
    expect(store.get()).toBeNull();
  });
});
