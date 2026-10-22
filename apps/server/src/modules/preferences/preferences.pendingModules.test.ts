import request from 'supertest';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from '../users/user.model';

// Con la lista real de módulos implementados (005): Ajustes, Productos (006) y Clientes (007), así que de las
// pantallas de negocio solo Productos y Clientes se pueden elegir como inicio. Va en su propio archivo porque
// preferences.routes.test.ts simula los módulos.

setTestEnv();

beforeAll(startTestDb);
beforeEach(ensureDefaultRoles);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const app = () => buildApp();

async function loginAs(login: string, password: string): Promise<string> {
  const res = await request(app())
    .post('/api/auth/login')
    .send({ login, password, persistent: false, client: 'web' });
  return res.body.data.accessToken as string;
}

async function comercialToken(): Promise<string> {
  const passwordHash = await hashPassword(PASSWORD);
  await UserModel.create({
    login: 'ana@empresa.es',
    name: 'Ana',
    passwordHash,
    role: 'Comercial',
    status: 'Activo',
  });
  return loginAs('ana@empresa.es', PASSWORD);
}

function patch(token: string, body: object) {
  return request(app())
    .patch('/api/preferences')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

describe('PATCH /api/preferences · pantalla de inicio con módulos pendientes', () => {
  it('400 PREFERENCES_HOME_SCREEN_NOT_ALLOWED con una pantalla que el rol ve pero está pendiente', async () => {
    const res = await patch(await comercialToken(), { homeScreen: 'ventas' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PREFERENCES_HOME_SCREEN_NOT_ALLOWED');
  });

  it('200 con Productos, que ya está implementado y el rol puede ver', async () => {
    const res = await patch(await comercialToken(), { homeScreen: 'productos' });
    expect(res.status).toBe(200);
    expect(res.body.data.homeScreen).toBe('productos');
  });

  it('200 con Clientes, que ya está implementado (007) y el rol puede ver', async () => {
    const res = await patch(await comercialToken(), { homeScreen: 'clientes' });
    expect(res.status).toBe(200);
    expect(res.body.data.homeScreen).toBe('clientes');
  });

  it('200 con homeScreen: null', async () => {
    const res = await patch(await comercialToken(), { homeScreen: null });
    expect(res.status).toBe(200);
    expect(res.body.data.homeScreen).toBeNull();
  });
});
