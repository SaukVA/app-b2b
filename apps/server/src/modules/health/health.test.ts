import express from 'express';
import request from 'supertest';
import { buildApp } from '../../app';
import { errorHandler } from '../../middlewares/errorHandler';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('GET /api/health', () => {
  it('responde 200 con el envelope de éxito y database connected (FR-005)', async () => {
    const res = await request(buildApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', database: 'connected' } });
  });
});

describe('GET /api-docs', () => {
  it('sirve la UI de Swagger', async () => {
    const res = await request(buildApp()).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});

describe('envelope de error', () => {
  it('responde 404 NOT_FOUND en una ruta inexistente', async () => {
    const res = await request(buildApp()).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });

  it('responde 400 VALIDATION_ERROR con un JSON mal formado', async () => {
    const res = await request(buildApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"mal":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 500 INTERNAL_ERROR sin exponer el stack ni el mensaje interno', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new Error('fallo inesperado');
    });
    app.use(errorHandler);
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
    });
  });
});
