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

async function seedForDetail(): Promise<string> {
  const [saved] = await SupplierModel.insertMany(SAVED_SUPPLIERS);
  return saved._id.toString();
}

const getSupplierById = (token: string, supplierId: string) =>
  request(app()).get(`/api/suppliers/${supplierId}`).set('Authorization', `Bearer ${token}`);

describe('GET /api/suppliers/:id · contrato (FR-012, FR-013)', () => {
  let id: string;
  beforeEach(async () => {
    id = await seedForDetail();
  });

  it('200 con la ficha según el contrato de SupplierDetail', async () => {
    const res = await getSupplierById(await tokenFor('Administración'), id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        id,
        name: 'Bebidas Mediterráneo',
        cif: 'B46000002',
        foreign: false,
        address: 'Calle Mayor, 1',
        postalCode: '46023',
        city: 'Valencia',
        contactPerson: null,
        phones: [],
        emails: [],
        paymentMethod: 'TRANSFER_30',
        iban: null,
        web: null,
        leadTimeDays: null,
        minOrder: null,
        notes: null,
        active: true,
        version: 0,
        yearPurchases: 0,
        quarterPurchases: [0, 0, 0, 0],
        createdBy: ADMIN,
        createdAt: expect.any(String),
        updatedBy: ADMIN,
        updatedAt: expect.any(String),
      },
    });
  });
});

describe('GET /api/suppliers/:id · acceso y errores (FR-002, FR-015)', () => {
  let id: string;
  beforeEach(async () => {
    id = await seedForDetail();
  });

  it('200 para Almacén, que solo puede ver', async () => {
    const res = await getSupplierById(await tokenFor('Almacén'), id);
    expect(res.status).toBe(200);
  });

  it('404 SUPPLIER_NOT_FOUND si no existe', async () => {
    const res = await getSupplierById(await tokenFor('Administración'), '0123456789abcdef01234567');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SUPPLIER_NOT_FOUND');
  });

  it('400 VALIDATION_ERROR con un id mal formado', async () => {
    const res = await getSupplierById(await tokenFor('Administración'), 'no-es-un-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401 sin token', async () => {
    const res = await request(app()).get(`/api/suppliers/${id}`);
    expect(res.status).toBe(401);
  });

  it('403 AUTH_FORBIDDEN con Comercial', async () => {
    const res = await getSupplierById(await tokenFor('Comercial'), id);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});

const NEW_SUPPLIER = {
  name: 'Lácteos Valle Verde',
  cif: 'b-33.000.001',
  address: 'Polígono Norte, 4',
  postalCode: '33001',
  city: 'Oviedo',
  web: 'www.valleverde.es',
  minOrder: 80,
};

const postSupplier = (token: string, body: unknown) =>
  request(app()).post('/api/suppliers').set('Authorization', `Bearer ${token}`).send(body);

describe('POST /api/suppliers · alta (FR-004, FR-005, FR-010)', () => {
  it('201 con la ficha del proveedor creado, normalizado y auditado', async () => {
    const res = await postSupplier(await tokenFor('Administración'), NEW_SUPPLIER);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      name: 'Lácteos Valle Verde',
      cif: 'B33000001',
      web: 'https://www.valleverde.es',
      minOrder: 80,
      paymentMethod: 'TRANSFER_30',
      active: true,
      version: 0,
      createdBy: { login: 'administración@empresa.es' },
      updatedBy: { login: 'administración@empresa.es' },
    });
    expect(await SupplierModel.countDocuments()).toBe(1);
  });

  it('400 VALIDATION_ERROR con la ruta y el motivo de cada campo', async () => {
    const res = await postSupplier(await tokenFor('Administración'), {
      ...NEW_SUPPLIER,
      postalCode: '3300',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain(
      'postalCode: El código postal español tiene 5 cifras.',
    );
  });
});

describe('POST /api/suppliers · CIF repetido (FR-005)', () => {
  it('409 SUPPLIER_CIF_TAKEN si el CIF ya existe, escrito en otro formato', async () => {
    await SupplierModel.insertMany(SAVED_SUPPLIERS);
    const res = await postSupplier(await tokenFor('Administración'), {
      ...NEW_SUPPLIER,
      cif: 'B-12.345.674',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'SUPPLIER_CIF_TAKEN',
      message: 'Ya existe un proveedor con este CIF: Aceites del Sur.',
    });
  });
});

describe('POST /api/suppliers · acceso (FR-002)', () => {
  it.each(['Almacén', 'Comercial'])('403 AUTH_FORBIDDEN para %s', async (role) => {
    const res = await postSupplier(await tokenFor(role), NEW_SUPPLIER);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
    expect(await SupplierModel.countDocuments()).toBe(0);
  });

  it('401 sin token', async () => {
    const res = await request(app()).post('/api/suppliers').send(NEW_SUPPLIER);
    expect(res.status).toBe(401);
  });
});

const UPDATE = {
  name: 'Bebidas Mediterráneo S.L.',
  cif: 'B46000006',
  address: 'Calle Mayor, 1',
  postalCode: '46023',
  city: 'Valencia',
  leadTimeDays: 5,
};

const putSupplier = (token: string, supplierId: string, body: unknown) =>
  request(app())
    .put(`/api/suppliers/${supplierId}`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

describe('PUT /api/suppliers/:id · edición (FR-007, FR-011)', () => {
  let id: string;
  beforeEach(async () => {
    id = await seedForDetail();
  });

  it('200 con la ficha guardada y la versión siguiente', async () => {
    const res = await putSupplier(await tokenFor('Administración'), id, { ...UPDATE, version: 0 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id,
      name: 'Bebidas Mediterráneo S.L.',
      leadTimeDays: 5,
      version: 1,
      createdBy: ADMIN,
      updatedBy: { login: 'administración@empresa.es' },
    });
  });

  it.each([
    ['sin version', UPDATE],
    ['con datos no válidos', { ...UPDATE, postalCode: '460', version: 0 }],
  ])('400 VALIDATION_ERROR %s', async (_case, body) => {
    const res = await putSupplier(await tokenFor('Administración'), id, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('409 SUPPLIER_VERSION_CONFLICT con una versión antigua', async () => {
    const token = await tokenFor('Administración');
    await putSupplier(token, id, { ...UPDATE, version: 0 });
    const res = await putSupplier(token, id, { ...UPDATE, name: 'Otro', version: 0 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SUPPLIER_VERSION_CONFLICT');
  });
});

describe('PUT /api/suppliers/:id · CIF, existencia y acceso (FR-002, FR-005)', () => {
  let id: string;
  beforeEach(async () => {
    id = await seedForDetail();
  });

  it('409 SUPPLIER_CIF_TAKEN con el CIF de otro proveedor', async () => {
    const res = await putSupplier(await tokenFor('Administración'), id, {
      ...UPDATE,
      cif: 'B12345674',
      version: 0,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SUPPLIER_CIF_TAKEN');
  });

  it('404 SUPPLIER_NOT_FOUND si no existe', async () => {
    const res = await putSupplier(await tokenFor('Administración'), '0123456789abcdef01234567', {
      ...UPDATE,
      version: 0,
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SUPPLIER_NOT_FOUND');
  });

  it('403 AUTH_FORBIDDEN para Almacén, sin guardar', async () => {
    const res = await putSupplier(await tokenFor('Almacén'), id, { ...UPDATE, version: 0 });
    expect(res.status).toBe(403);
    expect((await SupplierModel.findById(id))?.version).toBe(0);
  });
});
