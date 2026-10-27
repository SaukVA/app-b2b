import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
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

function renderTable(rows: SupplierListItem[], props: { search?: string; focusId?: string } = {}) {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter>
        <SuppliersTable
          rows={rows}
          quarter={2}
          search={props.search ?? ''}
          focusId={props.focusId}
        />
      </MemoryRouter>
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

describe('SuppliersTable · enlace a la ficha (010 FR-012, FR-014)', () => {
  it('el nombre de cada fila enlaza con su ficha, con la query del listado', () => {
    const row = firstRow(renderTable([ACEITES], { search: 'q=aceite&page=2' }));
    expect(within(row).getByRole('link', { name: 'Aceites del Sur' }).getAttribute('href')).toBe(
      '/proveedores/s1?q=aceite&page=2',
    );
  });

  it('sin criterios el enlace no lleva query', () => {
    const row = firstRow(renderTable([ACEITES]));
    expect(within(row).getByRole('link', { name: 'Aceites del Sur' }).getAttribute('href')).toBe(
      '/proveedores/s1',
    );
  });

  it('la tarjeta móvil también enlaza con la ficha', () => {
    renderTable([ACEITES]);
    const card = screen.getByRole('article');
    expect(
      within(card)
        .getByRole('link', { name: /Aceites del Sur/ })
        .getAttribute('href'),
    ).toBe('/proveedores/s1');
  });

  it('enfoca al montar el enlace de la fila indicada en focusId', () => {
    const table = renderTable([ACEITES, { ...ACEITES, id: 's2', name: 'Bebidas' }], {
      focusId: 's2',
    });
    expect(document.activeElement).toBe(within(table).getByRole('link', { name: 'Bebidas' }));
  });
});
