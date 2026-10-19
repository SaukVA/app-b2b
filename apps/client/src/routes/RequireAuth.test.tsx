import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { AppModule, AuthUser, PermissionLevel, Role } from '@app/shared';
import { setupStore } from '../store/store';
import { resolveHomeRoute } from './homeRoute';
import { RequireAuth } from './RequireAuth';

type Permissions = Record<AppModule, PermissionLevel>;

const NO_ACCESS: Permissions = {
  ventas: 'none',
  clientes: 'none',
  productos: 'none',
  proveedores: 'none',
  cobros: 'none',
  ajustes: 'none',
};

/** Permisos iniciales de FR-020 de los roles que usan estos tests. */
const PERMISSIONS_BY_ROLE: Record<string, Permissions> = {
  Comercial: { ...NO_ACCESS, ventas: 'edit', clientes: 'edit', productos: 'view', cobros: 'view' },
  Almacén: { ...NO_ACCESS, ventas: 'view', productos: 'edit', proveedores: 'view' },
};

const user = (
  role: Role,
  homeScreen: AuthUser['preferences']['homeScreen'] = null,
  permissions: Permissions = PERMISSIONS_BY_ROLE[role] ?? NO_ACCESS,
): AuthUser => ({
  id: '1',
  login: 'ana@empresa.es',
  name: 'Ana',
  role,
  roleName: role,
  permissions,
  isBootstrap: false,
  preferences: { theme: 'light', tableDensity: 'comfortable', moneyFormat: 'es', homeScreen },
});

function LoginProbe() {
  const state = useLocation().state as { from?: string } | null;
  return <p>login desde {state?.from}</p>;
}

function renderAt(path: string, authUser: AuthUser | null) {
  const store = setupStore({
    auth: { user: authUser, accessToken: authUser ? 'jwt' : null, status: 'idle', error: null },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route
            path="/clientes"
            element={
              <RequireAuth module="clientes">
                <p>Clientes</p>
              </RequireAuth>
            }
          />
          <Route
            path="/productos"
            element={
              <RequireAuth module="productos">
                <p>Productos</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('RequireAuth', () => {
  it('sin sesión redirige a /login conservando la ruta de origen', () => {
    renderAt('/clientes?page=2', null);
    expect(screen.getByText('login desde /clientes?page=2')).toBeTruthy();
  });

  it('con sesión y permiso muestra la pantalla', () => {
    renderAt('/clientes', user('Comercial'));
    expect(screen.getByText('Clientes')).toBeTruthy();
  });

  it('concede el acceso según permissions aunque el rol sea desconocido (ADR 0003)', () => {
    renderAt('/clientes', user('Visitas', null, { ...NO_ACCESS, clientes: 'view' }));
    expect(screen.getByText('Clientes')).toBeTruthy();
  });

  it('si el rol no tiene acceso lleva a la pantalla por defecto', () => {
    renderAt('/clientes', user('Almacén'));
    expect(screen.getByText('Productos')).toBeTruthy();
  });
});

describe('resolveHomeRoute', () => {
  it('prioriza la pantalla de origen si el rol puede abrirla', () => {
    expect(resolveHomeRoute(user('Comercial', 'ventas'), '/clientes')).toBe('/clientes');
  });

  it('sin origen usa la pantalla de inicio elegida', () => {
    expect(resolveHomeRoute(user('Comercial', 'ventas'), null)).toBe('/ventas');
  });

  it('sin pantalla elegida usa DEFAULT_HOME_SCREEN', () => {
    expect(resolveHomeRoute(user('Comercial'), null)).toBe('/productos');
  });

  it('ignora el origen y la pantalla elegida si el rol no tiene acceso o no existe', () => {
    expect(resolveHomeRoute(user('Almacén', 'panel'), '/clientes')).toBe('/productos');
    expect(resolveHomeRoute(user('Comercial'), '/login')).toBe('/productos');
  });
});
