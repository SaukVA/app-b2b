import { hashPassword, normalizeLogin, verifyPassword } from './password';

describe('normalizeLogin', () => {
  it('pasa a minúsculas y quita espacios al principio y al final', () => {
    expect(normalizeLogin('  Ana.Garcia@Empresa.ES  ')).toBe('ana.garcia@empresa.es');
  });

  it('deja "admin" tal cual', () => {
    expect(normalizeLogin('admin')).toBe('admin');
  });
});

describe('hashPassword / verifyPassword', () => {
  it('nunca guarda la contraseña en claro y la verifica', async () => {
    const hash = await hashPassword('secreto123');
    expect(hash).not.toContain('secreto123');
    await expect(verifyPassword('secreto123', hash)).resolves.toBe(true);
  });

  it('rechaza una contraseña distinta', async () => {
    const hash = await hashPassword('secreto123');
    await expect(verifyPassword('otra-clave', hash)).resolves.toBe(false);
  });

  it('devuelve false si no hay hash (usuario inexistente)', async () => {
    await expect(verifyPassword('secreto123', null)).resolves.toBe(false);
  });
});
