import { SupplierModel, type SupplierDocument } from './supplier.model';
import { toSupplierDetail, toSupplierListItem } from './supplier.mapper';

const ADMIN = { id: '000000000000000000000001', login: 'admin' };
const EDITOR = { id: '000000000000000000000002', login: 'compras@empresa.es' };
const TOTALS = { year: 1000, quarters: [100, 200, 300, 400] as [number, number, number, number] };

function supplierDoc(): SupplierDocument {
  const doc = new SupplierModel({
    name: 'Aceites del Sur',
    cif: 'B12345674',
    address: 'Polígono Fuente del Jarro, calle 12',
    postalCode: '46988',
    city: 'Paterna',
    contactPerson: 'Ana',
    phones: [{ label: 'Pedidos', value: '961 000 001' }],
    emails: [{ label: null, value: 'pedidos@aceitesdelsur.example' }],
    iban: 'ES9121000418450200051332',
    leadTimeDays: 3,
    minOrder: 300,
    createdBy: ADMIN,
    updatedBy: EDITOR,
  });
  doc.set({
    createdAt: new Date('2026-10-08T09:12:00Z'),
    updatedAt: new Date('2026-10-21T17:40:00Z'),
  });
  return doc;
}

describe('toSupplierListItem', () => {
  it('devuelve solo los campos del contrato, con el gasto del trimestre pedido', () => {
    const doc = supplierDoc();
    expect(toSupplierListItem(doc, TOTALS, 3)).toEqual({
      id: doc._id.toString(),
      name: 'Aceites del Sur',
      cif: 'B12345674',
      city: 'Paterna',
      leadTimeDays: 3,
      quarterPurchases: 300,
      yearPurchases: 1000,
      active: true,
    });
  });
});

describe('toSupplierDetail', () => {
  it('no expone _id ni __v, y el id es un string', () => {
    const detail = toSupplierDetail(supplierDoc(), TOTALS);
    expect(detail).not.toHaveProperty('_id');
    expect(detail).not.toHaveProperty('__v');
    expect(typeof detail.id).toBe('string');
  });

  it('copia los datos del proveedor, la versión y la auditoría con fechas ISO', () => {
    const detail = toSupplierDetail(supplierDoc(), TOTALS);
    expect(detail).toMatchObject({
      name: 'Aceites del Sur',
      foreign: false,
      contactPerson: 'Ana',
      phones: [{ label: 'Pedidos', value: '961 000 001' }],
      emails: [{ label: null, value: 'pedidos@aceitesdelsur.example' }],
      paymentMethod: 'TRANSFER_30',
      iban: 'ES9121000418450200051332',
      web: null,
      notes: null,
      minOrder: 300,
      active: true,
      version: 0,
      createdBy: ADMIN,
      updatedBy: EDITOR,
      createdAt: '2026-10-08T09:12:00.000Z',
      updatedAt: '2026-10-21T17:40:00.000Z',
    });
  });

  it('los cuatro trimestres suman las compras del año', () => {
    const detail = toSupplierDetail(supplierDoc(), TOTALS);
    expect(detail.quarterPurchases).toEqual([100, 200, 300, 400]);
    expect(detail.quarterPurchases.reduce((sum, value) => sum + value, 0)).toBe(
      detail.yearPurchases,
    );
  });

  it('los contactos son objetos planos, sin _id de subdocumento', () => {
    const detail = toSupplierDetail(supplierDoc(), TOTALS);
    expect(detail.phones[0]).toEqual({ label: 'Pedidos', value: '961 000 001' });
  });
});
