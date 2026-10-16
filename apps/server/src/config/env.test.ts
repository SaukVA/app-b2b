import { getEnv, resetEnvCache } from './env';

const BASE_ENV = {
  PORT: '4000',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  JWT_ACCESS_SECRET: 'test-secret-de-al-menos-treinta-y-dos-caracteres',
  CORS_ORIGINS: 'http://localhost:5173,app://.',
  NODE_ENV: 'test',
};

const originalEnv = process.env;

/** Sustituye process.env por BASE_ENV más los cambios del caso (undefined borra la variable). */
function useEnv(overrides: Record<string, string | undefined> = {}): void {
  const env: Record<string, string | undefined> = { ...BASE_ENV, ...overrides };
  for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
  process.env = env as NodeJS.ProcessEnv;
  resetEnvCache();
}

afterEach(() => {
  process.env = originalEnv;
  resetEnvCache();
});

describe('getEnv', () => {
  it('admite PORT=0 (el sistema asigna el puerto, backend de escritorio)', () => {
    useEnv({ PORT: '0' });
    expect(getEnv().PORT).toBe(0);
  });

  it('HOST es opcional y se respeta si viene', () => {
    useEnv();
    expect(getEnv().HOST).toBeUndefined();
    useEnv({ HOST: '127.0.0.1' });
    expect(getEnv().HOST).toBe('127.0.0.1');
  });

  it('MONGODB_URI es opcional: ausente o vacía equivale a sin configurar', () => {
    useEnv({ MONGODB_URI: undefined });
    expect(getEnv().MONGODB_URI).toBeUndefined();
    useEnv({ MONGODB_URI: '' });
    expect(getEnv().MONGODB_URI).toBeUndefined();
  });

  it('rechaza un PORT negativo', () => {
    useEnv({ PORT: '-1' });
    expect(() => getEnv()).toThrow(/PORT/);
  });

  it('rechaza un JWT_ACCESS_SECRET de menos de 32 caracteres', () => {
    useEnv({ JWT_ACCESS_SECRET: 'corto' });
    expect(() => getEnv()).toThrow(/JWT_ACCESS_SECRET/);
  });
});
