import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { AuthUser } from '@app/shared';
import { setupStore } from '../../../store/store';
import { sessionRestored } from '../preferencesSlice';
import { AppearanceForm } from './AppearanceForm';

// Con la lista real de módulos implementados (005): de las pantallas de negocio se pueden elegir como inicio
// Clientes (007), Productos (006) y Proveedores (009). Va en su propio archivo porque AppearanceForm.test.tsx
// simula los módulos.

const COMERCIAL: AuthUser = {
  id: '1',
  login: 'ana@empresa.es',
  name: 'Ana',
  role: 'Comercial',
  roleName: 'Comercial',
  permissions: {
    ventas: 'edit',
    clientes: 'edit',
    productos: 'view',
    proveedores: 'none',
    cobros: 'view',
    ajustes: 'none',
  },
  isBootstrap: false,
  preferences: { theme: 'light', tableDensity: 'comfortable', moneyFormat: 'es', homeScreen: null },
};

// Solo ve Cobros, que sigue pendiente: no tiene ninguna pantalla de negocio que elegir.
const COBROS_ONLY: AuthUser = {
  ...COMERCIAL,
  role: 'Compras',
  roleName: 'Compras',
  permissions: {
    ...COMERCIAL.permissions,
    ventas: 'none',
    clientes: 'none',
    productos: 'none',
    cobros: 'edit',
    proveedores: 'none',
  },
};

// Administración ve Clientes, Productos y Proveedores (matriz inicial de 003).
const ADMINISTRACION: AuthUser = {
  ...COMERCIAL,
  role: 'Administración',
  roleName: 'Administración',
  permissions: {
    ventas: 'view',
    clientes: 'view',
    productos: 'view',
    proveedores: 'edit',
    cobros: 'edit',
    ajustes: 'none',
  },
};

function renderFor(user: AuthUser) {
  const store = setupStore({
    auth: { user, accessToken: 'jwt', status: 'succeeded', error: null },
  });
  store.dispatch(sessionRestored(user));
  render(
    <Provider store={store}>
      <AppearanceForm />
    </Provider>,
  );
}

function homeScreenOptions(): string[] {
  const select = screen.getByRole('combobox', { name: 'Pantalla de inicio' });
  return Array.from((select as HTMLSelectElement).options).map((option) => option.text);
}

describe('AppearanceForm con los módulos de negocio pendientes', () => {
  it('«Pantalla de inicio» ofrece al Comercial Clientes y Productos: no ve Proveedores', () => {
    renderFor(COMERCIAL);
    expect(homeScreenOptions()).toEqual(['Clientes', 'Productos']);
  });

  it('«Pantalla de inicio» ofrece a Administración Clientes, Productos y Proveedores (009)', () => {
    renderFor(ADMINISTRACION);
    expect(homeScreenOptions()).toEqual(['Clientes', 'Productos', 'Proveedores']);
  });

  it('sin pantallas implementadas que ver no muestra «Pantalla de inicio» y sí el resto', () => {
    renderFor(COBROS_ONLY);
    expect(screen.queryByRole('combobox', { name: 'Pantalla de inicio' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Formato de importes' })).toBeTruthy();
  });
});
