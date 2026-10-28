import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { SupplierDetail } from '@app/shared';
import { setupStore } from '../../../store/store';
import { formatMoney } from '../../../utils/money';
import { SupplierDetailView } from './SupplierDetailView';

const ADMIN = { id: 'u1', login: 'admin' };
const MARTA = { id: 'u2', login: 'marta' };

const FULL: SupplierDetail = {
  id: 's1',
  name: 'Aceites del Sur S.L.',
  cif: 'B12345674',
  foreign: false,
  address: 'Calle del Olivo, 12',
  postalCode: '46988',
  city: 'Paterna',
  contactPerson: 'Lucía Pérez',
  phones: [
    { label: 'Pedidos', value: '961 234 567' },
    { label: null, value: '600 111 222' },
  ],
  emails: [{ label: 'Facturación', value: 'facturas@aceites.es' }],
  paymentMethod: 'DIRECT_DEBIT',
  iban: 'ES9121000418450200051332',
  web: 'https://www.aceites.es',
  leadTimeDays: 3,
  minOrder: 150,
  notes: 'Entregan solo por la mañana.',
  active: true,
  version: 2,
  yearPurchases: 0,
  quarterPurchases: [0, 0, 0, 0],
  createdBy: ADMIN,
  // 26/10/2026 ya es horario de invierno en Madrid (UTC+1).
  createdAt: '2026-10-26T09:30:00.000Z',
  updatedBy: MARTA,
  updatedAt: '2026-10-27T16:05:00.000Z',
};

const EMPTY: SupplierDetail = {
  ...FULL,
  contactPerson: null,
  phones: [],
  emails: [],
  iban: null,
  web: null,
  leadTimeDays: null,
  minOrder: null,
  notes: null,
};

function renderView(supplier: SupplierDetail) {
  render(
    <Provider store={setupStore()}>
      <SupplierDetailView supplier={supplier} year={2026} />
    </Provider>,
  );
}

const section = (name: string) => screen.getByRole('region', { name });
/** Valor (dd) de un dato (dt) dentro de una sección. */
function valueOf(sectionName: string, label: string): HTMLElement {
  const term = within(section(sectionName)).getByText(label, { selector: 'dt' });
  return term.nextElementSibling as HTMLElement;
}

describe('SupplierDetailView · datos fiscales, contacto y pago (FR-012, FR-013)', () => {
  beforeEach(() => renderView(FULL));

  it('muestra los datos fiscales', () => {
    expect(valueOf('Datos fiscales', 'Nombre').textContent).toBe('Aceites del Sur S.L.');
    expect(valueOf('Datos fiscales', 'CIF').textContent).toBe('B12345674');
    expect(valueOf('Datos fiscales', 'Dirección').textContent).toBe('Calle del Olivo, 12');
    expect(valueOf('Datos fiscales', 'Código postal').textContent).toBe('46988');
    expect(valueOf('Datos fiscales', 'Población').textContent).toBe('Paterna');
  });

  it('muestra los teléfonos como tel: y los correos como mailto:, con su etiqueta o «sin etiqueta»', () => {
    const contact = section('Contacto');
    expect(valueOf('Contacto', 'Persona de contacto').textContent).toBe('Lucía Pérez');
    expect(within(contact).getByText('Teléfono · Pedidos')).toBeTruthy();
    expect(within(contact).getByText('Teléfono · sin etiqueta')).toBeTruthy();
    expect(within(contact).getByRole('link', { name: '961 234 567' }).getAttribute('href')).toBe(
      'tel:961234567',
    );
    expect(
      within(contact).getByRole('link', { name: 'facturas@aceites.es' }).getAttribute('href'),
    ).toBe('mailto:facturas@aceites.es');
    expect(within(contact).getByText('Correo · Facturación')).toBeTruthy();
  });

  it('muestra la forma de pago con su texto y el IBAN en grupos de 4', () => {
    expect(valueOf('Pago', 'Forma de pago').textContent).toBe('Domiciliación bancaria');
    expect(valueOf('Pago', 'IBAN').textContent).toBe('ES91 2100 0418 4502 0005 1332');
  });
});

describe('SupplierDetailView · compras, pedidos y pie (FR-012, FR-013)', () => {
  beforeEach(() => renderView(FULL));

  it('muestra las compras del año con los cuatro trimestres, sin IVA', () => {
    const purchases = section('Compras 2026');
    expect(within(purchases).getByText('Importes sin IVA')).toBeTruthy();
    for (const quarter of ['1T', '2T', '3T', '4T']) {
      expect(within(purchases).getByText(quarter)).toBeTruthy();
    }
    expect(within(purchases).getAllByText(formatMoney(0, 'es'))).toHaveLength(5);
  });

  it('muestra la web como enlace externo, el plazo en días y el pedido mínimo como importe', () => {
    const web = within(section('Pedidos')).getByRole('link', { name: 'www.aceites.es' });
    expect(web.getAttribute('href')).toBe('https://www.aceites.es');
    expect(web.getAttribute('target')).toBe('_blank');
    expect(web.getAttribute('rel')).toContain('noopener');
    expect(valueOf('Pedidos', 'Plazo de entrega').textContent).toBe('3 días');
    expect(valueOf('Pedidos', 'Pedido mínimo').textContent).toBe(formatMoney(150, 'es'));
  });

  it('muestra las observaciones', () => {
    expect(within(section('Observaciones')).getByText('Entregan solo por la mañana.')).toBeTruthy();
  });

  it('muestra quién creó y quién modificó el proveedor, con fecha y hora de Madrid (FR-012b)', () => {
    expect(screen.getByText('Creado por admin el 26/10/2026 10:30')).toBeTruthy();
    expect(screen.getByText('Modificado por marta el 27/10/2026 17:05')).toBeTruthy();
  });

  it('no ofrece ninguna acción de edición', () => {
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SupplierDetailView · datos vacíos', () => {
  beforeEach(() => renderView(EMPTY));

  it('muestra «—» en los datos que no se conocen', () => {
    expect(valueOf('Contacto', 'Persona de contacto').textContent).toBe('—');
    expect(valueOf('Pago', 'IBAN').textContent).toBe('—');
    expect(valueOf('Pedidos', 'Web').textContent).toBe('—');
    expect(valueOf('Pedidos', 'Plazo de entrega').textContent).toBe('—');
  });

  it('dice «Sin pedido mínimo» y «Sin observaciones.»', () => {
    expect(valueOf('Pedidos', 'Pedido mínimo').textContent).toBe('Sin pedido mínimo');
    expect(within(section('Observaciones')).getByText('Sin observaciones.')).toBeTruthy();
  });

  it('el plazo de un día va en singular', () => {
    document.body.innerHTML = '';
    renderView({ ...EMPTY, leadTimeDays: 1 });
    expect(valueOf('Pedidos', 'Plazo de entrega').textContent).toBe('1 día');
  });
});

describe('SupplierDetailView · extranjero', () => {
  it('marca el CIF de un proveedor extranjero', () => {
    renderView({ ...FULL, foreign: true, cif: 'IT01234567890' });
    expect(valueOf('Datos fiscales', 'CIF').textContent).toBe('IT01234567890 (extranjero)');
  });
});
