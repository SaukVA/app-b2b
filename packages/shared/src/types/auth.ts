import type { AppModule, PermissionLevel } from '../constants/roles';
import type { HomeScreen, Role } from './user';

export type ClientKind = 'web' | 'desktop';

export interface AuthUser {
  id: string;
  login: string;
  name: string;
  role: Role;
  roleName: string;
  /** Permisos del rol leídos de la colección `roles`; completos (ausentes = `none`). */
  permissions: Record<AppModule, PermissionLevel>;
  isBootstrap: boolean;
  homeScreen: HomeScreen | null;
}

export interface LoginRequest {
  login: string;
  password: string;
  persistent: boolean;
  client: ClientKind;
}

export interface LoginResponse {
  accessToken: string;
  /** Solo con client = 'desktop'; en web va en la cookie httpOnly. */
  refreshToken?: string;
  /** Solo en /auth/refresh: el escritorio lo necesita para decidir si guarda el token rotado en disco. */
  persistent?: boolean;
  user: AuthUser;
}
