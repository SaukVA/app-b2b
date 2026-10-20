import { can, type AppModule, type PermissionLevel } from '@app/shared';
import type { RootState } from '../../store/store';

export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthError = (state: RootState) => state.auth.error;

export const selectIsAuthenticated = (state: RootState): boolean =>
  Boolean(state.auth.user && state.auth.accessToken);

/** Permiso del usuario actual según los permisos de su rol (ADR 0003); sin sesión, ninguno. */
export const selectCan =
  (module: AppModule, level: PermissionLevel) =>
  (state: RootState): boolean => {
    const user = state.auth.user;
    return user ? can(user.permissions, module, level) : false;
  };
