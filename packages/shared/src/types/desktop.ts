// Puente expuesto por apps/desktop/src/preload.ts como window.desktop
// (specs/002-desktop-local-backend/contracts/desktop-bridge.md, v2).

/** Resumen de la base de datos configurada: nunca incluye la cadena completa (FR-015). */
export interface DatabaseSummary {
  configured: boolean;
  /** Hosts sin credenciales; null si no hay configuración. */
  host: string | null;
  /** Cadena con la contraseña sustituida por ••••••••; null si no hay configuración. */
  maskedUri: string | null;
  /** false si se guardó solo en memoria porque el sistema no permite cifrar (FR-017). */
  persisted: boolean;
}

export type DatabaseState = 'unconfigured' | 'connected' | 'disconnected';

export type DatabaseTestErrorCode =
  | 'DATABASE_URI_INVALID'
  | 'DATABASE_TLS_REQUIRED'
  | 'DATABASE_UNREACHABLE'
  | 'DATABASE_AUTH_FAILED';

export type DatabaseTestResult =
  | { ok: true }
  | { ok: false; code: DatabaseTestErrorCode; message: string };

export type DatabaseSaveResult = DatabaseTestResult & { summary?: DatabaseSummary };

export interface DesktopBridge {
  readonly isDesktop: true;
  /** URL del backend local (http://127.0.0.1:<puerto>/api). Espera a que esté listo, como mucho 10 s. */
  getServerUrl(): Promise<string>;
  getDatabase(): Promise<DatabaseSummary>;
  /** Estado real de la base de datos (5 s como máximo). */
  getDatabaseStatus(): Promise<{ state: DatabaseState }>;
  /** Valida y prueba una cadena sin guardarla (10 s como máximo). */
  testDatabase(uri: string): Promise<DatabaseTestResult>;
  /** Valida, guarda cifrada, borra la sesión del equipo y reinicia el backend. */
  saveDatabase(uri: string): Promise<DatabaseSaveResult>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string, persistent: boolean): Promise<void>;
  clearRefreshToken(): Promise<void>;
}

// Mensajes entre el proceso principal y el backend embebido (contracts/embedded-backend.md).

export type BackendToMainMessage =
  | { type: 'ready'; port: number }
  | { type: 'test-result'; id: string; result: DatabaseTestResult };

export type MainToBackendMessage = { type: 'test-connection'; id: string; uri: string };
