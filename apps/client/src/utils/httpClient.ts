import axios, { isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@app/shared';
import { getDesktopBridge } from './desktop';

const WEB_API_BASE_URL = '/api';

/** Rutas cuyo 401 no se arregla renovando el token: reintentarlas provocaría un bucle. */
const NO_REFRESH_URLS = ['/auth/login', '/auth/refresh'];
const REFRESHABLE_CODES = ['AUTH_SESSION_EXPIRED', 'AUTH_UNAUTHENTICATED'];

type RefreshHandler = () => Promise<string>;
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let getAccessToken: () => string | null = () => null;
let refreshHandler: RefreshHandler | null = null;
let pendingRefresh: Promise<string> | null = null;

/** La store registra aquí cómo leer el access token (vive solo en memoria). */
export function setAccessTokenGetter(getter: () => string | null): void {
  getAccessToken = getter;
}

/** La store registra aquí cómo renovar la sesión; devuelve el access token nuevo o falla. */
export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

/** En escritorio la URL del servidor la decide el usuario; en web la API va por el mismo origen. */
export async function resolveApiBaseUrl(): Promise<string> {
  const bridge = getDesktopBridge();
  return bridge ? bridge.getServerUrl() : WEB_API_BASE_URL;
}

export const httpClient = axios.create({ withCredentials: true });

// La URL se resuelve en cada petición: en escritorio puede cambiar sin recargar la app.
httpClient.interceptors.request.use(async (config) => {
  config.baseURL = await resolveApiBaseUrl();
  const token = getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

function shouldRefresh(error: AxiosError<ApiError>): boolean {
  const config = error.config as RetriableConfig | undefined;
  if (!config || config._retried || !refreshHandler) return false;
  if (NO_REFRESH_URLS.includes(config.url ?? '')) return false;
  const code = error.response?.data?.error?.code ?? '';
  return error.response?.status === 401 && REFRESHABLE_CODES.includes(code);
}

/** Un único refresh en vuelo: las peticiones que fallan a la vez esperan al mismo (research R8). */
function refreshOnce(handler: RefreshHandler): Promise<string> {
  pendingRefresh ??= handler().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

// Ante un 401 por sesión caducada se renueva el token una vez y se reintenta la petición original.
httpClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!isAxiosError<ApiError>(error) || !shouldRefresh(error)) throw error;
  const config = error.config as RetriableConfig;
  config._retried = true;
  try {
    await refreshOnce(refreshHandler!);
  } catch {
    throw error;
  }
  return httpClient(config);
});
