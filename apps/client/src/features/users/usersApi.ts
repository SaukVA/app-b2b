import { toAuthErrorMessage } from '../auth/authApi';

// Llamadas a /users (contracts/users-api.openapi.yaml). Las funciones llegan con cada historia (US1–US5);
// los componentes nunca llaman a la API: lo hacen los thunks de usersSlice (ADR 0001).

/** Mensaje del envelope de error (indica el campo o la regla, FR-023); sin respuesta, el de conexión. */
export function toUsersErrorMessage(err: unknown): string {
  return toAuthErrorMessage(err);
}
