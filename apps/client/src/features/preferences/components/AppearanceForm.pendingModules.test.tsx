import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { AuthUser } from '@app/shared';
import { setupStore } from '../../../store/store';
import { sessionRestored } from '../preferencesSlice';
import { AppearanceForm } from './AppearanceForm';

// Con la lista real de módulos implementados (005): de las pantallas de negocio solo Productos (006) se
// puede elegir como inicio. Va en su propio archivo porque AppearanceForm.test.tsx simula los módulos.

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

// Solo ve Proveedores, que sigue pendiente: no tiene ninguna pantalla de negocio que elegir.
const PROVEEDORES_ONLY: AuthUser = {
  ...COMERCIAL,
  role: 'Compras',
  roleName: 'Compras',
  permissions: {
    ...COMERCIAL.permissions,
    ventas: 'none',
    clientes: 'none',
    productos: 'none',
    cobros: 'none',
    proveedores: 'edit',
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

describe('AppearanceForm con los módulos de negocio pendientes', () => {
  it('«Pantalla de inicio» ofrece solo Clientes y Productos, los módulos de negocio implementados', () => {
    renderFor(COMERCIAL);
    const select = screen.getByRole('combobox', { name: 'Pantalla de inicio' });
    const options = Array.from((select as HTMLSelectElement).options).map((option) => option.text);
    expect(options).toEqual(['Clientes', 'Productos']);
  });

  it('sin pantallas implementadas que ver no muestra «Pantalla de inicio» y sí el resto', () => {
    renderFor(PROVEEDORES_ONLY);
    expect(screen.queryByRole('combobox', { name: 'Pantalla de inicio' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Formato de importes' })).toBeTruthy();
  });
});
