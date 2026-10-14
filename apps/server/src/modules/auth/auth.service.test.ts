import type { UserStatus } from '@app/shared';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { UserModel } from '../users/user.model';
import { login } from './auth.service';
import { LoginAttemptModel } from './loginAttempt.model';
import { SessionModel } from './session.model';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const credentials = (loginValue: string, password = PASSWORD) => ({
  login: loginValue,
  password,
  persistent: false,
  client: 'web' as const,
});

async function createUser(login: string, status: UserStatus = 'Activo') {
  const passwordHash = await hashPassword(PASSWORD);
  return UserModel.create({ login, name: 'Ana García', passwordHash, role: 'Comercial', status });
}

describe('login · credenciales correctas', () => {
  it('crea la sesión, devuelve tokens y el DTO sin passwordHash', async () => {
    await createUser('ana@empresa.es');
    const result = await login(credentials('  ANA@Empresa.es '));
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toMatchObject({ login: 'ana@empresa.es', role: 'Comercial', isBootstrap: false });
    expect(result.user).not.toHaveProperty('passwordHash');
    await expect(SessionModel.countDocuments()).resolves.toBe(1);
  });

  it('actualiza lastLoginAt y reinicia los intentos fallidos', async () => {
    await createUser('ana@empresa.es');
    await expect(login(credentials('ana@empresa.es', 'mal'))).rejects.toBeDefined();
    await login(credentials('ana@empresa.es'));
    const user = await UserModel.findOne({ login: 'ana@empresa.es' });
    expect(user?.lastLoginAt).toBeInstanceOf(Date);
    await expect(LoginAttemptModel.countDocuments({ failedCount: { $gt: 0 } })).resolves.toBe(0);
  });
});

describe('login · contraseña errónea', () => {
  it('da el mismo error y contador con un email existente y con uno inexistente', async () => {
    await createUser('ana@empresa.es');
    const expected = {
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
      message: 'Email o contraseña incorrectos. Te quedan 4 intentos.',
    };
    await expect(login(credentials('ana@empresa.es', 'mal'))).rejects.toMatchObject(expected);
    await expect(login(credentials('nadie@empresa.es', 'mal'))).rejects.toMatchObject(expected);
  });

  it('suma un intento fallido por identificador', async () => {
    await expect(login(credentials('nadie@empresa.es', 'mal'))).rejects.toBeDefined();
    await expect(login(credentials('NADIE@empresa.es', 'mal'))).rejects.toMatchObject({
      message: 'Email o contraseña incorrectos. Te quedan 3 intentos.',
    });
    const attempt = await LoginAttemptModel.findOne({ identifier: 'nadie@empresa.es' });
    expect(attempt?.failedCount).toBe(2);
  });
});

describe('login · estado de la cuenta', () => {
  it('Bloqueado: credenciales erróneas dan el mensaje genérico', async () => {
    await createUser('ana@empresa.es', 'Bloqueado');
    await expect(login(credentials('ana@empresa.es', 'mal'))).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });
  });

  it('Bloqueado: con la contraseña correcta da AUTH_ACCOUNT_BLOCKED', async () => {
    await createUser('ana@empresa.es', 'Bloqueado');
    await expect(login(credentials('ana@empresa.es'))).rejects.toMatchObject({
      code: 'AUTH_ACCOUNT_BLOCKED',
      status: 403,
    });
    await expect(SessionModel.countDocuments()).resolves.toBe(0);
  });

  it('Invitado: con la contraseña correcta da AUTH_INVITATION_PENDING', async () => {
    await createUser('ana@empresa.es', 'Invitado');
    await expect(login(credentials('ana@empresa.es'))).rejects.toMatchObject({
      code: 'AUTH_INVITATION_PENDING',
      status: 403,
    });
  });
});
