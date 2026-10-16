import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import type { AppModule } from '@app/shared';
import { selectUser } from '../features/auth/authSelectors';
import { LogoutButton } from '../features/auth/components/LogoutButton';
import { LoginPage, SERVER_SETTINGS_PATH } from '../pages/LoginPage';
import { ServerSettingsPlaceholder } from '../pages/ServerSettingsPlaceholder';
import { useAppSelector } from '../store/store';
import { isDesktop } from '../utils/desktop';
import { APP_MODULES, resolveHomeRoute } from './homeRoute';
import { RequireAuth } from './RequireAuth';

function RootLayout() {
  return <Outlet />;
}

/** "/" lleva a la pantalla de inicio del usuario o, sin sesión, al login. */
function HomeRedirect() {
  const user = useAppSelector(selectUser);
  return <Navigate to={user ? resolveHomeRoute(user, null) : '/login'} replace />;
}

// Provisional mientras no existan los módulos de dominio.
function ModulePlaceholder({ module }: { module: AppModule }) {
  return (
    <main>
      <h1>{module.charAt(0).toUpperCase() + module.slice(1)}</h1>
      <p>Módulo pendiente de implementar.</p>
      <LogoutButton />
    </main>
  );
}

const moduleRoutes = APP_MODULES.map((module) => ({
  path: module,
  element: (
    <RequireAuth module={module}>
      <ModulePlaceholder module={module} />
    </RequireAuth>
  ),
}));

// Pública y solo en escritorio (FR-018/FR-019): en web /ajustes/servidor cae en la ruta protegida /ajustes.
const desktopRoutes = isDesktop()
  ? [{ path: SERVER_SETTINGS_PATH.slice(1), element: <ServerSettingsPlaceholder /> }]
  : [];

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'login', element: <LoginPage /> },
      ...desktopRoutes,
      ...moduleRoutes,
      { path: '*', element: <HomeRedirect /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
