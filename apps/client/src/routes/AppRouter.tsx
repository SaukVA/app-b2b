import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { selectUser } from '../features/auth/authSelectors';
import { DATABASE_SETTINGS_PATH, LoginPage } from '../pages/LoginPage';
import { AppearanceSettingsPage } from '../pages/AppearanceSettingsPage';
import { DatabaseSettingsPage } from '../pages/DatabaseSettingsPage';
import { ProductsPage } from '../pages/ProductsPage';
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

// Ver o editar Productos muestran la misma pantalla en 006: no hay acciones de edición (FR-003).
const productsRoute = {
  path: 'productos',
  element: (
    <RequireAuth module="productos">
      <ProductsPage />
    </RequireAuth>
  ),
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
      // Pantallas con sesión, con el menú lateral (005 FR-001). Cada módulo de negocio añade aquí su ruta
      // al implementarse (IMPLEMENTED_MODULES); la dirección de un módulo pendiente cae en `*` (FR-011).
      { element: <AppLayout />, children: [productsRoute, settingsRoute] },
      { path: '*', element: <HomeRedirect /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
