import type {
  ApiSuccess,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UserStatus,
  UserSummary,
} from '@app/shared';
import { httpClient } from '../../utils/httpClient';
import { toAuthErrorMessage } from '../auth/authApi';

// Llamadas a /users (contracts/users-api.openapi.yaml). Las funciones llegan con cada historia (US1–US5);
// los componentes nunca llaman a la API: lo hacen los thunks de usersSlice (ADR 0001).

/** Mensaje del envelope de error (indica el campo o la regla, FR-023); sin respuesta, el de conexión. */
export function toUsersErrorMessage(err: unknown): string {
  return toAuthErrorMessage(err);
}

/** Usuarios reales ordenados por nombre (GET /users), sin la cuenta inicial. */
export async function fetchUsers(): Promise<UserSummary[]> {
  const { data } = await httpClient.get<ApiSuccess<UserSummary[]>>('/users');
  return data.data;
}

/** Alta directa (POST /users). Con el primer Administrador, `bootstrapRetired` es true. */
export async function createUserRequest(body: CreateUserRequest): Promise<CreateUserResponse> {
  const { data } = await httpClient.post<ApiSuccess<CreateUserResponse>>('/users', body);
  return data.data;
}

/** Corrige nombre, email y/o rol (PATCH /users/:id); las sesiones del usuario no se cierran. */
export async function updateUserRequest(id: string, body: UpdateUserRequest): Promise<UserSummary> {
  const { data } = await httpClient.patch<ApiSuccess<UserSummary>>(`/users/${id}`, body);
  return data.data;
}

/** Bloquea (revoca sus sesiones) o desbloquea (PATCH /users/:id/status). */
export async function setUserStatusRequest(id: string, status: UserStatus): Promise<UserSummary> {
  const { data } = await httpClient.patch<ApiSuccess<UserSummary>>(`/users/${id}/status`, {
    status,
  });
  return data.data;
}

/** Pone una contraseña nueva (PUT /users/:id/password); cierra todas las sesiones del usuario. */
export async function resetUserPasswordRequest(id: string, password: string): Promise<void> {
  await httpClient.put<ApiSuccess<null>>(`/users/${id}/password`, { password });
}
