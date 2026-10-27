import { SUPPLIER_ERROR_CODES, SUPPLIERS_PAGE_SIZE, type SupplierListQuery } from '@app/shared';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { SupplierModel, type SupplierFields } from './supplier.model';
import { getSupplier, listSuppliers } from './supplier.service';

setTestEnv();

beforeAll(startTestDb, 30_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const ADMIN = { id: '000000000000000000000001', login: 'admin' };
let sequence = 0;

/** Proveedor mínimo válido para el modelo; el CIF solo tiene que ser único. */
function supplierData(overrides: Partial<SupplierFields> = {}): Partial<SupplierFields> {
  sequence += 1;
  return {
    name: `Proveedor ${sequence}`,
    cif: `B${String(sequence).padStart(8, '0')}`,
    address: 'Calle Mayor, 1',
    postalCode: '46001',
    city: 'Valencia',
    createdBy: ADMIN,
    updatedBy: ADMIN,
    ...overrides,
  };
}

async function seed(...overrides: Partial<SupplierFields>[]): Promise<void> {
  await SupplierModel.insertMany(overrides.map((item) => supplierData(item)));
}

function query(overrides: Partial<SupplierListQuery> = {}): SupplierListQuery {
  return { includeInactive: false, quarter: 1, page: 1, ...overrides };
}

const names = (page: { items: { name: string }[] }) => page.items.map((item) => item.name);

describe('listSuppliers · orden y estado (FR-020, FR-004a de 009)', () => {
  it('ordena alfabéticamente sin distinguir acentos ni mayúsculas', async () => {
    await seed({ name: 'bebidas Sur' }, { name: 'Ávila Distribuciones' }, { name: 'Aceites' });
    const page = await listSuppliers(query());
    expect(names(page)).toEqual(['Aceites', 'Ávila Distribuciones', 'bebidas Sur']);
  });

  it('sin includeInactive solo devuelve los activos', async () => {
    await seed({ name: 'Activo' }, { name: 'De baja', active: false });
    const page = await listSuppliers(query());
    expect(names(page)).toEqual(['Activo']);
    expect(page.total).toBe(1);
  });

  it('con includeInactive devuelve también los dados de baja, marcados', async () => {
    await seed({ name: 'Activo' }, { name: 'De baja', active: false });
    const page = await listSuppliers(query({ includeInactive: true }));
    expect(page.items.map((item) => [item.name, item.active])).toEqual([
      ['Activo', true],
      ['De baja', false],
    ]);
  });
});

describe('listSuppliers · búsqueda (FR-020)', () => {
  beforeEach(() =>
    seed(
      { name: 'Ávila Distribuciones', cif: 'B12345674' },
      { name: 'Lácteos Valle Verde', cif: 'B33000008' },
      { name: 'Conservas (Atlántico)', cif: 'IT00000000009', foreign: true },
    ),
  );

  it('busca por nombre sin acentos ni mayúsculas', async () => {
    expect(names(await listSuppliers(query({ q: 'avila' })))).toEqual(['Ávila Distribuciones']);
    expect(names(await listSuppliers(query({ q: 'LACTEOS' })))).toEqual(['Lácteos Valle Verde']);
  });

  it('busca por CIF aunque se escriba con otro formato', async () => {
    expect(names(await listSuppliers(query({ q: 'b-12.345.674' })))).toEqual([
      'Ávila Distribuciones',
    ]);
  });

  it('trata los caracteres especiales de la búsqueda como texto', async () => {
    expect(names(await listSuppliers(query({ q: '(atlántico)' })))).toEqual([
      'Conservas (Atlántico)',
    ]);
    expect(names(await listSuppliers(query({ q: '.*' })))).toEqual([]);
  });
});

describe('listSuppliers · paginación y forma del item (FR-010 de 009, FR-021)', () => {
  it(`pagina de ${SUPPLIERS_PAGE_SIZE} en ${SUPPLIERS_PAGE_SIZE}`, async () => {
    await seed(
      ...Array.from({ length: 12 }, (_, i) => ({ name: `P${String(i).padStart(2, '0')}` })),
    );
    const second = await listSuppliers(query({ page: 2 }));
    expect(second).toMatchObject({ total: 12, page: 2, pageSize: SUPPLIERS_PAGE_SIZE });
    expect(names(second)).toEqual(['P10', 'P11']);
  });

  it('cada item lleva cif, población, plazo, estado y compras a 0', async () => {
    await seed({ name: 'Aceites del Sur', cif: 'B12345674', city: 'Paterna', leadTimeDays: 3 });
    const [item] = (await listSuppliers(query({ quarter: 2 }))).items;
    expect(item).toEqual({
      id: expect.any(String),
      name: 'Aceites del Sur',
      cif: 'B12345674',
      city: 'Paterna',
      leadTimeDays: 3,
      quarterPurchases: 0,
      yearPurchases: 0,
      active: true,
    });
  });
});

describe('SupplierModel · índices (research R1)', () => {
  it('tiene índice único por cif, índice por nombre con collation es y por active', async () => {
    await SupplierModel.init();
    const indexes = await SupplierModel.listIndexes();
    const byKey = (key: string) => indexes.find((index) => Object.keys(index.key).join() === key);
    expect(byKey('cif')).toMatchObject({ unique: true });
    expect(byKey('name')).toMatchObject({ collation: { locale: 'es', strength: 1 } });
    expect(byKey('active')).toBeDefined();
  });

  it('rechaza dos proveedores con el mismo CIF', async () => {
    await SupplierModel.init();
    await seed({ cif: 'B12345674' });
    await expect(seed({ cif: 'B12345674' })).rejects.toMatchObject({ code: 11000 });
  });
});

describe('listSuppliers · rendimiento (SC-006, research R1)', () => {
  it('con 1.000 proveedores, la búsqueda responde en menos de 500 ms', async () => {
    await SupplierModel.init();
    await seed(...Array.from({ length: 1000 }, (_, i) => ({ name: `Proveedor de prueba ${i}` })));
    const start = performance.now();
    const page = await listSuppliers(query({ q: 'prueba 99' }));
    expect(performance.now() - start).toBeLessThan(500);
    expect(page.total).toBe(11);
  }, 30_000);
});

const FULL_SUPPLIER: Partial<SupplierFields> = {
  name: 'Aceites del Sur',
  cif: 'B12345674',
  phones: [{ label: 'Pedidos', value: '961 234 567' }],
  emails: [{ label: null, value: 'pedidos@aceites.es' }],
  leadTimeDays: 3,
  minOrder: 150,
};

describe('getSupplier (FR-012, FR-013)', () => {
  it('devuelve la ficha completa de un proveedor activo', async () => {
    const doc = await SupplierModel.create(supplierData(FULL_SUPPLIER));
    const detail = await getSupplier(doc._id.toString());
    expect(detail).toMatchObject({
      id: doc._id.toString(),
      name: 'Aceites del Sur',
      cif: 'B12345674',
      phones: [{ label: 'Pedidos', value: '961 234 567' }],
      emails: [{ label: null, value: 'pedidos@aceites.es' }],
      leadTimeDays: 3,
      minOrder: 150,
      active: true,
      version: 0,
      yearPurchases: 0,
      quarterPurchases: [0, 0, 0, 0],
      createdBy: ADMIN,
      updatedBy: ADMIN,
    });
    expect(detail).not.toHaveProperty('_id');
  });

  it('devuelve también la ficha de un proveedor dado de baja (FR-019)', async () => {
    const doc = await SupplierModel.create(supplierData({ name: 'De baja', active: false }));
    expect(await getSupplier(doc._id.toString())).toMatchObject({ name: 'De baja', active: false });
  });

  it('lanza SUPPLIER_NOT_FOUND 404 si no existe', async () => {
    await expect(getSupplier('0123456789abcdef01234567')).rejects.toMatchObject({
      code: SUPPLIER_ERROR_CODES.notFound,
      status: 404,
    });
  });
});
