import { render, screen } from '@testing-library/react';
import { CustomersListStatus } from './CustomersListStatus';

describe('CustomersListStatus (US2)', () => {
  it('cargando: «Cargando clientes…» con role="status", sin aviso ni error', () => {
    render(<CustomersListStatus status="loading" total={0} onRetry={jest.fn()} />);
    expect(screen.getByRole('status').textContent).toBe('Cargando clientes…');
    expect(screen.queryByText('Todavía no hay clientes')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('listado vacío: aviso de cartera pendiente de carga', () => {
    render(<CustomersListStatus status="succeeded" total={0} onRetry={jest.fn()} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Todavía no hay clientes');
    expect(status.textContent).toContain('La cartera se cargará desde el sistema anterior.');
  });

  it('con clientes no muestra nada', () => {
    const { container } = render(
      <CustomersListStatus status="succeeded" total={3} onRetry={jest.fn()} />,
    );
    expect(container.textContent).toBe('');
  });
});
