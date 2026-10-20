import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function user(preferences: AppearancePreferences = SAVED): AuthUser {
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
    preferences,
  };
}

function renderForm(preferences: AppearancePreferences = SAVED) {
  const store = setupStore({
    auth: { user: user(preferences), accessToken: 'jwt', status: 'succeeded', error: null },
  });
  store.dispatch(sessionRestored(user(preferences)));
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

const homeSelect = () =>
  screen.getByRole<HTMLSelectElement>('combobox', { name: 'Pantalla de inicio' });
const optionLabels = (select: HTMLSelectElement) =>
  Array.from(select.options).map((option) => option.textContent);

describe('AppearanceForm · Pantalla de inicio', () => {
  it('solo ofrece las pantallas que el rol puede ver', () => {
    renderForm();
    expect(optionLabels(homeSelect())).toEqual(['Ventas', 'Clientes', 'Productos', 'Cobros']);
  });

  it('con una pantalla guardada sin permiso, muestra la pantalla por defecto efectiva', () => {
    renderForm({ ...SAVED, homeScreen: 'proveedores' });
    expect(homeSelect().value).toBe('productos');
  });

  it('al elegir Clientes la guarda', async () => {
    mockedUpdate.mockResolvedValue({ ...SAVED, homeScreen: 'clientes' });
    renderForm();
    await userEvent.selectOptions(homeSelect(), 'clientes');
    expect(mockedUpdate).toHaveBeenCalledWith({ homeScreen: 'clientes' });
    expect(homeSelect().value).toBe('clientes');
  });

  it('si no se pudo guardar, lo reintenta al salir del selector (FR-004)', async () => {
    mockedUpdate.mockRejectedValueOnce(new Error('sin conexión'));
    mockedUpdate.mockResolvedValueOnce({ ...SAVED, homeScreen: 'clientes' });
    const store = renderForm();
    await userEvent.selectOptions(homeSelect(), 'clientes');
    expect(store.getState().preferences.saveStatus).toBe('failed');
    fireEvent.blur(homeSelect());
    await waitFor(() => expect(store.getState().preferences.saveStatus).toBe('idle'));
    expect(mockedUpdate).toHaveBeenLastCalledWith({ homeScreen: 'clientes' });
    expect(mockedUpdate).toHaveBeenCalledTimes(2);
  });
});

const moneySelect = () =>
  screen.getByRole<HTMLSelectElement>('combobox', { name: 'Formato de importes' });

describe('AppearanceForm · Formato de importes', () => {
  it('ofrece los dos formatos con el actual seleccionado', () => {
    renderForm();
    expect(optionLabels(moneySelect())).toEqual(['1.248,50 €', '€ 1,248.50']);
    expect(moneySelect().value).toBe('es');
  });

  it('al elegir "€ 1,248.50" lo guarda', async () => {
    mockedUpdate.mockResolvedValue({ ...SAVED, moneyFormat: 'en' });
    renderForm();
    await userEvent.selectOptions(moneySelect(), 'en');
    expect(mockedUpdate).toHaveBeenCalledWith({ moneyFormat: 'en' });
    expect(moneySelect().value).toBe('en');
  });
});

const densityGroup = () => screen.getByRole('radiogroup', { name: 'Densidad de tablas' });

describe('AppearanceForm · Densidad de tablas', () => {
  it('ofrece Cómoda y Compacta con la actual marcada', () => {
    renderForm();
    const radios = within(densityGroup()).getAllByRole('radio');
    expect(radios.map((radio) => radio.textContent?.replace('Seleccionado', ''))).toEqual([
      'Cómoda',
      'Compacta',
    ]);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
  });

  it('al pulsar Compacta la guarda', async () => {
    mockedUpdate.mockResolvedValue({ ...SAVED, tableDensity: 'compact' });
    renderForm();
    await userEvent.click(within(densityGroup()).getByRole('radio', { name: /Compacta/ }));
    expect(mockedUpdate).toHaveBeenCalledWith({ tableDensity: 'compact' });
  });
});
