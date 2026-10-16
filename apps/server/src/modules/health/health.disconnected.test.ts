import request from 'supertest';
import { buildApp } from '../../app';
import { setTestEnv } from '../../utils/testDb';

// Archivo propio: aquí Mongoose nunca llega a conectar (health.test.ts comparte una base de datos activa).
setTestEnv();

describe('GET /api/health · sin base de datos (FR-005)', () => {
  it('el servidor responde y database es disconnected', async () => {
    const res = await request(buildApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', database: 'disconnected' } });
  });
});
