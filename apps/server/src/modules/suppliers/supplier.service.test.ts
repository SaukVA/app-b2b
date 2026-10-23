import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { SupplierModel } from './supplier.model';
import { listSuppliers } from './supplier.service';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function seedSuppliers(): Promise<void> {
  await SupplierModel.create([
    { name: 'Conservas Levante', cif: 'B22222222', leadTimeDays: 3, yearPurchases: 12500.4 },
    { name: 'Aguas del Norte', cif: 'A33333333', leadTimeDays: null, yearPurchases: 800 },
    { name: 'Bebidas Antiguas', cif: 'B44444444', active: false },
  ]);
}

describe('listSuppliers', () => {
  it('sin proveedores devuelve una página vacía de 10 proveedores', async () => {
    await expect(listSuppliers({ includeInactive: false, page: 1 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('sin el filtro de bajas devuelve solo los activos, ordenados por nombre', async () => {
    await seedSuppliers();
    const page = await listSuppliers({ includeInactive: false, page: 1 });
    expect(page.total).toBe(2);
    expect(page.items).toEqual([
      expect.objectContaining({ name: 'Aguas del Norte', leadTimeDays: null, active: true }),
      expect.objectContaining({
        name: 'Conservas Levante',
        leadTimeDays: 3,
        yearPurchases: 12500.4,
      }),
    ]);
  });

  it('con el filtro de bajas incluye los dados de baja', async () => {
    await seedSuppliers();
    const page = await listSuppliers({ includeInactive: true, page: 1 });
    expect(page.items.map((item) => [item.name, item.active])).toEqual([
      ['Aguas del Norte', true],
      ['Bebidas Antiguas', false],
      ['Conservas Levante', true],
    ]);
  });
});

describe('listSuppliers · búsqueda y paginación', () => {
  it('busca por nombre o CIF, y el CIF no viaja en el listado', async () => {
    await seedSuppliers();
    const byCif = await listSuppliers({ q: 'a3333', includeInactive: false, page: 1 });
    expect(byCif.items.map((item) => item.name)).toEqual(['Aguas del Norte']);
    expect(byCif.items[0]).not.toHaveProperty('cif');
    expect((await listSuppliers({ q: 'levante', includeInactive: false, page: 1 })).total).toBe(1);
  });

  it('devuelve la página pedida con el total de todas las páginas', async () => {
    await SupplierModel.create(
      Array.from({ length: 11 }, (_, index) => ({
        name: `Proveedor ${String(index).padStart(2, '0')}`,
        cif: `B000000${String(index).padStart(2, '0')}`,
      })),
    );
    const second = await listSuppliers({ includeInactive: false, page: 2 });
    expect(second).toMatchObject({ total: 11, page: 2, pageSize: 10 });
    expect(second.items.map((item) => item.name)).toEqual(['Proveedor 10']);
  });
});
