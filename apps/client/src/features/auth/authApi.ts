import type { ApiError, ApiSuccess, AuthUser, LoginRequest, LoginResponse } from '@app/shared';
import { httpClient } from '../../utils/httpClient';

export const CONNECTION_ERROR_MESSAGE =
  'No se ha podido conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.';

export async function loginRequest(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await httpClient.post<ApiSuccess<LoginResponse>>('/auth/login', body);
  return data.data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await httpClient.get<ApiSuccess<AuthUser>>('/auth/me');
  return data.data;
}

/** Mensaje del envelope de error; si no hubo respuesta del servidor, error de conexión (FR-017). */
export function toAuthErrorMessage(err: unknown): string {
  const body = (err as { response?: { data?: Partial<ApiError> } } | null)?.response?.data;
  if (body?.success === false && body.error) return body.error.message;
  return CONNECTION_ERROR_MESSAGE;
}
