import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuthUser, DatabaseSaveResult, DesktopBridge } from '@app/shared';
import { setupStore } from '../store/store';
import { DatabaseSettingsPage } from './DatabaseSettingsPage';
import { DATABASE_SETTINGS_PATH } from './LoginPage';

const URI = 'mongodb://localhost:27017/escritorio';

const SAVED: DatabaseSaveResult = {
  ok: true,
  summary: { configured: true, host: 'localhost:27017', maskedUri: URI, persisted: true },
};

function mockDesktop(saveResult: DatabaseSaveResult = SAVED) {
  const bridge = {
    isDesktop: true,
    getDatabase: jest
      .fn()
      .mockResolvedValue({ configured: false, host: null, maskedUri: null, persisted: true }),
    saveDatabase: jest.fn().mockResolvedValue(saveResult),
  };
  window.desktop = bridge as unknown as DesktopBridge;
  return bridge;
}

function renderPage(store = setupStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[DATABASE_SETTINGS_PATH]}>
        <Routes>
          <Route path={DATABASE_SETTINGS_PATH} element={<DatabaseSettingsPage />} />
          <Route path="/login" element={<h1>Pantalla de login</h1>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

afterEach(() => {
  delete window.desktop;
});

describe('DatabaseSettingsPage', () => {
  it('muestra el título «Base de datos» y el formulario', () => {
    mockDesktop();
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Base de datos' })).toBeTruthy();
    expect(screen.getByLabelText('Cadena de conexión')).toBeTruthy();
  });

  it('tras guardar correctamente vuelve al login', async () => {
    const bridge = mockDesktop();
    renderPage();
    await userEvent.type(screen.getByLabelText('Cadena de conexión'), URI);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
    expect(bridge.saveDatabase).toHaveBeenCalledWith(URI);
  });

  it('«Volver» lleva al login sin guardar nada', async () => {
    const bridge = mockDesktop();
    renderPage();
    await userEvent.click(screen.getByRole('link', { name: 'Volver' }));
    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
    expect(bridge.saveDatabase).not.toHaveBeenCalled();
  });
});

const user: AuthUser = {
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

const withSession = () =>
  setupStore({ auth: { user, accessToken: 'jwt', status: 'succeeded', error: null } });

describe('DatabaseSettingsPage · sesiones al cambiar de base de datos (US3, FR-012)', () => {
  it('tras guardar con ok la sesión del cliente queda limpia antes de volver al login', async () => {
    mockDesktop();
    const store = renderPage(withSession());
    await userEvent.type(screen.getByLabelText('Cadena de conexión'), URI);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.accessToken).toBeNull();
  });

  it('si el guardado falla la sesión sigue intacta', async () => {
    mockDesktop({ ok: false, code: 'DATABASE_URI_INVALID', message: 'No válida.' });
    const store = renderPage(withSession());
    await userEvent.type(screen.getByLabelText('Cadena de conexión'), 'mongodb://x');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('No válida.')).toBeTruthy();
    expect(store.getState().auth.user).toEqual(user);
    expect(store.getState().auth.accessToken).toBe('jwt');
  });
});
