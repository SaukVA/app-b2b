import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { SupplierModel } from '../suppliers/supplier.model';
import { ProductModel } from './product.model';
import { listProducts } from './product.service';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const BASE = { lowStock: false, page: 1 };

async function seedCatalog(): Promise<string> {
  const supplier = await SupplierModel.create({ name: 'Aceites del Sur', cif: 'B11111111' });
  await ProductModel.create([
    {
      code: 'ACE-001',
      name: 'Aceite de oliva virgen extra 5 L',
      categoryId: 'alimentacion',
      category: 'Alimentación',
      subcategoryId: 'aceites',
      subcategory: 'Aceites',
      supplier: supplier._id,
      stock: 40,
      minStock: 10,
      price: 32.5,
    },
    {
      code: 'LEJ-002',
      name: 'Lejía 2 L',
      categoryId: 'drogueria',
      category: 'Droguería',
      stock: 3,
      minStock: 12,
      price: 1.2,
    },
    {
      code: 'PAP-003',
      name: 'Papel de cocina',
      categoryId: 'drogueria',
      category: 'Droguería',
      stock: 0,
      minStock: 5,
      price: 4.8,
    },
  ]);
  return String(supplier._id);
}

describe('listProducts', () => {
  it('sin productos devuelve una página vacía de 10 referencias', async () => {
    await expect(listProducts(BASE)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('devuelve las filas ordenadas por código, con proveedor y estado calculado', async () => {
    const supplierId = await seedCatalog();
    const page = await listProducts(BASE);
    expect(page.total).toBe(3);
    expect(page.items.map((item) => [item.code, item.status])).toEqual([
      ['ACE-001', 'Disponible'],
      ['LEJ-002', 'Stock bajo'],
      ['PAP-003', 'Sin stock'],
    ]);
    expect(page.items[0]).toMatchObject({
      supplierName: 'Aceites del Sur',
      subcategory: 'Aceites',
    });
    expect(page.items[1]).toMatchObject({ supplierName: null, subcategory: null });
    expect(page.items[0].id).not.toBe(supplierId);
  });
});

describe('listProducts · búsqueda y filtros', () => {
  it('busca por código o nombre sin distinguir mayúsculas', async () => {
    await seedCatalog();
    expect((await listProducts({ ...BASE, q: 'lejía' })).items.map((i) => i.code)).toEqual([
      'LEJ-002',
    ]);
    expect((await listProducts({ ...BASE, q: 'ace-0' })).items.map((i) => i.code)).toEqual([
      'ACE-001',
    ]);
  });

  it('«Solo stock bajo» incluye Stock bajo y Sin stock', async () => {
    await seedCatalog();
    const page = await listProducts({ ...BASE, lowStock: true });
    expect(page.items.map((item) => item.code)).toEqual(['LEJ-002', 'PAP-003']);
  });

  it('filtra por categoría, subcategoría y proveedor', async () => {
    const supplierId = await seedCatalog();
    expect((await listProducts({ ...BASE, category: 'drogueria' })).total).toBe(2);
    expect((await listProducts({ ...BASE, subcategory: 'aceites' })).total).toBe(1);
    expect((await listProducts({ ...BASE, supplier: supplierId })).total).toBe(1);
  });

  it('un proveedor que no es un identificador válido devuelve vacío, no un error', async () => {
    await seedCatalog();
    await expect(listProducts({ ...BASE, supplier: 'prov-12' })).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });
});

describe('listProducts · paginación', () => {
  it('pagina de 10 en 10 con el total de todas las páginas', async () => {
    await ProductModel.create(
      Array.from({ length: 12 }, (_, index) => ({
        code: `P-${String(index).padStart(2, '0')}`,
        name: `Producto ${index}`,
        categoryId: 'varios',
        category: 'Varios',
        stock: 1,
        minStock: 0,
        price: 1,
      })),
    );
    const second = await listProducts({ ...BASE, page: 2 });
    expect(second).toMatchObject({ total: 12, page: 2, pageSize: 10 });
    expect(second.items.map((item) => item.code)).toEqual(['P-10', 'P-11']);
  });
});
