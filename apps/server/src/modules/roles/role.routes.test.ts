import request from 'supertest';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { UserModel } from '../users/user.model';
import { ensureDefaultRoles } from './role.service';

setTestEnv();

beforeAll(startTestDb);
beforeEach(ensureDefaultRoles);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const app = () => buildApp();

async function tokenFor(role: string): Promise<string> {
  const login = `${role.toLowerCase()}@empresa.es`.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const passwordHash = await hashPassword(PASSWORD);
  await UserModel.create({ login, name: role, passwordHash, role, status: 'Activo' });
  const res = await request(app())
    .post('/api/auth/login')
    .send({ login, password: PASSWORD, persistent: false, client: 'web' });
  return res.body.data.accessToken as string;
}

describe('GET /api/roles', () => {
  it('200 para un Administrador: los 4 roles en orden con los permisos completos', async () => {
    const token = await tokenFor('Administrador');
    const res = await request(app()).get('/api/roles').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const roles = res.body.data as Array<{ key: string; permissions: Record<string, string> }>;
    expect(roles.map((role) => role.key)).toEqual([
      'Administrador',
      'Comercial',
      'Almacén',
      'Administración',
    ]);
    expect(roles.every((role) => Object.keys(role.permissions).length === 6)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('_id');
  });

  it('403 AUTH_FORBIDDEN para un Comercial', async () => {
    const token = await tokenFor('Comercial');
    const res = await request(app()).get('/api/roles').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('401 sin token', async () => {
    const res = await request(app()).get('/api/roles');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
  });
});
