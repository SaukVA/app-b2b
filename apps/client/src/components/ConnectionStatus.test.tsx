import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ServerStatus, type ServerStatusProps } from './ServerStatus';

function renderStatus(props: Partial<ServerStatusProps> = {}) {
  render(
    <MemoryRouter>
      <ServerStatus
        url="http://erp.empresa.local/api"
        reachable
        settingsHref="/ajustes/servidor"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('ServerStatus', () => {
  it('muestra la dirección del servidor en monoespaciada', () => {
    renderStatus();
    const url = screen.getByText('http://erp.empresa.local/api');
    expect(url.tagName).toBe('CODE');
  });

  it('expresa el estado como texto, no solo con el color', () => {
    renderStatus({ reachable: true });
    expect(screen.getByText('Conectado')).toBeTruthy();
  });

  it('sin conexión lo dice en texto', () => {
    renderStatus({ reachable: false });
    expect(screen.getByText('Sin conexión')).toBeTruthy();
  });

  it('mientras se comprueba muestra "Comprobando…"', () => {
    renderStatus({ reachable: null });
    expect(screen.getByText('Comprobando…')).toBeTruthy();
  });

  it('enlaza a "Cambiar servidor"', () => {
    renderStatus();
    expect(screen.getByRole('link', { name: 'Cambiar servidor' }).getAttribute('href')).toBe(
      '/ajustes/servidor',
    );
  });
});
