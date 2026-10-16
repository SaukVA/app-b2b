// Punto de entrada de @app/shared: tipos y constantes de dominio compartidos.
export type { ApiSuccess, ApiError, ApiResponse } from './types/api';
export type { Role, UserStatus, HomeScreen } from './types/user';
export type { ClientKind, AuthUser, LoginRequest, LoginResponse } from './types/auth';
export type {
  DesktopBridge,
  DatabaseSummary,
  DatabaseState,
  DatabaseTestErrorCode,
  DatabaseTestResult,
  DatabaseSaveResult,
  BackendToMainMessage,
  MainToBackendMessage,
} from './types/desktop';
export type { AppModule, PermissionLevel } from './constants/roles';
export { ROLES, PERMISSIONS, can } from './constants/roles';
export * from './constants/auth';
export * from './constants/database';
export type { ParsedMongoUri, ParseMongoUriResult } from './utils/mongoUri';
export { parseMongoUri } from './utils/mongoUri';
