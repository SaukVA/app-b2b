import type { ApiSuccess, CreateUserRequest, CreateUserResponse } from '@app/shared';
import { httpClient } from '../../utils/httpClient';
import { toAuthErrorMessage } from '../auth/authApi';

// Llamadas a /users (contracts/users-api.openapi.yaml). Las funciones llegan con cada historia (US1–US5);
// los componentes nunca llaman a la API: lo hacen los thunks de usersSlice (ADR 0001).

/** Mensaje del envelope de error (indica el campo o la regla, FR-023); sin respuesta, el de conexión. */
export function toUsersErrorMessage(err: unknown): string {
  return toAuthErrorMessage(err);
}

/** Alta directa (POST /users). Con el primer Administrador, `bootstrapRetired` es true. */
export async function createUserRequest(body: CreateUserRequest): Promise<CreateUserResponse> {
  const { data } = await httpClient.post<ApiSuccess<CreateUserResponse>>('/users', body);
  return data.data;
}
