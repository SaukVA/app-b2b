import type { DatabaseSummary, DesktopBridge } from '@app/shared';
import { setupStore } from '../../store/store';
import { loadDatabaseSummary } from './databaseSlice';

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
