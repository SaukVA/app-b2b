import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler';

const SECRET_URI = 'mongodb://ana:s3cr3t@db.ejemplo.net:27017/ventas';

/** App mínima cuya única ruta lanza el error indicado. */
function appThrowing(error: Error) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

function namedError(name: string, message = `connect ECONNREFUSED ${SECRET_URI}`): Error {
  return Object.assign(new Error(message), { name });
}

const UNAVAILABLE = {
  success: false,
  error: { code: 'DATABASE_UNAVAILABLE', message: 'No se puede conectar con la base de datos.' },
};

describe('errorHandler · errores de conexión con la base de datos (research R4)', () => {
  it.each([
    'MongooseServerSelectionError',
    'MongoServerSelectionError',
    'MongoNotConnectedError',
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoTopologyClosedError',
  ])('%s → 503 DATABASE_UNAVAILABLE', async (name) => {
    const res = await request(appThrowing(namedError(name))).get('/boom');
    expect(res.status).toBe(503);
    expect(res.body).toEqual(UNAVAILABLE);
  });

  it.each([
    'Cannot call `users.findOne()` before initial connection is complete if `bufferCommands = false`.',
    'Operation `users.findOne()` buffering timed out after 10000ms',
  ])('MongooseError sin conexión («%s») → 503', async (message) => {
    const res = await request(appThrowing(namedError('MongooseError', message))).get('/boom');
    expect(res.status).toBe(503);
    expect(res.body).toEqual(UNAVAILABLE);
  });

  it('nunca expone la cadena de conexión del mensaje original', async () => {
    const res = await request(appThrowing(namedError('MongoNetworkError'))).get('/boom');
    expect(JSON.stringify(res.body)).not.toContain('s3cr3t');
  });
});

describe('errorHandler · el resto de errores', () => {
  it('un MongooseError que no es de conexión sigue siendo 500 INTERNAL_ERROR', async () => {
    const error = namedError('MongooseError', 'Schema hasn\'t been registered for model "X"');
    const res = await request(appThrowing(error)).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('un error cualquiera es 500 sin stack', async () => {
    const res = await request(appThrowing(new Error('fallo'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
    });
  });
});
