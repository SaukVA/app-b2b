import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { can, type AppModule } from '@app/shared';
import { selectIsAuthenticated, selectUser } from '../features/auth/authSelectors';
import { useAppSelector } from '../store/store';
import { resolveHomeRoute } from './homeRoute';

export interface RequireAuthProps {
  /** Si se indica, además exige permiso de lectura sobre el módulo. */
  module?: AppModule;
  children?: ReactNode;
}

/** FR-007: sin sesión, a /login conservando la ruta de origen; sin permiso, a la pantalla por defecto. */
export function RequireAuth({ module, children }: RequireAuthProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const location = useLocation();
  if (!isAuthenticated || !user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (module && !can(user.role, module, 'view')) {
    return <Navigate to={resolveHomeRoute(user, null)} replace />;
  }
  return children ?? <Outlet />;
}
