import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import type { AppearancePreferences, AuthUser } from '@app/shared';
import { setupStore } from '../../../store/store';
import { updatePreferences } from '../preferencesApi';
import { sessionRestored } from '../preferencesSlice';
import { AppearanceForm } from './AppearanceForm';

jest.mock('../preferencesApi', () => ({
  ...jest.requireActual('../preferencesApi'),
  updatePreferences: jest.fn(),
}));

const mockedUpdate = jest.mocked(updatePreferences);

const SAVED: AppearancePreferences = {
  theme: 'light',
  tableDensity: 'comfortable',
  moneyFormat: 'es',
  homeScreen: null,
};

function user(): AuthUser {
  return {
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
    preferences: SAVED,
  };
}

function renderForm() {
  const store = setupStore({
    auth: { user: user(), accessToken: 'jwt', status: 'succeeded', error: null },
  });
  store.dispatch(sessionRestored(user()));
  render(
    <Provider store={store}>
      <AppearanceForm />
    </Provider>,
  );
  return store;
}

const themeGroup = () => screen.getByRole('radiogroup', { name: 'Tema' });

afterEach(() => mockedUpdate.mockReset());

describe('AppearanceForm · Tema', () => {
  it('marca el tema aplicado', () => {
    renderForm();
    const light = within(themeGroup()).getByRole('radio', { name: /Claro/ });
    expect(light.getAttribute('aria-checked')).toBe('true');
  });

  it('al elegir Oscuro lo marca al momento y lo guarda', async () => {
    mockedUpdate.mockReturnValue(new Promise(() => {}));
    const store = renderForm();
    await userEvent.click(within(themeGroup()).getByRole('radio', { name: /Oscuro/ }));
    const dark = within(themeGroup()).getByRole('radio', { name: /Oscuro/ });
    expect(dark.getAttribute('aria-checked')).toBe('true');
    expect(store.getState().preferences.applied?.theme).toBe('dark');
    expect(mockedUpdate).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('cada opción lleva la descripción del tablero', () => {
    renderForm();
    const group = within(themeGroup());
    expect(group.getByText('Papel y tinta. Recomendado para oficina.')).toBeTruthy();
    expect(group.getByText('Menos brillo en turnos largos o poca luz.')).toBeTruthy();
    expect(group.getByText('Sigue la configuración del equipo.')).toBeTruthy();
    expect(group.getByRole('radio', { name: /Según el sistema/ })).toBeTruthy();
  });
});
