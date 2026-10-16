import type {
  DatabaseSaveResult,
  DatabaseSummary,
  DatabaseTestResult,
  DesktopBridge,
} from '@app/shared';
import { setupStore } from '../../store/store';
import { loadDatabaseSummary, saveDatabase, testDatabase } from './databaseSlice';

const CONFIGURED: DatabaseSummary = {
  configured: true,
  host: 'db.ejemplo.net:27017',
  maskedUri: 'mongodb://ana:••••••••@db.ejemplo.net:27017/ventas?tls=true',
  persisted: true,
};

function mockDesktop(summary: DatabaseSummary) {
  const bridge = { isDesktop: true, getDatabase: jest.fn().mockResolvedValue(summary) };
  window.desktop = bridge as unknown as DesktopBridge;
  return bridge;
}

afterEach(() => {
  delete window.desktop;
});

describe('databaseSlice', () => {
  it('estado inicial (data-model.md)', () => {
    expect(setupStore().getState().database).toEqual({
      summary: null,
      state: 'checking',
      test: { status: 'idle', result: null },
      saving: false,
    });
  });

  it('loadDatabaseSummary guarda el resumen que da el puente', async () => {
    const bridge = mockDesktop(CONFIGURED);
    const store = setupStore();
    await store.dispatch(loadDatabaseSummary());
    expect(bridge.getDatabase).toHaveBeenCalledTimes(1);
    expect(store.getState().database.summary).toEqual(CONFIGURED);
    expect(store.getState().database.state).toBe('checking');
  });

  it('sin base de datos configurada el estado pasa a unconfigured', async () => {
    mockDesktop({ configured: false, host: null, maskedUri: null, persisted: true });
    const store = setupStore();
    await store.dispatch(loadDatabaseSummary());
    expect(store.getState().database.state).toBe('unconfigured');
  });
});

/** Promesa que se resuelve a mano, para ver el estado mientras la llamada está en curso. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function mockBridge(methods: Record<string, jest.Mock>) {
  window.desktop = { isDesktop: true, ...methods } as unknown as DesktopBridge;
}

describe('databaseSlice · testDatabase', () => {
  it('pasa por running y termina en done con el resultado', async () => {
    const pending = deferred<DatabaseTestResult>();
    const testDb = jest.fn().mockReturnValue(pending.promise);
    mockBridge({ testDatabase: testDb });
    const store = setupStore();
    const action = store.dispatch(testDatabase('mongodb://localhost:27017/db'));
    expect(store.getState().database.test).toEqual({ status: 'running', result: null });
    pending.resolve({ ok: true });
    await action;
    expect(testDb).toHaveBeenCalledWith('mongodb://localhost:27017/db');
    expect(store.getState().database.test).toEqual({ status: 'done', result: { ok: true } });
  });

  it('guarda también el resultado de error', async () => {
    const result: DatabaseTestResult = {
      ok: false,
      code: 'DATABASE_TLS_REQUIRED',
      message: 'Las bases de datos remotas exigen conexión cifrada (tls=true o mongodb+srv).',
    };
    mockBridge({ testDatabase: jest.fn().mockResolvedValue(result) });
    const store = setupStore();
    await store.dispatch(testDatabase('mongodb://db.ejemplo.net/db'));
    expect(store.getState().database.test).toEqual({ status: 'done', result });
  });
});

describe('databaseSlice · saveDatabase', () => {
  it('saving pasa a true y vuelve a false; con ok actualiza el resumen', async () => {
    const pending = deferred<DatabaseSaveResult>();
    mockBridge({ saveDatabase: jest.fn().mockReturnValue(pending.promise) });
    const store = setupStore();
    const action = store.dispatch(saveDatabase('mongodb://db.ejemplo.net/ventas?tls=true'));
    expect(store.getState().database.saving).toBe(true);
    pending.resolve({ ok: true, summary: CONFIGURED });
    await action;
    expect(store.getState().database.saving).toBe(false);
    expect(store.getState().database.summary).toEqual(CONFIGURED);
    expect(store.getState().database.state).toBe('checking');
  });

  it('si no es válida no cambia el resumen y deja el motivo en el resultado', async () => {
    const result: DatabaseSaveResult = {
      ok: false,
      code: 'DATABASE_URI_INVALID',
      message: 'La cadena de conexión no es válida: está vacía.',
    };
    mockBridge({ saveDatabase: jest.fn().mockResolvedValue(result) });
    const store = setupStore();
    await store.dispatch(saveDatabase(' '));
    expect(store.getState().database.saving).toBe(false);
    expect(store.getState().database.summary).toBeNull();
    expect(store.getState().database.test).toEqual({ status: 'done', result });
  });
});
