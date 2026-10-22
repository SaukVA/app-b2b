import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('ProductsListStatus · error (US3)', () => {
  it('muestra el error con role="alert" y «Reintentar», sin el aviso de catálogo pendiente', () => {
    render(<ProductsListStatus status="failed" total={0} onRetry={jest.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain(
      'No se ha podido cargar el listado de productos.',
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByText('Todavía no hay productos')).toBeNull();
  });

  it('«Reintentar» llama a onRetry una vez', async () => {
    const onRetry = jest.fn();
    render(<ProductsListStatus status="failed" total={0} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
