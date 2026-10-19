import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { AuthUser } from '@app/shared';
import { connectHttpClient, setupStore } from '../store/store';
import { httpClient, setAccessTokenGetter, setRefreshHandler } from './httpClient';

type Reply = { status: number; data?: unknown };
type Routes = (config: InternalAxiosRequestConfig) => Reply;

const expired: Reply = {
  status: 401,
  data: { success: false, error: { code: 'AUTH_SESSION_EXPIRED', message: 'x' } },
};
const ok = (data: unknown): Reply => ({ status: 200, data: { success: true, data } });

/** Adapter falso: responde según la URL y la cabecera Authorization, como haría el servidor. */
function respondWith(routes: Routes) {
  const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(async (config) => {
    const { status, data } = routes(config);
    const response: AxiosResponse = { status, data, statusText: '', headers: {}, config };
    if (status >= 400)
      throw new AxiosError('fallo', AxiosError.ERR_BAD_REQUEST, config, null, response);
    return response;
  });
  httpClient.defaults.adapter = adapter;
  return adapter;
}

const authHeader = (config: InternalAxiosRequestConfig) => config.headers.get('Authorization');

let accessToken: string | null;
const refreshHandler = jest.fn<Promise<string>, []>();

beforeEach(() => {
  accessToken = 'viejo';
  setAccessTokenGetter(() => accessToken);
  refreshHandler.mockReset().mockImplementation(async () => {
    accessToken = 'nuevo';
    return 'nuevo';
  });
  setRefreshHandler(refreshHandler);
});

/** La API acepta solo el token nuevo. */
const acceptsNewToken: Routes = (config) =>
  authHeader(config) === 'Bearer nuevo' ? ok(config.url) : expired;

describe('httpClient · refresh ante 401', () => {
  it('renueva el access token y reintenta la petición original', async () => {
    const adapter = respondWith(acceptsNewToken);
    const res = await httpClient.get('/productos');
    expect(res.data.data).toBe('/productos');
    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('con peticiones concurrentes hace un único refresh y las reintenta todas', async () => {
    respondWith(acceptsNewToken);
    const results = await Promise.all(['/a', '/b', '/c'].map((url) => httpClient.get(url)));
    expect(results.map((res) => res.data.data)).toEqual(['/a', '/b', '/c']);
    expect(refreshHandler).toHaveBeenCalledTimes(1);
  });

  it('no reintenta más de una vez si la petición vuelve a dar 401', async () => {
    const adapter = respondWith(() => expired);
    await expect(httpClient.get('/productos')).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshHandler).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  });
});

describe('httpClient · casos sin refresh ni reintento', () => {
  it.each(['/auth/login', '/auth/refresh'])('no intenta refresh en %s', async (url) => {
    respondWith(() => expired);
    await expect(httpClient.post(url)).rejects.toBeInstanceOf(AxiosError);
    expect(refreshHandler).not.toHaveBeenCalled();
  });

  it('no intenta refresh con otros errores (403, credenciales incorrectas)', async () => {
    const forbidden: Reply = {
      status: 403,
      data: { success: false, error: { code: 'AUTH_FORBIDDEN', message: 'x' } },
    };
    respondWith(() => forbidden);
    await expect(httpClient.get('/clientes')).rejects.toMatchObject({ response: { status: 403 } });
    expect(refreshHandler).not.toHaveBeenCalled();
  });

  it('si el refresh falla, la petición original falla sin reintentarse', async () => {
    refreshHandler.mockRejectedValue(new Error('sin sesión'));
    const adapter = respondWith(() => expired);
    await expect(httpClient.get('/productos')).rejects.toMatchObject({ response: { status: 401 } });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});

describe('httpClient conectado a la store', () => {
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

  it('guarda el access token renovado en la store', async () => {
    const store = setupStore({
      auth: { user, accessToken: 'viejo', status: 'succeeded', error: null },
    });
    connectHttpClient(store);
    respondWith((config) => {
      if (config.url === '/auth/refresh') return ok({ accessToken: 'nuevo', user });
      return acceptsNewToken(config);
    });
    await httpClient.get('/productos');
    expect(store.getState().auth.accessToken).toBe('nuevo');
  });

  it('si el refresh falla, limpia la sesión (RequireAuth redirige a /login con from)', async () => {
    const store = setupStore({
      auth: { user, accessToken: 'viejo', status: 'succeeded', error: null },
    });
    connectHttpClient(store);
    respondWith(() => expired);
    await expect(httpClient.get('/productos')).rejects.toBeInstanceOf(AxiosError);
    expect(store.getState().auth).toMatchObject({ user: null, accessToken: null });
  });
});
