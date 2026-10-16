import mongoose from 'mongoose';
import request from 'supertest';
import { buildApp } from '../../app';
import { setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { LoginAttemptModel } from './loginAttempt.model';

// Archivo propio: empieza sin base de datos y conecta después (auth.routes.test.ts comparte una activa).
// bufferCommands=false como en el backend embebido: sin conexión, las operaciones fallan enseguida.
setTestEnv();

beforeAll(() => mongoose.set('bufferCommands', false));
afterAll(async () => {
  await stopTestDb();
  mongoose.set('bufferCommands', true);
});

describe('POST /api/auth/login · sin base de datos (FR-018)', () => {
  it('responde 503 DATABASE_UNAVAILABLE y no registra ningún intento fallido', async () => {
    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({
        login: 'ana@empresa.es',
        password: 'secreto123',
        persistent: false,
        client: 'desktop',
      });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    await startTestDb();
    expect(await LoginAttemptModel.countDocuments()).toBe(0);
  });
});
