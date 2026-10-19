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

function authed(method: 'post' | 'patch', url: string, token: string) {
  return request(app())[method](url).set('Authorization', `Bearer ${token}`);
}

/** Crea el primer Administrador con la cuenta inicial y devuelve su token. */
async function adminToken(): Promise<string> {
  await postUser(await bootstrapToken(), 'Administrador');
  const res = await loginAs('ana@empresa.es', PASSWORD);
  return res.body.data.accessToken as string;
}

const NEW_USER = {
  name: 'Bea Gómez',
  email: 'bea@empresa.es',
  role: 'Comercial',
  password: PASSWORD,
};

function newUser(token: string, body: Record<string, unknown> = {}) {
  return authed('post', '/api/users', token).send({ ...NEW_USER, ...body });
}

async function comercialToken(admin: string): Promise<string> {
  await newUser(admin);
  const res = await loginAs('bea@empresa.es', PASSWORD);
  return res.body.data.accessToken as string;
}

describe('POST /api/users · alta normal (US2)', () => {
  it('201 con el UserSummary y roleName', async () => {
    const res = await newUser(await adminToken());
    expect(res.status).toBe(201);
    expect(res.body.data.bootstrapRetired).toBe(false);
    expect(res.body.data.user).toMatchObject({
      email: 'bea@empresa.es',
      role: 'Comercial',
      roleName: 'Comercial',
      status: 'Activo',
      lastLoginAt: null,
    });
  });

  it.each([
    ['contraseña de 7 caracteres', { password: '1234567' }],
    ['email sin formato', { email: 'bea@empresa' }],
    ['nombre vacío', { name: '   ' }],
    ['nombre de 101 caracteres', { name: 'a'.repeat(101) }],
  ])('400 VALIDATION_ERROR con %s', async (_case, body) => {
    const res = await newUser(await adminToken(), body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/users/:id (US2)', () => {
  it('200 al cambiar el email', async () => {
    const token = await adminToken();
    const { body } = await newUser(token);
    const res = await authed('patch', `/api/users/${body.data.user.id}`, token).send({
      email: 'Beatriz@Empresa.es',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: 'beatriz@empresa.es', roleName: 'Comercial' });
  });

  it('400 VALIDATION_ERROR con un cuerpo vacío', async () => {
    const token = await adminToken();
    const { body } = await newUser(token);
    const res = await authed('patch', `/api/users/${body.data.user.id}`, token).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('404 USER_NOT_FOUND con un id inexistente', async () => {
    const token = await adminToken();
    const res = await authed('patch', '/api/users/0123456789abcdef01234567', token).send({
      name: 'Nadie',
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('404 USER_NOT_FOUND con el id de la cuenta inicial', async () => {
    const { body } = await loginAs('admin', 'admin');
    const url = `/api/users/${body.data.user.id as string}`;
    const res = await authed('patch', url, body.data.accessToken as string).send({ name: 'Otro' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });
});

describe('Permisos de POST y PATCH (US2)', () => {
  it('403 AUTH_FORBIDDEN para un Comercial', async () => {
    const comercial = await comercialToken(await adminToken());
    const post = await newUser(comercial, { email: 'otro@empresa.es' });
    expect(post.status).toBe(403);
    expect(post.body.error.code).toBe('AUTH_FORBIDDEN');
    const patch = await authed('patch', '/api/users/0123456789abcdef01234567', comercial).send({
      name: 'X',
    });
    expect(patch.status).toBe(403);
    expect(patch.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});

describe('GET /api/users (US3)', () => {
  it('200 con los usuarios reales, sin la cuenta inicial ni contraseñas', async () => {
    const token = await adminToken();
    await newUser(token);
    const res = await request(app()).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const emails = (res.body.data as Array<{ email: string }>).map((user) => user.email);
    expect(emails).toEqual(['ana@empresa.es', 'bea@empresa.es']);
    expect(res.body.data[1]).toMatchObject({ roleName: 'Comercial', lastLoginAt: null });
    expect(JSON.stringify(res.body)).not.toMatch(/password|_id/);
  });

  it('403 AUTH_FORBIDDEN para un Comercial', async () => {
    const comercial = await comercialToken(await adminToken());
    const res = await request(app()).get('/api/users').set('Authorization', `Bearer ${comercial}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });
});
