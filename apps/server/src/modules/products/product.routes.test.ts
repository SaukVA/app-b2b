import request from 'supertest';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureDefaultRoles } from '../roles/role.service';
import { RoleModel } from '../roles/role.model';
import { SupplierModel } from '../suppliers/supplier.model';
import { UserModel } from '../users/user.model';
import { ProductModel } from './product.model';

setTestEnv();

beforeAll(startTestDb);
beforeEach(ensureDefaultRoles);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const NO_PRODUCTS_ROLE = 'Sin productos';
const EMPTY_PAGE = { items: [], total: 0, page: 1, pageSize: 10 };
const app = () => buildApp();

async function tokenFor(role: string): Promise<string> {
  const login = `${role.toLowerCase().replace(/\s/g, '-')}@empresa.es`;
  await UserModel.create({
    login,
    name: role,
    passwordHash: await hashPassword(PASSWORD),
    role,
    status: 'Activo',
  });
  const res = await request(app())
    .post('/api/auth/login')
    .send({ login, password: PASSWORD, persistent: false, client: 'web' });
  return res.body.data.accessToken as string;
}

async function createRoleWithoutProducts(): Promise<void> {
  await RoleModel.create({
    key: NO_PRODUCTS_ROLE,
    name: NO_PRODUCTS_ROLE,
    order: 9,
    permissions: {
      ventas: 'edit',
      clientes: 'view',
      productos: 'none',
      proveedores: 'none',
      cobros: 'none',
    },
  });
}

function getProducts(token: string, query = '') {
  return request(app()).get(`/api/products${query}`).set('Authorization', `Bearer ${token}`);
}

describe('GET /api/products · acceso (FR-002, FR-009)', () => {
  it.each(['Administrador', 'Almacén', 'Comercial', 'Administración'])(
    '200 con la página vacía para %s',
    async (role) => {
      const res = await getProducts(await tokenFor(role));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: EMPTY_PAGE });
    },
  );

  it('401 AUTH_UNAUTHENTICATED sin token', async () => {
    const res = await request(app()).get('/api/products');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
  });

  it('403 AUTH_FORBIDDEN con un rol sin acceso a Productos', async () => {
    await createRoleWithoutProducts();
    const res = await getProducts(await tokenFor(NO_PRODUCTS_ROLE));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});

describe('GET /api/products · criterios (FR-009, FR-010)', () => {
  it.each([
    ['q de 101 caracteres', `?q=${'a'.repeat(101)}`],
    ['page=0', '?page=0'],
    ['page=abc', '?page=abc'],
    ['category con espacio', '?category=a%20b'],
    ['supplier de 65 caracteres', `?supplier=${'p'.repeat(65)}`],
    ['lowStock=yes', '?lowStock=yes'],
  ])('400 VALIDATION_ERROR con %s', async (_case, query) => {
    const res = await getProducts(await tokenFor('Comercial'), query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['un identificador bien formado e inexistente', '?category=no-existe'],
    ['espacios alrededor de la búsqueda', '?q=%20%20aceite%20'],
    ['una búsqueda solo de espacios', '?q=%20%20%20'],
    ['un parámetro desconocido', '?foo=bar'],
    [
      'todos los criterios',
      '?q=aceite&category=alimentacion&subcategory=aceites&supplier=prov-12&lowStock=true',
    ],
  ])('200 vacío con %s', async (_case, query) => {
    const res = await getProducts(await tokenFor('Comercial'), query);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(EMPTY_PAGE);
  });

  it('devuelve la página pedida', async () => {
    const res = await getProducts(await tokenFor('Comercial'), '?page=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ...EMPTY_PAGE, page: 3 });
  });
});

describe('GET /api/products · con catálogo', () => {
  it('200 con las filas en la forma del contrato', async () => {
    const supplier = await SupplierModel.create({ name: 'Aceites del Sur', cif: 'B11111111' });
    const product = await ProductModel.create({
      code: 'ACE-001',
      name: 'Aceite de oliva 5 L',
      categoryId: 'alimentacion',
      category: 'Alimentación',
      supplier: supplier._id,
      stock: 2,
      minStock: 10,
      price: 32.5,
    });
    const res = await getProducts(await tokenFor('Almacén'), '?lowStock=true');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      ...EMPTY_PAGE,
      total: 1,
      items: [
        {
          id: String(product._id),
          code: 'ACE-001',
          name: 'Aceite de oliva 5 L',
          supplierName: 'Aceites del Sur',
          category: 'Alimentación',
          subcategory: null,
          stock: 2,
          minStock: 10,
          price: 32.5,
          status: 'Stock bajo',
        },
      ],
    });
  });
});
