import request from 'supertest';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from '../users/user.model';
import { ensureBootstrapAccount } from './bootstrap.service';

setTestEnv();

beforeAll(startTestDb);
beforeEach(async () => {
  await ensureDefaultRoles();
  await ensureBootstrapAccount();
});
afterEach(clearTestDb);
afterAll(stopTestDb);

const app = () => buildApp();

function loginAsAdmin() {
  const payload = { login: 'admin', password: 'admin', persistent: false, client: 'web' };
  return request(app()).post('/api/auth/login').send(payload);
}

async function insertRealUser() {
  const passwordHash = await hashPassword('secreto123');
  await UserModel.create({
    login: 'ana@empresa.es',
    name: 'Ana',
    passwordHash,
    role: 'Comercial',
    status: 'Activo',
  });
}

describe('Cuenta inicial "admin"', () => {
  it('200 con admin/admin en una base de datos vacía', async () => {
    const res = await loginAsAdmin();
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      login: 'admin',
      role: 'Administrador',
      roleName: 'Administrador',
      isBootstrap: true,
    });
    expect(Object.values(res.body.data.user.permissions)).toEqual(Array(6).fill('edit'));
  });

  it('401 AUTH_INVALID_CREDENTIALS en cuanto existe un usuario real', async () => {
    await insertRealUser();
    const res = await loginAsAdmin();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('401 AUTH_SESSION_EXPIRED en GET /me con la sesión abierta de admin', async () => {
    const { body } = await loginAsAdmin();
    await insertRealUser();
    const res = await request(app())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
    await expect(UserModel.exists({ isBootstrap: true })).resolves.toBeNull();
  });
});
