import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { SupplierListItem } from '@app/shared';
import { setupStore } from '../../../store/store';
import { formatMoney } from '../../../utils/money';
import { SuppliersTable } from './SuppliersTable';

const ACEITES: SupplierListItem = {
  id: 's1',
  name: 'Aceites del Sur',
  cif: 'B12345674',
  city: 'Paterna',
  leadTimeDays: 3,
  quarterPurchases: 11570.4,
  yearPurchases: 48210,
  active: true,
};

function renderTable(rows: SupplierListItem[]) {
  render(
    <Provider store={setupStore()}>
      <SuppliersTable rows={rows} quarter={2} />
    </Provider>,
  );
  return screen.getByRole('table', { name: 'Proveedores' });
}

const firstRow = (table: HTMLElement) => within(table).getAllByRole('row')[1];

describe('SuppliersTable', () => {
  it('sin filas muestra las cabeceras del diseño, con el trimestre elegido, y ninguna de acciones', () => {
    const table = renderTable([]);
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual(['Proveedor', 'CIF', 'Plazo', 'Gasto 2T', 'Compras año']);
    expect(within(table).getAllByRole('row')).toHaveLength(1);
  });

  it('pinta un proveedor activo con población, CIF, plazo, gasto del trimestre y compras, sin «Baja»', () => {
    const row = firstRow(renderTable([ACEITES]));
    expect(within(row).getByText('Aceites del Sur')).toBeTruthy();
    expect(within(row).getByText('Paterna')).toBeTruthy();
    expect(within(row).getByText('B12345674')).toBeTruthy();
    expect(within(row).getByText('3 días')).toBeTruthy();
    expect(within(row).getByText(formatMoney(11570.4, 'es'))).toBeTruthy();
    expect(within(row).getByText(formatMoney(48210, 'es'))).toBeTruthy();
    expect(within(row).queryByText('Baja')).toBeNull();
  });

  it('un proveedor dado de baja lleva el sello «Baja» neutro junto al nombre', () => {
    const row = firstRow(renderTable([{ ...ACEITES, active: false }]));
    const stamp = within(row).getByText('Baja');
    expect(stamp.closest('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
  });

  it('sin plazo conocido muestra «—»', () => {
    const row = firstRow(renderTable([{ ...ACEITES, leadTimeDays: null }]));
    expect(within(row).getByText('—')).toBeTruthy();
  });
});

describe('SuppliersTable · tarjeta móvil (FR-021b)', () => {
  it('muestra solo el proveedor (con su población) y las compras del año', () => {
    renderTable([ACEITES]);
    const card = screen.getByRole('article');
    expect(within(card).getByText('Aceites del Sur')).toBeTruthy();
    expect(within(card).getByText('Paterna')).toBeTruthy();
    expect(within(card).getByText(formatMoney(48210, 'es'))).toBeTruthy();
    expect(within(card).queryByText('B12345674')).toBeNull();
    expect(within(card).queryByText('3 días')).toBeNull();
    expect(within(card).queryByText(formatMoney(11570.4, 'es'))).toBeNull();
  });

  it('un proveedor dado de baja muestra el sello «Baja»', () => {
    renderTable([{ ...ACEITES, active: false }]);
    expect(within(screen.getByRole('article')).getByText('Baja')).toBeTruthy();
  });
});
