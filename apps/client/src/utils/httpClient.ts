import axios from 'axios';
import { getDesktopBridge } from './desktop';

const WEB_API_BASE_URL = '/api';

let getAccessToken: () => string | null = () => null;

/** La store registra aquí cómo leer el access token (vive solo en memoria). */
export function setAccessTokenGetter(getter: () => string | null): void {
  getAccessToken = getter;
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
