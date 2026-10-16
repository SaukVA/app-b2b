import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ConnectionStatus, type ConnectionStatusProps } from './ConnectionStatus';

function renderStatus(props: Partial<ConnectionStatusProps> = {}) {
  render(
    <MemoryRouter>
      <ConnectionStatus
        label="Base de datos"
        value="db.ejemplo.net:27017"
        state="ok"
        linkText="Cambiar base de datos"
        href="/ajustes/base-de-datos"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('ConnectionStatus', () => {
  it('muestra la etiqueta y el valor en monoespaciada', () => {
    renderStatus();
    expect(screen.getByText(/Base de datos/)).toBeTruthy();
    expect(screen.getByText('db.ejemplo.net:27017').tagName).toBe('CODE');
  });

  it.each([
    ['checking', 'Comprobando…'],
    ['ok', 'Conectado'],
    ['down', 'Sin conexión'],
    ['unconfigured', 'Sin configurar'],
  ] as const)('el estado %s se expresa como texto: «%s»', (state, text) => {
    renderStatus({ state });
    expect(screen.getByRole('status').textContent).toBe(text);
  });

  it('sin valor no pinta el código vacío', () => {
    renderStatus({ value: null, state: 'unconfigured' });
    expect(screen.queryByRole('code')).toBeNull();
    expect(document.querySelector('code')).toBeNull();
  });

  it('el enlace usa linkText y href', () => {
    renderStatus({ linkText: 'Configurar base de datos' });
    expect(
      screen.getByRole('link', { name: 'Configurar base de datos' }).getAttribute('href'),
    ).toBe('/ajustes/base-de-datos');
  });
});
