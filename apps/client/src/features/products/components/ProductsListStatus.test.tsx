import { render, screen } from '@testing-library/react';
import { ProductsListStatus } from './ProductsListStatus';

describe('ProductsListStatus (US2)', () => {
  it('cargando: «Cargando productos…» con role="status", sin aviso ni error', () => {
    render(<ProductsListStatus status="loading" total={0} onRetry={jest.fn()} />);
    expect(screen.getByRole('status').textContent).toBe('Cargando productos…');
    expect(screen.queryByText('Todavía no hay productos')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('listado vacío: aviso de catálogo pendiente de carga', () => {
    render(<ProductsListStatus status="succeeded" total={0} onRetry={jest.fn()} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Todavía no hay productos');
    expect(status.textContent).toContain('El catálogo se cargará desde el sistema anterior.');
  });

  it('con productos no muestra nada', () => {
    const { container } = render(
      <ProductsListStatus status="succeeded" total={3} onRetry={jest.fn()} />,
    );
    expect(container.textContent).toBe('');
  });
});
