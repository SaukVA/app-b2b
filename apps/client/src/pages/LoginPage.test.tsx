import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { DatabaseState, DatabaseSummary, DesktopBridge } from '@app/shared';
import { setupStore } from '../store/store';
import { DATABASE_SETTINGS_PATH, LoginPage } from './LoginPage';

const CONFIGURED: DatabaseSummary = {
  configured: true,
  host: 'db.ejemplo.net:27017',
  maskedUri: 'mongodb://ana:••••••••@db.ejemplo.net:27017/ventas?tls=true',
  persisted: true,
};

const UNCONFIGURED: DatabaseSummary = {
  configured: false,
  host: null,
  maskedUri: null,
  persisted: true,
};

function renderLogin() {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </Provider>,
  );
}

function mockDesktop(summary: DatabaseSummary, state: DatabaseState = 'connected') {
  const bridge = {
    isDesktop: true,
    getDatabase: jest.fn().mockResolvedValue(summary),
    getDatabaseStatus: jest.fn().mockResolvedValue({ state }),
  };
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
    const bridge = mockDesktop(UNCONFIGURED, 'unconfigured');
    renderLogin();
    expect(await screen.findByText('Sin configurar')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Configurar base de datos' }).getAttribute('href'),
    ).toBe(DATABASE_SETTINGS_PATH);
    expect(bridge.getDatabase).toHaveBeenCalledTimes(1);
  });

  it('en escritorio configurado: host y «Cambiar base de datos»', async () => {
    mockDesktop(CONFIGURED);
    renderLogin();
    expect(await screen.findByText('db.ejemplo.net:27017')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cambiar base de datos' })).toBeTruthy();
  });

  it('la ruta de configuración es /ajustes/base-de-datos', () => {
    expect(DATABASE_SETTINGS_PATH).toBe('/ajustes/base-de-datos');
  });
});

describe('LoginPage · estado real de la base de datos (US2, FR-005)', () => {
  it('con la base de datos accesible muestra «Conectado»', async () => {
    mockDesktop(CONFIGURED, 'connected');
    renderLogin();
    expect(await screen.findByText('Conectado')).toBeTruthy();
  });

  it('con la base de datos inaccesible muestra «Sin conexión»', async () => {
    mockDesktop(CONFIGURED, 'disconnected');
    renderLogin();
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
  });

  it('con usuario y contraseña en la cadena solo muestra el host (FR-006)', async () => {
    mockDesktop(CONFIGURED, 'connected');
    renderLogin();
    await screen.findByText('Conectado');
    expect(document.body.textContent).not.toContain('ana');
    expect(document.body.textContent).not.toContain('••••••••');
  });
});

describe('LoginPage · sin comprobación periódica (FR-005)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('pide el estado una sola vez al montar', async () => {
    const bridge = mockDesktop(CONFIGURED, 'connected');
    renderLogin();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });
    expect(bridge.getDatabaseStatus).toHaveBeenCalledTimes(1);
    expect(bridge.getDatabase).toHaveBeenCalledTimes(1);
  });
});
