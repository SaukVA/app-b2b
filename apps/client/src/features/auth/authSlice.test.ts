import type { AxiosAdapter, AxiosResponse } from 'axios';
import type { AuthUser, DesktopBridge, LoginResponse } from '@app/shared';
import { setupStore } from '../../store/store';
import { httpClient } from '../../utils/httpClient';
import { loginRequest, logoutRequest, refreshRequest } from './authApi';
import { login, logout, refreshSession, sessionCleared } from './authSlice';

jest.mock('./authApi', () => ({
  ...jest.requireActual('./authApi'),
  loginRequest: jest.fn(),
  logoutRequest: jest.fn(),
  refreshRequest: jest.fn(),
}));

const mockedLogout = jest.mocked(logoutRequest);
const mockedLogin = jest.mocked(loginRequest);
const mockedRefresh = jest.mocked(refreshRequest);

const user: AuthUser = {
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

/** window.desktop simulado con los métodos que usa el cliente. */
function mockDesktop(storedToken: string | null = null) {
  const bridge = {
    isDesktop: true,
    getServerUrl: jest.fn().mockResolvedValue('http://servidor/api'),
    getRefreshToken: jest.fn().mockResolvedValue(storedToken),
    setRefreshToken: jest.fn().mockResolvedValue(undefined),
    clearRefreshToken: jest.fn().mockResolvedValue(undefined),
  };
  window.desktop = bridge as unknown as DesktopBridge;
  return bridge;
}

describe('escritorio · refresh token en el equipo', () => {
  it('tras el login lo guarda con "Mantener la sesión" y no lo deja en la store', async () => {
    const bridge = mockDesktop();
    mockedLogin.mockResolvedValue({ accessToken: 'jwt', refreshToken: 'r1', user });
    const store = setupStore();
    await store.dispatch(login({ login: 'ana@empresa.es', password: 'x', persistent: true }));
    expect(mockedLogin).toHaveBeenCalledWith(expect.objectContaining({ client: 'desktop' }));
    expect(bridge.setRefreshToken).toHaveBeenCalledWith('r1', true);
    expect(JSON.stringify(store.getState())).not.toContain('r1');
  });

  it('tras el refresh guarda el token rotado según si la sesión es persistente', async () => {
    const bridge = mockDesktop('r1');
    const rotated: LoginResponse = {
      accessToken: 'jwt2',
      refreshToken: 'r2',
      persistent: false,
      user,
    };
    mockedRefresh.mockResolvedValue(rotated);
    await setupStore().dispatch(refreshSession());
    expect(bridge.setRefreshToken).toHaveBeenCalledWith('r2', false);
  });

  it('en web no toca el puente de escritorio', async () => {
    mockedLogin.mockResolvedValue({ accessToken: 'jwt', user });
    const store = setupStore();
    await store.dispatch(login({ login: 'ana@empresa.es', password: 'x', persistent: false }));
    expect(mockedLogin).toHaveBeenCalledWith(expect.objectContaining({ client: 'web' }));
    expect(store.getState().auth.accessToken).toBe('jwt');
  });
});

describe('refreshRequest', () => {
  const { refreshRequest: realRefreshRequest } =
    jest.requireActual<typeof import('./authApi')>('./authApi');

  function captureRequests() {
    const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(async (config) => {
      const data = { success: true, data: { accessToken: 'jwt', user } };
      return { status: 200, data, statusText: '', headers: {}, config } as AxiosResponse;
    });
    httpClient.defaults.adapter = adapter;
    return adapter;
  }

  it('en escritorio manda el refresh token guardado en el cuerpo', async () => {
    mockDesktop('r1');
    const adapter = captureRequests();
    await realRefreshRequest();
    const config = adapter.mock.calls[0][0];
    expect(config.baseURL).toBe('http://servidor/api');
    expect(JSON.parse(config.data as string)).toEqual({ refreshToken: 'r1' });
  });

  it('en web no manda cuerpo: el token va en la cookie', async () => {
    const adapter = captureRequests();
    await realRefreshRequest();
    expect(JSON.parse(adapter.mock.calls[0][0].data as string)).toEqual({});
  });
});

describe('sessionCleared', () => {
  it('deja la sesión en su estado inicial sin llamar al servidor', () => {
    const store = loggedInStore();
    store.dispatch(sessionCleared());
    expect(store.getState().auth).toEqual({
      user: null,
      accessToken: null,
      status: 'idle',
      error: null,
    });
    expect(mockedLogout).not.toHaveBeenCalled();
  });
});
