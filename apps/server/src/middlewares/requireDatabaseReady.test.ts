import request from 'supertest';
import { buildApp } from '../app';
import { setTestEnv } from '../utils/testDb';

setTestEnv();

const LOGIN = { login: 'admin', password: 'admin', persistent: false, client: 'desktop' };

describe('requireDatabaseReady (backend embebido)', () => {
  it('mientras la base de datos no está lista responde 503 DATABASE_UNAVAILABLE', async () => {
    const app = buildApp({ docs: false, isDatabaseReady: () => false });
    const res = await request(app).post('/api/auth/login').send(LOGIN);
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'No se puede conectar con la base de datos.',
      },
    });
  });

  it('/api/health sigue respondiendo aunque la base de datos no esté lista', async () => {
    const app = buildApp({ docs: false, isDatabaseReady: () => false });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('cuando está lista deja pasar la petición a su ruta', async () => {
    const app = buildApp({ docs: false, isDatabaseReady: () => true });
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
