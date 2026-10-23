import { render, screen } from '@testing-library/react';
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
