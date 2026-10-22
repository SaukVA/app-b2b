import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { CustomerListItem } from '@app/shared';
import { setupStore } from '../../../store/store';
import { formatMoney } from '../../../utils/money';
import { CustomersTable } from './CustomersTable';

const FERRETERIA: CustomerListItem = {
  id: 'c1',
  name: 'Ferretería Turia',
  city: 'Valencia',
  maxRisk: 10000,
  balance: 6200,
  riskUsed: 62,
  lastOrderDate: '2026-10-07',
};

function renderTable(rows: CustomerListItem[]) {
  render(
    <Provider store={setupStore()}>
      <CustomersTable rows={rows} />
    </Provider>,
  );
  return screen.getByRole('table', { name: 'Clientes' });
}

const firstRow = (table: HTMLElement) => within(table).getAllByRole('row')[1];

describe('CustomersTable', () => {
  it('sin filas muestra las cabeceras del diseño y ninguna de acciones', () => {
    const table = renderTable([]);
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual(['Cliente', 'Riesgo usado', 'Saldo', 'Último pedido']);
    expect(within(table).getAllByRole('row')).toHaveLength(1);
  });

  it('pinta una fila con población, riesgo con su barra, saldo y último pedido', () => {
    const row = firstRow(renderTable([FERRETERIA]));
    expect(within(row).getByText('Ferretería Turia')).toBeTruthy();
    expect(within(row).getByText('Valencia')).toBeTruthy();
    expect(within(row).getByText('62 %')).toBeTruthy();
    expect(within(row).getByRole('meter').getAttribute('data-tone')).toBe('warning');
    expect(within(row).getByText(formatMoney(6200, 'es'))).toBeTruthy();
    expect(within(row).getByText('07/10/2026')).toBeTruthy();
  });

  it.each([
    [30, 'ok'],
    [112, 'danger'],
  ] as const)('un riesgo usado de %i % lleva el tono %s', (riskUsed, tone) => {
    const row = firstRow(renderTable([{ ...FERRETERIA, riskUsed }]));
    expect(within(row).getByText(`${riskUsed} %`)).toBeTruthy();
    expect(within(row).getByRole('meter').getAttribute('data-tone')).toBe(tone);
  });

  it('un cliente sin límite muestra «Sin límite» sin barra', () => {
    const row = firstRow(renderTable([{ ...FERRETERIA, maxRisk: null, riskUsed: null }]));
    expect(within(row).getByText('Sin límite')).toBeTruthy();
    expect(within(row).queryByRole('meter')).toBeNull();
  });

  it('sin pedidos muestra «—» y sin población solo el nombre', () => {
    const row = firstRow(renderTable([{ ...FERRETERIA, city: null, lastOrderDate: null }]));
    expect(within(row).getByText('—')).toBeTruthy();
    expect(within(row).queryByText('Valencia')).toBeNull();
    expect(within(row).getByText('Ferretería Turia')).toBeTruthy();
  });
});

describe('CustomersTable · tarjeta móvil (FR-015)', () => {
  it('muestra los mismos datos que la fila, sin acciones', () => {
    renderTable([FERRETERIA]);
    const card = screen.getByRole('article');
    expect(within(card).getByText('Ferretería Turia')).toBeTruthy();
    expect(within(card).getByText('Valencia')).toBeTruthy();
    expect(within(card).getByText('62 %')).toBeTruthy();
    expect(within(card).getByRole('meter')).toBeTruthy();
    expect(within(card).getByText(formatMoney(6200, 'es'))).toBeTruthy();
    expect(within(card).getByText('07/10/2026')).toBeTruthy();
    expect(within(card).queryByRole('button')).toBeNull();
  });

  it('un cliente sin límite muestra «Sin límite»', () => {
    renderTable([{ ...FERRETERIA, maxRisk: null, riskUsed: null }]);
    const card = screen.getByRole('article');
    expect(within(card).getByText('Sin límite')).toBeTruthy();
    expect(within(card).queryByRole('meter')).toBeNull();
  });
});
