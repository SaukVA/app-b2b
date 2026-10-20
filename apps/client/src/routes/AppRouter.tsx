import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { APP_MODULES, type AppModule } from '@app/shared';
import { selectUser } from '../features/auth/authSelectors';
import { LogoutButton } from '../features/auth/components/LogoutButton';
import { DATABASE_SETTINGS_PATH, LoginPage } from '../pages/LoginPage';
import { AppearanceSettingsPage } from '../pages/AppearanceSettingsPage';
import { DatabaseSettingsPage } from '../pages/DatabaseSettingsPage';
import { SettingsIndexRedirect, SettingsPage } from '../pages/SettingsPage';
import { UsersSettingsPage } from '../pages/UsersSettingsPage';
import { useAppSelector } from '../store/store';
import { isDesktop } from '../utils/desktop';
import { AppLayout } from './AppLayout';
import { resolveHomeRoute } from './homeRoute';
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

const moduleRoutes = APP_MODULES.filter((module) => module !== 'ajustes').map((module) => ({
  path: module,
  element: (
    <RequireAuth module={module}>
      <ModulePlaceholder module={module} />
    </RequireAuth>
  ),
}));

// Ajustes solo exige sesión (la pide AppLayout): cada pestaña pide su permiso (Usuarios, `ajustes: edit`).
const settingsRoute = {
  path: 'ajustes',
  element: <SettingsPage />,
  children: [
    { index: true, element: <SettingsIndexRedirect /> },
    // Solo sesión: Apariencia es para todos los roles (004).
    { path: 'apariencia', element: <AppearanceSettingsPage /> },
    {
      path: 'usuarios',
      element: (
        <RequireAuth module="ajustes" level="edit">
          <UsersSettingsPage />
        </RequireAuth>
      ),
    },
  ],
};

// Pública y solo en escritorio (002 FR-007/FR-008): en web la ruta cae en la protegida /ajustes.
const desktopRoutes = isDesktop()
  ? [{ path: DATABASE_SETTINGS_PATH.slice(1), element: <DatabaseSettingsPage /> }]
  : [];

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'login', element: <LoginPage /> },
      ...desktopRoutes,
      // Pantallas con sesión, con el menú lateral (005 FR-001).
      { element: <AppLayout />, children: [...moduleRoutes, settingsRoute] },
      { path: '*', element: <HomeRedirect /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
