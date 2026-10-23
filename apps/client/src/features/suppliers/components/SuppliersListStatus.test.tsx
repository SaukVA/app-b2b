import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuppliersListStatus } from './SuppliersListStatus';

describe('SuppliersListStatus (US2)', () => {
  it('cargando: «Cargando proveedores…» con role="status", sin aviso ni error', () => {
    render(<SuppliersListStatus status="loading" total={0} onRetry={jest.fn()} />);
    expect(screen.getByRole('status').textContent).toBe('Cargando proveedores…');
    expect(screen.queryByText('Todavía no hay proveedores')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('listado vacío: aviso de proveedores pendientes de carga', () => {
    render(<SuppliersListStatus status="succeeded" total={0} onRetry={jest.fn()} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Todavía no hay proveedores');
    expect(status.textContent).toContain('Los proveedores se cargarán desde el sistema anterior.');
  });

  it('con proveedores no muestra nada', () => {
    const { container } = render(
      <SuppliersListStatus status="succeeded" total={3} onRetry={jest.fn()} />,
    );
    expect(container.textContent).toBe('');
  });
});

describe('SuppliersListStatus · error (US3)', () => {
  it('muestra el error con role="alert" y «Reintentar», sin el aviso de proveedores pendientes', () => {
    render(<SuppliersListStatus status="failed" total={0} onRetry={jest.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain(
      'No se ha podido cargar el listado de proveedores.',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByText('Todavía no hay proveedores')).toBeNull();
  });

  it('«Reintentar» llama a onRetry una vez', async () => {
    const onRetry = jest.fn();
    render(<SuppliersListStatus status="failed" total={0} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
