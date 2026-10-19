// Punto de entrada de @app/shared: tipos y constantes de dominio compartidos.
export type { ApiSuccess, ApiError, ApiResponse } from './types/api';
export type {
  Role,
  UserStatus,
  HomeScreen,
  UserSummary,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  ResetUserPasswordRequest,
} from './types/user';
export type { RoleSummary } from './types/role';
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
export type { AppModule, PermissionLevel, PermissionSet } from './constants/roles';
export { APP_MODULES, ADMIN_ROLE_KEY, can } from './constants/roles';
export * from './constants/users';
export * from './constants/auth';
export * from './constants/database';
export type { ParsedMongoUri, ParseMongoUriResult } from './utils/mongoUri';
export { parseMongoUri } from './utils/mongoUri';
