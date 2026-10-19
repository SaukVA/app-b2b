import request from 'supertest';
import { buildApp } from '../../app';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureBootstrapAccount } from '../auth/bootstrap.service';
import { ensureDefaultRoles } from '../roles/role.service';

setTestEnv();

beforeAll(startTestDb);
beforeEach(async () => {
  await ensureDefaultRoles();
  await ensureBootstrapAccount();
});
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const app = () => buildApp();

function loginAs(login: string, password: string) {
  return request(app())
    .post('/api/auth/login')
    .send({ login, password, persistent: false, client: 'web' });
}

async function bootstrapToken(): Promise<string> {
  const res = await loginAs('admin', 'admin');
  return res.body.data.accessToken as string;
}

function postUser(token: string, role: string) {
  return request(app())
    .post('/api/users')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Ana Pérez', email: 'Ana@Empresa.es', role, password: PASSWORD });
}

describe('POST /api/users · primer acceso con la cuenta inicial (US1)', () => {
  it('409 USER_FIRST_MUST_BE_ADMIN si el primer usuario no es Administrador', async () => {
    const res = await postUser(await bootstrapToken(), 'Comercial');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_FIRST_MUST_BE_ADMIN');
  });

  it('201 con Administrador y bootstrapRetired: true', async () => {
    const res = await postUser(await bootstrapToken(), 'Administrador');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bootstrapRetired).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: 'ana@empresa.es',
      role: 'Administrador',
      roleName: 'Administrador',
      status: 'Activo',
    });
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('después, el token de admin deja de valer y admin/admin ya no entra', async () => {
    const token = await bootstrapToken();
    await postUser(token, 'Administrador');
    const roles = await request(app()).get('/api/roles').set('Authorization', `Bearer ${token}`);
    expect(roles.status).toBe(401);
    const login = await loginAs('admin', 'admin');
    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('el nuevo usuario inicia sesión con su email y contraseña', async () => {
    await postUser(await bootstrapToken(), 'Administrador');
    const res = await loginAs('ana@empresa.es', PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ login: 'ana@empresa.es', isBootstrap: false });
  });
});
