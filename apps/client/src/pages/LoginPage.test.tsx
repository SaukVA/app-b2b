import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { DatabaseSummary, DesktopBridge } from '@app/shared';
import { setupStore } from '../store/store';
import { DATABASE_SETTINGS_PATH, LoginPage } from './LoginPage';

function renderLogin() {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </Provider>,
  );
}

function mockDesktop(summary: DatabaseSummary) {
  const bridge = { isDesktop: true, getDatabase: jest.fn().mockResolvedValue(summary) };
  window.desktop = bridge as unknown as DesktopBridge;
  return bridge;
}

afterEach(() => {
  delete window.desktop;
});

describe('LoginPage · indicador de base de datos', () => {
  it('en web no muestra el indicador ni el enlace (FR-008)', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
    expect(screen.queryByText(/Base de datos/)).toBeNull();
    expect(screen.queryByRole('link', { name: /base de datos/ })).toBeNull();
  });

  it('en escritorio sin configurar: «Sin configurar» y «Configurar base de datos»', async () => {
    const bridge = mockDesktop({ configured: false, host: null, maskedUri: null, persisted: true });
    renderLogin();
    expect(await screen.findByText('Sin configurar')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Configurar base de datos' }).getAttribute('href'),
    ).toBe(DATABASE_SETTINGS_PATH);
    expect(bridge.getDatabase).toHaveBeenCalledTimes(1);
  });

  it('en escritorio configurado: host y «Cambiar base de datos»', async () => {
    mockDesktop({
      configured: true,
      host: 'db.ejemplo.net:27017',
      maskedUri: 'mongodb://ana:••••••••@db.ejemplo.net:27017/ventas?tls=true',
      persisted: true,
    });
    renderLogin();
    expect(await screen.findByText('db.ejemplo.net:27017')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cambiar base de datos' })).toBeTruthy();
  });

  it('la ruta de configuración es /ajustes/base-de-datos', () => {
    expect(DATABASE_SETTINGS_PATH).toBe('/ajustes/base-de-datos');
  });
});
