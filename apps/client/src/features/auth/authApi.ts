import {
  DATABASE_ERROR_CODES,
  DATABASE_MESSAGES,
  type ApiError,
  type ApiSuccess,
  type AuthUser,
  type LoginRequest,
  type LoginResponse,
} from '@app/shared';
import { getDesktopBridge } from '../../utils/desktop';
import { httpClient } from '../../utils/httpClient';

export const CONNECTION_ERROR_MESSAGE =
  'No se ha podido conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.';

export async function loginRequest(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await httpClient.post<ApiSuccess<LoginResponse>>('/auth/login', body);
  return data.data;
}

/** Web: el token va en la cookie httpOnly. Escritorio: se lee del puente y va en el cuerpo (research R2). */
async function postRefresh(): Promise<LoginResponse> {
  const bridge = getDesktopBridge();
  const refreshToken = bridge ? await bridge.getRefreshToken() : null;
  const body = refreshToken ? { refreshToken } : {};
  const { data } = await httpClient.post<ApiSuccess<LoginResponse>>('/auth/refresh', body);
  return data.data;
}

let pendingRefresh: Promise<LoginResponse> | null = null;

/**
 * Solo un refresh a la vez: dos con el mismo token (p. ej. el doble efecto de StrictMode) contarían
 * como reutilización y revocarían la sesión.
 */
export function refreshRequest(): Promise<LoginResponse> {
  pendingRefresh ??= postRefresh().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

export async function logoutRequest(): Promise<void> {
  await httpClient.post('/auth/logout');
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await httpClient.get<ApiSuccess<AuthUser>>('/auth/me');
  return data.data;
}

/** Errores de conexión: no dicen nada de las credenciales, así que no marcan los campos (002 FR-018). */
const CONNECTION_MESSAGES = new Set<string>([
  CONNECTION_ERROR_MESSAGE,
  DATABASE_MESSAGES.unavailable,
]);

export function isConnectionErrorMessage(message: string | null): boolean {
  return message !== null && CONNECTION_MESSAGES.has(message);
}

/**
 * Mensaje del envelope de error; sin respuesta del servidor, error de conexión (FR-017). Sin base de datos
 * (503 DATABASE_UNAVAILABLE, escritorio) también es de conexión, con su propio mensaje.
 */
export function toAuthErrorMessage(err: unknown): string {
  const body = (err as { response?: { data?: Partial<ApiError> } } | null)?.response?.data;
  if (body?.success !== false || !body.error) return CONNECTION_ERROR_MESSAGE;
  if (body.error.code === DATABASE_ERROR_CODES.unavailable) return DATABASE_MESSAGES.unavailable;
  return body.error.message;
}
