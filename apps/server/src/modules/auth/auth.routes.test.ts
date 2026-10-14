import request from 'supertest';
import type { UserStatus } from '@app/shared';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { UserModel } from '../users/user.model';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const app = () => buildApp();

async function createUser(status: UserStatus = 'Activo') {
  const passwordHash = await hashPassword(PASSWORD);
  return UserModel.create({ login: 'ana@empresa.es', name: 'Ana', passwordHash, role: 'Comercial', status });
}

function postLogin(body: Record<string, unknown>) {
  const payload = { login: 'ana@empresa.es', password: PASSWORD, persistent: false, client: 'web', ...body };
  return request(app()).post('/api/auth/login').send(payload);
}

function refreshCookie(res: request.Response): string {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return cookies.find((cookie) => cookie.startsWith('refreshToken=')) ?? '';
}

describe('POST /api/auth/login · web', () => {
  it('200: access token en el cuerpo y refresh en cookie httpOnly de sesión', async () => {
    await createUser();
    const res = await postLogin({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ accessToken: expect.any(String), user: expect.objectContaining({ login: 'ana@empresa.es' }) });
    const cookie = refreshCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    expect(cookie).not.toMatch(/Max-Age/);
  });

  it('200 con "Mantener la sesión": la cookie dura 30 días', async () => {
    await createUser();
    const res = await postLogin({ persistent: true });
    expect(refreshCookie(res)).toMatch(/Max-Age=2592000/);
  });

  it('nunca devuelve passwordHash', async () => {
    const user = await UserModel.findById((await createUser())._id).select('+passwordHash');
    const res = await postLogin({});
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain(user?.passwordHash ?? '-');
  });
});

describe('POST /api/auth/login · escritorio', () => {
  it('200: el refresh token va en el cuerpo y no hay cookie', async () => {
    await createUser();
    const res = await postLogin({ client: 'desktop' });
    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).toBe('');
  });
});

describe('POST /api/auth/login · errores', () => {
  it('400 VALIDATION_ERROR si falta un campo', async () => {
    const res = await request(app()).post('/api/auth/login').send({ login: 'ana@empresa.es' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: { code: 'VALIDATION_ERROR', message: expect.any(String) } });
  });

  it('401 AUTH_INVALID_CREDENTIALS con los intentos restantes', async () => {
    await createUser();
    const res = await postLogin({ password: 'mal' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Email o contraseña incorrectos. Te quedan 4 intentos.',
    });
  });

  it('403 AUTH_ACCOUNT_BLOCKED con la contraseña correcta', async () => {
    await createUser('Bloqueado');
    const res = await postLogin({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_ACCOUNT_BLOCKED');
  });
});

describe('GET /api/auth/me', () => {
  it('200 con el usuario de la sesión', async () => {
    await createUser();
    const { body } = await postLogin({});
    const res = await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(body.data.user);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('401 AUTH_UNAUTHENTICATED sin token', async () => {
    const res = await request(app()).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, error: { code: 'AUTH_UNAUTHENTICATED', message: expect.any(String) } });
  });

  it('401 AUTH_SESSION_EXPIRED con un token no válido', async () => {
    const res = await request(app()).get('/api/auth/me').set('Authorization', 'Bearer no-es-un-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });

  it('401 si el usuario se bloquea con la sesión abierta', async () => {
    await createUser();
    const { body } = await postLogin({});
    await UserModel.updateOne({ login: 'ana@empresa.es' }, { status: 'Bloqueado' });
    const res = await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });
});
