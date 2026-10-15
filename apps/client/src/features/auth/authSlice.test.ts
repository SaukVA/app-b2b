import type { AuthUser, DesktopBridge } from '@app/shared';
import { setupStore } from '../../store/store';
import { logoutRequest } from './authApi';
import { logout } from './authSlice';

jest.mock('./authApi', () => ({
  ...jest.requireActual('./authApi'),
  logoutRequest: jest.fn(),
}));

const mockedLogout = jest.mocked(logoutRequest);

const user: AuthUser = {
  id: '1',
  login: 'ana@empresa.es',
  name: 'Ana',
  role: 'Comercial',
  isBootstrap: false,
  homeScreen: null,
};

function loggedInStore() {
  return setupStore({ auth: { user, accessToken: 'jwt', status: 'succeeded', error: null } });
}

beforeEach(() => mockedLogout.mockReset().mockResolvedValue(undefined));
afterEach(() => {
  delete window.desktop;
});

describe('logout', () => {
  it('cierra la sesión en el servidor y limpia el estado', async () => {
    const store = loggedInStore();
    await store.dispatch(logout());
    expect(mockedLogout).toHaveBeenCalledTimes(1);
    expect(store.getState().auth).toEqual({
      user: null,
      accessToken: null,
      status: 'idle',
      error: null,
    });
  });

  it('limpia el estado aunque el servidor falle o no responda', async () => {
    mockedLogout.mockRejectedValue(new Error('Network Error'));
    const store = loggedInStore();
    await store.dispatch(logout());
    expect(store.getState().auth).toMatchObject({ user: null, accessToken: null });
  });

  it('en escritorio borra el refresh token guardado', async () => {
    const clearRefreshToken = jest.fn().mockResolvedValue(undefined);
    window.desktop = { isDesktop: true, clearRefreshToken } as unknown as DesktopBridge;
    await loggedInStore().dispatch(logout());
    expect(clearRefreshToken).toHaveBeenCalledTimes(1);
  });
});
