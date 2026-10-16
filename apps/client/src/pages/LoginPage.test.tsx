import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { DesktopBridge } from '@app/shared';
import { setupStore } from '../store/store';
import { LoginPage } from './LoginPage';

function renderLogin() {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </Provider>,
  );
}

function mockDesktop(reachable: boolean) {
  const bridge = {
    isDesktop: true,
    getServerUrl: jest.fn().mockResolvedValue('http://erp.empresa.local/api'),
    checkServer: jest.fn().mockResolvedValue({ reachable }),
  };
  window.desktop = bridge as unknown as DesktopBridge;
  return bridge;
}

afterEach(() => {
  delete window.desktop;
});

describe('LoginPage · indicador de servidor', () => {
  it('en web no muestra el servidor ni "Cambiar servidor"', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
    expect(screen.queryByText(/Servidor/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Cambiar servidor' })).toBeNull();
  });

  it('en escritorio muestra la dirección y el resultado de checkServer()', async () => {
    const bridge = mockDesktop(true);
    renderLogin();
    expect(await screen.findByText('Conectado')).toBeTruthy();
    expect(screen.getByText('http://erp.empresa.local/api')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cambiar servidor' })).toBeTruthy();
    expect(bridge.checkServer).toHaveBeenCalledTimes(1);
  });

  it('en escritorio indica "Sin conexión" si el servidor no responde', async () => {
    mockDesktop(false);
    renderLogin();
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
  });
});
