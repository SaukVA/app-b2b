import request from 'supertest';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from '../users/user.model';
import { SupplierModel } from './supplier.model';
import { supplierListQuerySchema } from './supplier.validation';

setTestEnv();

beforeAll(startTestDb, 30_000);
beforeEach(ensureDefaultRoles);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
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

function getSuppliers(token: string, query = '') {
  return request(app()).get(`/api/suppliers${query}`).set('Authorization', `Bearer ${token}`);
}

describe('GET /api/suppliers · acceso (FR-002, FR-008)', () => {
  it.each(['Administrador', 'Administración', 'Almacén'])(
    '200 con la página vacía para %s',
    async (role) => {
      const res = await getSuppliers(await tokenFor(role));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: EMPTY_PAGE });
    },
  );

  it('401 AUTH_UNAUTHENTICATED sin token', async () => {
    const res = await request(app()).get('/api/suppliers');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
  });

  it('403 AUTH_FORBIDDEN con Comercial, que no tiene acceso a Proveedores', async () => {
    const res = await getSuppliers(await tokenFor('Comercial'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});

describe('GET /api/suppliers · criterios (FR-008, FR-009)', () => {
  it.each([
    ['q de 101 caracteres', `?q=${'a'.repeat(101)}`],
    ['page=0', '?page=0'],
    ['page=-1', '?page=-1'],
    ['page=abc', '?page=abc'],
    ['includeInactive=si', '?includeInactive=si'],
    ['includeInactive=1', '?includeInactive=1'],
    ['quarter=0', '?quarter=0'],
    ['quarter=5', '?quarter=5'],
    ['quarter=abc', '?quarter=abc'],
  ])('400 VALIDATION_ERROR con %s', async (_case, query) => {
    const res = await getSuppliers(await tokenFor('Administración'), query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['espacios alrededor de la búsqueda', '?q=%20%20levante%20'],
    ['100 caracteres rodeados de espacios', `?q=%20%20${'a'.repeat(100)}%20%20`],
    ['una búsqueda solo de espacios', '?q=%20%20%20'],
    ['includeInactive=true', '?includeInactive=true'],
    ['includeInactive=false', '?includeInactive=false'],
    ['un parámetro desconocido', '?foo=bar'],
    ['quarter=1', '?quarter=1'],
    ['quarter=4', '?quarter=4'],
  ])('200 vacío con %s', async (_case, query) => {
    const res = await getSuppliers(await tokenFor('Administración'), query);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(EMPTY_PAGE);
  });

  it('devuelve la página pedida', async () => {
    const res = await getSuppliers(await tokenFor('Administración'), '?page=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ...EMPTY_PAGE, page: 3 });
  });
});

const ADMIN = { id: '000000000000000000000001', login: 'admin' };
const SAVED_SUPPLIERS = [
  { name: 'Bebidas Mediterráneo', cif: 'B46000002', postalCode: '46023', city: 'Valencia' },
  {
    name: 'Aceites del Sur',
    cif: 'B12345674',
    postalCode: '46988',
    city: 'Paterna',
    leadTimeDays: 3,
  },
  { name: 'Higiene Norte', cif: 'B48000007', postalCode: '48001', city: 'Bilbao', active: false },
].map((supplier) => ({
  address: 'Calle Mayor, 1',
  createdBy: ADMIN,
  updatedBy: ADMIN,
  ...supplier,
}));

describe('GET /api/suppliers · con proveedores guardados (FR-020, FR-021, FR-021a)', () => {
  beforeEach(() => SupplierModel.insertMany(SAVED_SUPPLIERS));

  it('devuelve los activos en orden alfabético con cif, población y compras del trimestre', async () => {
    const res = await getSuppliers(await tokenFor('Almacén'), '?quarter=2');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items[0]).toEqual({
      id: expect.any(String),
      name: 'Aceites del Sur',
      cif: 'B12345674',
      city: 'Paterna',
      leadTimeDays: 3,
      quarterPurchases: 0,
      yearPurchases: 0,
      active: true,
    });
    expect(res.body.data.items[1].name).toBe('Bebidas Mediterráneo');
  });

  it('busca por CIF escrito con otro formato e incluye las bajas si se piden', async () => {
    const token = await tokenFor('Administración');
    const byCif = await getSuppliers(token, '?q=b-12.345.674');
    expect(byCif.body.data.items.map((item: { name: string }) => item.name)).toEqual([
      'Aceites del Sur',
    ]);
    const withInactive = await getSuppliers(token, '?includeInactive=true');
    expect(withInactive.body.data.total).toBe(3);
  });
});

describe('supplierListQuerySchema · trimestre por defecto (research R4)', () => {
  afterEach(() => jest.useRealTimers());

  it('sin quarter usa el trimestre en curso de cada petición, no el de la carga del módulo', () => {
    jest.useFakeTimers({
      now: new Date('2026-02-10T10:00:00Z'),
      doNotFake: [
        'nextTick',
        'setImmediate',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });
    expect(supplierListQuerySchema.parse({}).quarter).toBe(1);
    jest.setSystemTime(new Date('2026-11-10T10:00:00Z'));
    expect(supplierListQuerySchema.parse({}).quarter).toBe(4);
  });
});
