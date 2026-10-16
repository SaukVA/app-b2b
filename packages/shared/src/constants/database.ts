// Base de datos configurable en escritorio (specs/002-desktop-local-backend/data-model.md).

/** Longitud máxima de una cadena de conexión recibida por IPC (contracts/desktop-bridge.md). */
export const DATABASE_URI_MAX_LENGTH = 2048;

export const DATABASE_ERROR_CODES = {
  uriInvalid: 'DATABASE_URI_INVALID',
  tlsRequired: 'DATABASE_TLS_REQUIRED',
  unreachable: 'DATABASE_UNREACHABLE',
  authFailed: 'DATABASE_AUTH_FAILED',
  unavailable: 'DATABASE_UNAVAILABLE',
} as const;

export const DATABASE_MESSAGES = {
  /** Se completa con el motivo concreto. */
  uriInvalidPrefix: 'La cadena de conexión no es válida: ',
  tlsRequired: 'Las bases de datos remotas exigen conexión cifrada (tls=true o mongodb+srv).',
  unavailable: 'No se puede conectar con la base de datos.',
} as const;
