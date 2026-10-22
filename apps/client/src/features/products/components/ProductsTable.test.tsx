import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ProductListItem } from '@app/shared';
import { setupStore } from '../../../store/store';
import { formatMoney } from '../../../utils/money';
import { ProductsTable } from './ProductsTable';

const ACEITE: ProductListItem = {
  id: 'p1',
  code: 'ACE-001',
  name: 'Aceite de oliva 5 l',
  supplierName: 'Almazara del Sur',
  category: 'Alimentación',
  subcategory: 'Aceites',
  stock: 12,
  minStock: 40,
  price: 1248.5,
  status: 'Stock bajo',
};

function renderTable(rows: ProductListItem[]) {
  render(
    <Provider store={setupStore()}>
      <ProductsTable rows={rows} />
    </Provider>,
  );
  return screen.getByRole('table', { name: 'Productos' });
}

describe('ProductsTable', () => {
  it('sin filas muestra las cabeceras del diseño y ninguna de acciones', () => {
    const table = renderTable([]);
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual(['Código', 'Producto', 'Categoría', 'Stock', 'Precio', 'Estado']);
    expect(within(table).getAllByRole('row')).toHaveLength(1);
  });

  it('pinta una fila con proveedor, categoría › subcategoría, stock / mínimo, precio y estado', () => {
    const table = renderTable([ACEITE]);
    const row = within(table).getAllByRole('row')[1];
    expect(within(row).getByText('ACE-001')).toBeTruthy();
    expect(within(row).getByText('Aceite de oliva 5 l')).toBeTruthy();
    expect(within(row).getByText('Almazara del Sur')).toBeTruthy();
    expect(within(row).getByText('Alimentación › Aceites')).toBeTruthy();
    expect(within(row).getByText('12 / mín. 40')).toBeTruthy();
    expect(within(row).getByText(formatMoney(1248.5, 'es'))).toBeTruthy();
    expect(within(row).getByText('Stock bajo').getAttribute('data-tone')).toBe('warning');
  });

  it.each([
    ['Sin stock', 'danger'],
    ['Disponible', 'ok'],
  ] as const)('el estado %s lleva el tono %s', (status, tone) => {
    const table = renderTable([{ ...ACEITE, status }]);
    expect(within(table).getByText(status).getAttribute('data-tone')).toBe(tone);
  });

  it('la tarjeta móvil no tiene acciones', () => {
    renderTable([ACEITE]);
    const card = screen.getByRole('article');
    expect(within(card).getByText('Aceite de oliva 5 l')).toBeTruthy();
    expect(within(card).queryByRole('button')).toBeNull();
  });
});
