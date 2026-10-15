import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { DesktopBridge } from '@app/shared';
import { ServerSettingsPlaceholder } from './ServerSettingsPlaceholder';

afterEach(() => {
  delete window.desktop;
});

it('muestra la URL actual, que la configuración llegará con Ajustes › Base de datos y vuelve al login', async () => {
  window.desktop = {
    isDesktop: true,
    getServerUrl: jest.fn().mockResolvedValue('http://erp.empresa.local/api'),
  } as unknown as DesktopBridge;
  render(
    <MemoryRouter>
      <ServerSettingsPlaceholder />
    </MemoryRouter>,
  );
  expect(await screen.findByText('http://erp.empresa.local/api')).toBeTruthy();
  expect(screen.getByText(/Ajustes › Base de datos/)).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Volver al inicio de sesión' }).getAttribute('href'),
  ).toBe('/login');
});
