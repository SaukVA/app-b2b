// Punto de entrada de @app/shared: tipos y constantes de dominio compartidos.
export type { ApiSuccess, ApiError, ApiResponse } from './types/api';
export type { Role, UserStatus, HomeScreen } from './types/user';
export type { ClientKind, AuthUser, LoginRequest, LoginResponse } from './types/auth';
export type { DesktopBridge } from './types/desktop';
export type { AppModule, PermissionLevel } from './constants/roles';
export { ROLES, PERMISSIONS, can } from './constants/roles';
export * from './constants/auth';
