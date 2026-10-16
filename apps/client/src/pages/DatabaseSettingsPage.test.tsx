import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { DesktopBridge } from '@app/shared';
import { setupStore } from '../store/store';
import { DatabaseSettingsPage } from './DatabaseSettingsPage';
import { DATABASE_SETTINGS_PATH } from './LoginPage';

const URI = 'mongodb://localhost:27017/escritorio';

function mockDesktop() {
  const bridge = {
    isDesktop: true,
    saveDatabase: jest.fn().mockResolvedValue({
      ok: true,
      summary: { configured: true, host: 'localhost:27017', maskedUri: URI, persisted: true },
    }),
  };
  window.desktop = bridge as unknown as DesktopBridge;
  return bridge;
}

function renderPage() {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={[DATABASE_SETTINGS_PATH]}>
        <Routes>
          <Route path={DATABASE_SETTINGS_PATH} element={<DatabaseSettingsPage />} />
          <Route path="/login" element={<h1>Pantalla de login</h1>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
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
