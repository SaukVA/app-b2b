import request from 'supertest';
import type { UserStatus } from '@app/shared';
import { buildApp } from '../../app';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { UserModel } from '../users/user.model';
import { SessionModel } from './session.model';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const app = () => buildApp();

async function createUser(status: UserStatus = 'Activo') {
  const passwordHash = await hashPassword(PASSWORD);
  return UserModel.create({
    login: 'ana@empresa.es',
    name: 'Ana',
    passwordHash,
    role: 'Comercial',
    status,
  });
}

function postLogin(body: Record<string, unknown>) {
  const payload = {
    login: 'ana@empresa.es',
    password: PASSWORD,
    persistent: false,
    client: 'web',
    ...body,
  };
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
    expect(res.body.data).toEqual({
      accessToken: expect.any(String),
      user: expect.objectContaining({ login: 'ana@empresa.es' }),
    });
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
    expect(res.body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
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
    const res = await request(app())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(body.data.user);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('401 AUTH_UNAUTHENTICATED sin token', async () => {
    const res = await request(app()).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'AUTH_UNAUTHENTICATED', message: expect.any(String) },
    });
  });

  it('401 AUTH_SESSION_EXPIRED con un token no válido', async () => {
    const res = await request(app())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer no-es-un-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });

  it('401 si el usuario se bloquea con la sesión abierta', async () => {
    await createUser();
    const { body } = await postLogin({});
    await UserModel.updateOne({ login: 'ana@empresa.es' }, { status: 'Bloqueado' });
    const res = await request(app())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });
});

function postRefresh() {
  return request(app()).post('/api/auth/refresh');
}

describe('POST /api/auth/refresh · web', () => {
  it('200: lee la cookie, devuelve un access token nuevo y reescribe la cookie', async () => {
    await createUser();
    const loginRes = await postLogin({});
    const oldCookie = refreshCookie(loginRes).split(';')[0];
    const res = await postRefresh().set('Cookie', oldCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      accessToken: expect.any(String),
      user: expect.objectContaining({ login: 'ana@empresa.es' }),
    });
    const newCookie = refreshCookie(res);
    expect(newCookie).toMatch(/HttpOnly/);
    expect(newCookie.split(';')[0]).not.toBe(oldCookie);
    expect(newCookie).not.toMatch(/Max-Age/);
  });

  it('200 con sesión persistente: la cookie nueva mantiene Max-Age', async () => {
    await createUser();
    const loginRes = await postLogin({ persistent: true });
    const res = await postRefresh().set('Cookie', refreshCookie(loginRes).split(';')[0]);
    expect(refreshCookie(res)).toMatch(/Max-Age=2592000/);
  });

  it('401 AUTH_SESSION_EXPIRED sin cookie', async () => {
    const res = await postRefresh();
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'AUTH_SESSION_EXPIRED', message: expect.any(String) },
    });
  });

  it('401 al reutilizar la cookie anterior a la rotación', async () => {
    await createUser();
    const oldCookie = refreshCookie(await postLogin({})).split(';')[0];
    await postRefresh().set('Cookie', oldCookie);
    const res = await postRefresh().set('Cookie', oldCookie);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });
});

describe('POST /api/auth/refresh · escritorio', () => {
  it('200: el refresh token va y vuelve en el cuerpo, sin cookie', async () => {
    await createUser();
    const { body } = await postLogin({ client: 'desktop' });
    const res = await postRefresh().send({ refreshToken: body.data.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).not.toBe(body.data.refreshToken);
    expect(refreshCookie(res)).toBe('');
  });

  it('400 VALIDATION_ERROR si refreshToken no es un texto', async () => {
    const res = await postRefresh().send({ refreshToken: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('requireAuth · actividad de la sesión', () => {
  async function getMe(accessToken: string) {
    return request(app()).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
  }

  it('no actualiza lastActivityAt si pasó menos de un minuto', async () => {
    await createUser();
    const { body } = await postLogin({});
    const before = (await SessionModel.findOne())?.lastActivityAt;
    await getMe(body.data.accessToken);
    expect((await SessionModel.findOne())?.lastActivityAt).toEqual(before);
  });

  it('actualiza lastActivityAt y expiresAt si pasó más de un minuto', async () => {
    await createUser();
    const { body } = await postLogin({});
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await SessionModel.updateOne({}, { lastActivityAt: twoMinutesAgo });
    await getMe(body.data.accessToken);
    const session = await SessionModel.findOne();
    expect(session!.lastActivityAt.getTime()).toBeGreaterThan(twoMinutesAgo.getTime());
    expect(session!.expiresAt.getTime()).toBe(session!.lastActivityAt.getTime() + 30 * 60 * 1000);
  });
});

async function loginWeb() {
  await createUser();
  const res = await postLogin({});
  return {
    accessToken: res.body.data.accessToken as string,
    cookie: refreshCookie(res).split(';')[0],
  };
}

function postLogout(accessToken?: string) {
  const req = request(app()).post('/api/auth/logout');
  return accessToken ? req.set('Authorization', `Bearer ${accessToken}`) : req;
}

describe('POST /api/auth/logout', () => {
  it('200: revoca la sesión y borra la cookie con el mismo Path', async () => {
    const { accessToken, cookie } = await loginWeb();
    const res = await postLogout(accessToken).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: null });
    const cleared = refreshCookie(res);
    expect(cleared).toMatch(/^refreshToken=;/);
    expect(cleared).toMatch(/Path=\/api\/auth/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await SessionModel.findOne())?.revokedAt).toBeInstanceOf(Date);
  });

  it('después, el access token anterior da 401 en /auth/me', async () => {
    const { accessToken } = await loginWeb();
    await postLogout(accessToken);
    const res = await request(app())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });

  it('después, el refresh token anterior da 401 en /auth/refresh', async () => {
    const { accessToken, cookie } = await loginWeb();
    await postLogout(accessToken);
    const res = await postRefresh().set('Cookie', cookie);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });

  it('401 AUTH_UNAUTHENTICATED sin token', async () => {
    const res = await postLogout();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHENTICATED');
  });
});
