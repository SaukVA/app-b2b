import type { AppearancePreferences, AuthUser } from '@app/shared';
import { setupStore } from '../../store/store';
import { loadMe, login, logout, refreshSession, sessionCleared } from '../auth/authSlice';
import { updatePreferences } from './preferencesApi';
import { savePreference, sessionRestored } from './preferencesSlice';

jest.mock('./preferencesApi', () => ({
  ...jest.requireActual('./preferencesApi'),
  updatePreferences: jest.fn(),
}));

const mockedUpdate = jest.mocked(updatePreferences);

const SAVED: AppearancePreferences = {
  theme: 'light',
  tableDensity: 'comfortable',
  moneyFormat: 'es',
  homeScreen: null,
};
const SAVE_ERROR = 'No se ha podido guardar. Se mantiene hasta que cierres sesión.';

function user(preferences: AppearancePreferences = SAVED): AuthUser {
  return {
    id: '1',
    login: 'ana@empresa.es',
    name: 'Ana',
    role: 'Comercial',
    roleName: 'Comercial',
    permissions: {
      ventas: 'edit',
      clientes: 'edit',
      productos: 'view',
      proveedores: 'none',
      cobros: 'view',
      ajustes: 'none',
    },
    isBootstrap: false,
    preferences,
  };
}

/** Store con sesión y preferencias aplicadas, como tras iniciar sesión. */
function loggedInStore() {
  const store = setupStore({
    auth: { user: user(), accessToken: 'jwt', status: 'succeeded', error: null },
  });
  store.dispatch(sessionRestored(user()));
  return store;
}

beforeEach(() => mockedUpdate.mockReset());

describe('preferencesSlice', () => {
  it('empieza sin preferencias aplicadas', () => {
    expect(setupStore().getState().preferences).toEqual({
      applied: null,
      saveStatus: 'idle',
      saveError: null,
      pendingChange: {},
    });
  });

  it('login y sessionRestored aplican las preferencias del usuario', () => {
    const dark = { ...SAVED, theme: 'dark' } as const;
    const store = setupStore();
    store.dispatch(
      login.fulfilled({ accessToken: 'jwt', user: user(dark) }, '', {
        login: 'a',
        password: 'b',
        persistent: false,
      }),
    );
    expect(store.getState().preferences.applied).toEqual(dark);

    store.dispatch(sessionRestored(user(SAVED)));
    expect(store.getState().preferences.applied).toEqual(SAVED);
  });

  it('la renovación de sesión y loadMe no cambian lo aplicado', () => {
    const store = loggedInStore();
    const other = { ...SAVED, theme: 'dark', tableDensity: 'compact' } as const;

    store.dispatch(refreshSession.fulfilled({ accessToken: 'jwt2', user: user(other) }, ''));
    store.dispatch(loadMe.fulfilled(user(other), ''));

    expect(store.getState().preferences.applied).toEqual(SAVED);
  });

  it('cerrar sesión o perderla deja applied en null', () => {
    const store = loggedInStore();
    store.dispatch(logout.fulfilled(undefined, ''));
    expect(store.getState().preferences.applied).toBeNull();

    const other = loggedInStore();
    other.dispatch(sessionCleared());
    expect(other.getState().preferences.applied).toBeNull();
  });
});

describe('savePreference', () => {
  it('aplica el cambio antes de que responda la API y, si va bien, lo da por guardado', async () => {
    const store = loggedInStore();
    let resolve!: (prefs: AppearancePreferences) => void;
    mockedUpdate.mockReturnValue(new Promise((r) => (resolve = r)));

    const pending = store.dispatch(savePreference({ theme: 'dark' }));
    expect(store.getState().preferences.applied?.theme).toBe('dark');
    expect(store.getState().auth.user?.preferences.theme).toBe('light');

    resolve({ ...SAVED, theme: 'dark' });
    await pending;
    expect(store.getState().preferences).toMatchObject({
      saveStatus: 'idle',
      saveError: null,
      pendingChange: {},
    });
    expect(store.getState().auth.user?.preferences.theme).toBe('dark');
  });

  it('si falla, mantiene el cambio, avisa y no lo da por guardado', async () => {
    const store = loggedInStore();
    mockedUpdate.mockRejectedValue(new Error('Network Error'));

    await store.dispatch(savePreference({ theme: 'dark' }));

    expect(store.getState().preferences).toMatchObject({
      applied: { ...SAVED, theme: 'dark' },
      saveStatus: 'failed',
      saveError: SAVE_ERROR,
      pendingChange: { theme: 'dark' },
    });
    expect(store.getState().auth.user?.preferences.theme).toBe('light');
  });

  it('la siguiente elección reintenta también lo pendiente', async () => {
    const store = loggedInStore();
    mockedUpdate.mockRejectedValueOnce(new Error('Network Error'));
    await store.dispatch(savePreference({ theme: 'dark' }));
    mockedUpdate.mockResolvedValueOnce({ ...SAVED, theme: 'dark', tableDensity: 'compact' });

    await store.dispatch(savePreference({ tableDensity: 'compact' }));

    expect(mockedUpdate).toHaveBeenLastCalledWith({ theme: 'dark', tableDensity: 'compact' });
    expect(store.getState().preferences.saveStatus).toBe('idle');
  });
});
