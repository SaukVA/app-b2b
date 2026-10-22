import { act, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { AppModule, AuthUser, DesktopBridge, PermissionLevel } from '@app/shared';
import { setupStore } from '../../../store/store';
import { refreshSession } from '../../auth/authSlice';
import { AppNav } from './AppNav';

type Permissions = Record<AppModule, PermissionLevel>;

const NO_ACCESS: Permissions = {
  ventas: 'none',
  clientes: 'none',
  productos: 'none',
  proveedores: 'none',
  cobros: 'none',
  ajustes: 'none',
};

const COMERCIAL: Permissions = {
  ...NO_ACCESS,
  ventas: 'edit',
  clientes: 'edit',
  productos: 'view',
  cobros: 'view',
};
const ALMACEN: Permissions = {
  ...NO_ACCESS,
  ventas: 'view',
  productos: 'edit',
  proveedores: 'view',
};

const user = (role: string, permissions: Permissions): AuthUser => ({
  id: '1',
  login: 'ana@empresa.es',
  name: 'Ana',
  role,
  roleName: role,
  permissions,
  isBootstrap: false,
  preferences: { theme: 'light', tableDensity: 'comfortable', moneyFormat: 'es', homeScreen: null },
});

function renderAppNav(authUser: AuthUser = user('Comercial', COMERCIAL)) {
  const store = setupStore({
    auth: {
      user: authUser,
      accessToken: 'jwt',
      status: 'succeeded',
      error: null,
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AppNav />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

const nav = () => screen.getByRole('navigation', { name: 'Principal' });
const linkNames = () =>
  within(nav())
    .getAllByRole('link')
    // Los módulos de negocio pendientes terminan su texto en «Pendiente» (005).
    .map((link) => link.textContent?.replace('Pendiente', ''));

describe('AppNav', () => {
  it('muestra los módulos que el rol puede ver y Ajustes', () => {
    renderAppNav();
    expect(linkNames()).toEqual(['Ventas', 'Clientes', 'Productos', 'Cobros', 'Ajustes']);
  });

  it('cambia con los permisos de la sesión renovada, sin volver a montar el menú (FR-005)', () => {
    const store = renderAppNav();
    const before = nav();
    act(() => {
      store.dispatch(
        refreshSession.fulfilled({ accessToken: 'jwt2', user: user('Almacén', ALMACEN) }, ''),
      );
    });
    expect(nav()).toBe(before);
    expect(linkNames()).toEqual(['Ventas', 'Productos', 'Proveedores', 'Ajustes']);
  });
});

describe('AppNav · sin marca (008, FR-001)', () => {
  afterEach(() => localStorage.clear());

  it.each([
    ['desplegado', '0'],
    ['plegado', '1'],
  ])('%s no muestra «Venta a mayoristas» ni el logotipo', (_state, collapsed) => {
    localStorage.setItem('navigation.collapsed', collapsed);
    renderAppNav();
    expect(within(nav()).queryByText('Venta a mayoristas')).toBeNull();
    expect(within(nav()).queryByText('M')).toBeNull();
  });
});

describe('AppNav · pie', () => {
  afterEach(() => {
    delete window.desktop;
  });

  it('muestra el nombre, el rol y el canal Web (FR-007)', () => {
    renderAppNav();
    expect(within(nav()).getByText('Ana')).toBeTruthy();
    expect(within(nav()).getByText('Comercial · Web')).toBeTruthy();
  });

  it('en la aplicación de escritorio el canal es Escritorio', () => {
    window.desktop = {} as unknown as DesktopBridge;
    renderAppNav();
    expect(within(nav()).getByText('Comercial · Escritorio')).toBeTruthy();
  });

  it('con la cuenta inicial muestra su nombre y su rol', () => {
    renderAppNav({
      ...user('Administrador', COMERCIAL),
      login: 'admin',
      name: 'Administrador inicial',
      isBootstrap: true,
    });
    expect(within(nav()).getByText('Administrador inicial')).toBeTruthy();
    expect(within(nav()).getByText('Administrador · Web')).toBeTruthy();
  });

  it('ofrece «Cerrar sesión» (FR-008)', () => {
    renderAppNav();
    expect(within(nav()).getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });
});
