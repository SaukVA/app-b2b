import request from 'supertest';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from '../users/user.model';

setTestEnv();

beforeAll(startTestDb);
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

function getCustomers(token: string, query = '') {
  return request(app()).get(`/api/customers${query}`).set('Authorization', `Bearer ${token}`);
}

describe('GET /api/customers · acceso (FR-002, FR-008)', () => {
  it.each(['Administrador', 'Comercial', 'Administración'])(
    '200 con la página vacía para %s',
    async (role) => {
      const res = await getCustomers(await tokenFor(role));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: EMPTY_PAGE });
    },
  );

  it('401 AUTH_UNAUTHENTICATED sin token', async () => {
    const res = await request(app()).get('/api/customers');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
  });

  it('403 AUTH_FORBIDDEN con Almacén, que no tiene acceso a Clientes', async () => {
    const res = await getCustomers(await tokenFor('Almacén'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});

describe('GET /api/customers · criterios (FR-008, FR-009)', () => {
  it.each([
    ['q de 101 caracteres', `?q=${'a'.repeat(101)}`],
    ['page=0', '?page=0'],
    ['page=-1', '?page=-1'],
    ['page=abc', '?page=abc'],
  ])('400 VALIDATION_ERROR con %s', async (_case, query) => {
    const res = await getCustomers(await tokenFor('Comercial'), query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['espacios alrededor de la búsqueda', '?q=%20%20ferreteria%20'],
    ['100 caracteres rodeados de espacios', `?q=%20%20${'a'.repeat(100)}%20%20`],
    ['una búsqueda solo de espacios', '?q=%20%20%20'],
    ['un parámetro desconocido', '?foo=bar'],
  ])('200 vacío con %s', async (_case, query) => {
    const res = await getCustomers(await tokenFor('Comercial'), query);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(EMPTY_PAGE);
  });

  it('devuelve la página pedida', async () => {
    const res = await getCustomers(await tokenFor('Comercial'), '?page=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ...EMPTY_PAGE, page: 3 });
  });
});
