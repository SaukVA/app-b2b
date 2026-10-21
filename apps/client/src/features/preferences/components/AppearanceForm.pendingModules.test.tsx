import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { AuthUser } from '@app/shared';
import { setupStore } from '../../../store/store';
import { sessionRestored } from '../preferencesSlice';
import { AppearanceForm } from './AppearanceForm';

// Con la lista real de módulos implementados (005): ninguna pantalla de negocio se puede elegir como inicio.
// Va en su propio archivo porque AppearanceForm.test.tsx simula los módulos implementados.

const USER: AuthUser = {
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

describe('AppearanceForm con los módulos de negocio pendientes', () => {
  it('no muestra «Pantalla de inicio» y sí el resto de preferencias', () => {
    const store = setupStore({
      auth: { user: USER, accessToken: 'jwt', status: 'succeeded', error: null },
    });
    store.dispatch(sessionRestored(USER));
    render(
      <Provider store={store}>
        <AppearanceForm />
      </Provider>,
    );
    expect(screen.queryByRole('combobox', { name: 'Pantalla de inicio' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Formato de importes' })).toBeTruthy();
  });
});
