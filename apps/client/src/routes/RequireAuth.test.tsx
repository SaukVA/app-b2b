import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { AuthUser, Role } from '@app/shared';
import { setupStore } from '../store/store';
import { resolveHomeRoute } from './homeRoute';
import { RequireAuth } from './RequireAuth';

// react-router 7 necesita TextEncoder, que jsdom no trae: se simulan solo las piezas que usa RequireAuth.
const mockLocation = { pathname: '/clientes', search: '' };
jest.mock('react-router', () => ({
  Navigate: ({ to, state }: { to: string; state?: { from?: string } }) => (
    <p>
      navega a {to}
      {state?.from ? ` desde ${state.from}` : ''}
    </p>
  ),
  Outlet: () => <p>outlet</p>,
  useLocation: () => mockLocation,
}));

const user = (role: Role, homeScreen: AuthUser['homeScreen'] = null): AuthUser => ({
  id: '1',
  login: 'ana@empresa.es',
  name: 'Ana',
  role,
  isBootstrap: false,
  homeScreen,
});

function renderGuard(authUser: AuthUser | null) {
  const store = setupStore({
    auth: { user: authUser, accessToken: authUser ? 'jwt' : null, status: 'idle', error: null },
  });
  render(
    <Provider store={store}>
      <RequireAuth module="clientes">
        <p>Clientes</p>
      </RequireAuth>
    </Provider>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => Object.assign(mockLocation, { pathname: '/clientes', search: '' }));

  it('sin sesión redirige a /login conservando la ruta de origen', () => {
    mockLocation.search = '?page=2';
    renderGuard(null);
    expect(screen.getByText('navega a /login desde /clientes?page=2')).toBeTruthy();
  });

  it('con sesión y permiso muestra la pantalla', () => {
    renderGuard(user('Comercial'));
    expect(screen.getByText('Clientes')).toBeTruthy();
  });

  it('si el rol no tiene acceso lleva a la pantalla por defecto', () => {
    renderGuard(user('Almacén'));
    expect(screen.getByText('navega a /productos')).toBeTruthy();
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
