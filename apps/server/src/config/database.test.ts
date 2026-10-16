import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { classifyConnectionError, testConnection } from './database';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
});
afterAll(() => mongo.stop());

describe('testConnection (research R10)', () => {
  it('con una base de datos que responde devuelve { ok: true }', async () => {
    await expect(testConnection(mongo.getUri('escritorio'))).resolves.toEqual({ ok: true });
  });

  it('no toca la conexión global de Mongoose y cierra la temporal', async () => {
    const before = mongoose.connection.readyState;
    await testConnection(mongo.getUri('escritorio'));
    expect(mongoose.connection.readyState).toBe(before);
    expect(mongoose.connections.every((connection) => connection.readyState !== 1)).toBe(true);
  });

  it('si no responde devuelve DATABASE_UNREACHABLE antes del tiempo máximo', async () => {
    const started = Date.now();
    const result = await testConnection('mongodb://127.0.0.1:1/escritorio', 500);
    expect(result).toMatchObject({ ok: false, code: 'DATABASE_UNREACHABLE' });
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

describe('classifyConnectionError', () => {
  it.each([
    ['código 18', { name: 'MongoServerError', code: 18 }],
    [
      'codeName AuthenticationFailed',
      { name: 'MongoServerError', codeName: 'AuthenticationFailed' },
    ],
  ])('un fallo de autenticación (%s) es DATABASE_AUTH_FAILED', (_case, error) => {
    expect(classifyConnectionError(error)).toMatchObject({
      ok: false,
      code: 'DATABASE_AUTH_FAILED',
    });
  });

  it('cualquier otro fallo es DATABASE_UNREACHABLE', () => {
    const error = new Error('connect ECONNREFUSED mongodb://ana:s3cr3t@db.ejemplo.net');
    expect(classifyConnectionError(error)).toMatchObject({
      ok: false,
      code: 'DATABASE_UNREACHABLE',
    });
  });

  it('el mensaje nunca incluye la cadena ni el mensaje original del driver', () => {
    const error = new Error('connect ECONNREFUSED mongodb://ana:s3cr3t@db.ejemplo.net');
    expect(JSON.stringify(classifyConnectionError(error))).not.toContain('s3cr3t');
  });
});
