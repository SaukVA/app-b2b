import request from 'supertest';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureBootstrapAccount } from '../auth/bootstrap.service';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from '../users/user.model';

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

describe('PATCH /api/preferences', () => {
  it('401 AUTH_UNAUTHENTICATED sin token', async () => {
    const res = await request(app()).patch('/api/preferences').send({ theme: 'dark' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
  });

  it.each([
    ['sin campos', {}],
    ['un valor fuera del enum', { theme: 'azul' }],
    ['un campo que no existe', { theme: 'dark', extra: 1 }],
  ])('400 VALIDATION_ERROR con %s', async (_case, body) => {
    const res = await patch(await comercialToken(), body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('200 para un Comercial (sin permiso en Ajustes) con las 4 preferencias', async () => {
    const res = await patch(await comercialToken(), { theme: 'dark' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { theme: 'dark', tableDensity: 'comfortable', moneyFormat: 'es', homeScreen: null },
    });
  });

  it('/auth/me devuelve las preferencias guardadas en preferences', async () => {
    const token = await comercialToken();
    await patch(token, { theme: 'dark' });

    const me = await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(me.body.data.preferences.theme).toBe('dark');
    expect(me.body.data).not.toHaveProperty('homeScreen');
  });

  it('200 para la cuenta inicial "admin"', async () => {
    await ensureBootstrapAccount();
    const res = await patch(await loginAs('admin', 'admin'), { tableDensity: 'compact' });
    expect(res.status).toBe(200);
    expect(res.body.data.tableDensity).toBe('compact');
  });
});

// US2: la pantalla de inicio se valida contra los permisos del rol (FR-014).
describe('PATCH /api/preferences · pantalla de inicio', () => {
  it('200 si un Comercial elige una pantalla de inicio que puede ver', async () => {
    const res = await patch(await comercialToken(), { homeScreen: 'clientes' });
    expect(res.status).toBe(200);
    expect(res.body.data.homeScreen).toBe('clientes');
  });

  it.each([
    ['sin permiso en el rol', 'proveedores'],
    ['que todavía no existe', 'panel'],
  ])('400 PREFERENCES_HOME_SCREEN_NOT_ALLOWED con una pantalla %s', async (_case, homeScreen) => {
    const res = await patch(await comercialToken(), { homeScreen });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PREFERENCES_HOME_SCREEN_NOT_ALLOWED');
  });

  it('200 con homeScreen: null (vuelve a "sin elegir")', async () => {
    const token = await comercialToken();
    await patch(token, { homeScreen: 'clientes' });
    const res = await patch(token, { homeScreen: null });
    expect(res.status).toBe(200);
    expect(res.body.data.homeScreen).toBeNull();
  });
});
