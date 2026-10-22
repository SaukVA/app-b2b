import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('CustomersListStatus · error (US3)', () => {
  it('muestra el error con role="alert" y «Reintentar», sin el aviso de cartera pendiente', () => {
    render(<CustomersListStatus status="failed" total={0} onRetry={jest.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain(
      'No se ha podido cargar el listado de clientes.',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByText('Todavía no hay clientes')).toBeNull();
  });

  it('«Reintentar» llama a onRetry una vez', async () => {
    const onRetry = jest.fn();
    render(<CustomersListStatus status="failed" total={0} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
