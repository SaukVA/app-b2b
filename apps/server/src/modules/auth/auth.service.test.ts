import type { UserStatus } from '@app/shared';
import { hashPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { UserModel } from '../users/user.model';
import { hashToken, verifyAccessToken } from '../../utils/tokens';
import { RoleModel } from '../roles/role.model';
import { ensureDefaultRoles } from '../roles/role.service';
import { getCurrentUser, login, refresh, resolveAuthContext, touchSession } from './auth.service';
import { LoginAttemptModel } from './loginAttempt.model';
import { SessionModel } from './session.model';

setTestEnv();

beforeAll(startTestDb);
beforeEach(ensureDefaultRoles);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';
const credentials = (loginValue: string, password = PASSWORD) => ({
  login: loginValue,
  password,
  persistent: false,
  client: 'web' as const,
});

async function createUser(login: string, status: UserStatus = 'Activo', role = 'Comercial') {
  const passwordHash = await hashPassword(PASSWORD);
  return UserModel.create({ login, name: 'Ana García', passwordHash, role, status });
}

describe('login · credenciales correctas', () => {
  it('crea la sesión, devuelve tokens y el DTO sin passwordHash', async () => {
    await createUser('ana@empresa.es');
    const result = await login(credentials('  ANA@Empresa.es '));
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toMatchObject({
      login: 'ana@empresa.es',
      role: 'Comercial',
      isBootstrap: false,
    });
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
});

const COMERCIAL_PERMISSIONS = {
  ventas: 'edit',
  clientes: 'edit',
  productos: 'view',
  proveedores: 'none',
  cobros: 'view',
  ajustes: 'none',
};

describe('permisos desde la colección roles (ADR 0003)', () => {
  async function contextOf(accessToken: string) {
    return resolveAuthContext(verifyAccessToken(accessToken)!);
  }

  it('login, refresh y getCurrentUser devuelven AuthUser con roleName y permissions', async () => {
    const user = await createUser('ana@empresa.es');
    const issued = await login(credentials('ana@empresa.es'));
    const expected = { roleName: 'Comercial', permissions: COMERCIAL_PERMISSIONS };
    expect(issued.user).toMatchObject(expected);
    expect((await refresh(issued.refreshToken)).user).toMatchObject(expected);
    await expect(getCurrentUser(user.id)).resolves.toMatchObject(expected);
  });

  it('resolveAuthContext devuelve los permisos guardados en el rol', async () => {
    await createUser('ana@empresa.es');
    const issued = await login(credentials('ana@empresa.es'));
    await expect(contextOf(issued.accessToken)).resolves.toMatchObject({
      permissions: COMERCIAL_PERMISSIONS,
    });
  });

  it('un cambio en roles se aplica en la siguiente llamada (FR-028)', async () => {
    await createUser('ana@empresa.es');
    const issued = await login(credentials('ana@empresa.es'));
    await RoleModel.updateOne({ key: 'Comercial' }, { 'permissions.ajustes': 'view' });
    const context = await contextOf(issued.accessToken);
    expect(context.permissions.ajustes).toBe('view');
  });

  it('con una clave de rol inexistente todos los módulos son none', async () => {
    await createUser('ana@empresa.es', 'Activo', 'Inexistente');
    const issued = await login(credentials('ana@empresa.es'));
    expect(issued.user.roleName).toBe('Inexistente');
    expect(Object.values(issued.user.permissions)).toEqual(Array(6).fill('none'));
  });
});

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE_MS);

async function loginAs(persistent = false) {
  await createUser('ana@empresa.es');
  return login({ ...credentials('ana@empresa.es'), persistent });
}

describe('refresh · rotación', () => {
  it('rota el hash, guarda el anterior y emite tokens nuevos', async () => {
    const issued = await loginAs();
    const result = await refresh(issued.refreshToken);
    expect(result.refreshToken).not.toBe(issued.refreshToken);
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result).toMatchObject({
      persistent: false,
      client: 'web',
      user: { login: 'ana@empresa.es' },
    });
    const session = await SessionModel.findOne();
    expect(session?.refreshTokenHash).toBe(hashToken(result.refreshToken));
    expect(session?.previousRefreshTokenHash).toBe(hashToken(issued.refreshToken));
  });

  it('reutilizar un refresh token ya rotado revoca la sesión', async () => {
    const issued = await loginAs();
    const rotated = await refresh(issued.refreshToken);
    await expect(refresh(issued.refreshToken)).rejects.toMatchObject({
      code: 'AUTH_SESSION_EXPIRED',
      status: 401,
    });
    expect((await SessionModel.findOne())?.revokedAt).toBeInstanceOf(Date);
    await expect(refresh(rotated.refreshToken)).rejects.toMatchObject({
      code: 'AUTH_SESSION_EXPIRED',
    });
  });

  it('un token desconocido o ausente da AUTH_SESSION_EXPIRED', async () => {
    await expect(refresh('no-existe')).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });
    await expect(refresh(undefined)).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });
  });

  it('falla si el usuario ya no está activo', async () => {
    const issued = await loginAs();
    await UserModel.updateOne({ login: 'ana@empresa.es' }, { status: 'Bloqueado' });
    await expect(refresh(issued.refreshToken)).rejects.toMatchObject({
      code: 'AUTH_SESSION_EXPIRED',
    });
  });
});

describe('refresh · caducidad', () => {
  it('no persistente: más de 30 min sin actividad → AUTH_SESSION_EXPIRED', async () => {
    const issued = await loginAs(false);
    const lastActivityAt = minutesAgo(31);
    await SessionModel.updateOne(
      {},
      { lastActivityAt, expiresAt: new Date(lastActivityAt.getTime() + 30 * MINUTE_MS) },
    );
    await expect(refresh(issued.refreshToken)).rejects.toMatchObject({
      code: 'AUTH_SESSION_EXPIRED',
    });
  });

  it('persistente: a los 30 días de createdAt → AUTH_SESSION_EXPIRED', async () => {
    const issued = await loginAs(true);
    const createdAt = new Date(Date.now() - 31 * DAY_MS);
    await SessionModel.collection.updateOne(
      {},
      {
        $set: {
          createdAt,
          lastActivityAt: minutesAgo(1),
          expiresAt: new Date(createdAt.getTime() + 30 * DAY_MS),
        },
      },
    );
    await expect(refresh(issued.refreshToken)).rejects.toMatchObject({
      code: 'AUTH_SESSION_EXPIRED',
    });
  });

  it('persistente: sin límite de inactividad dentro de los 30 días', async () => {
    const issued = await loginAs(true);
    await SessionModel.updateOne({}, { lastActivityAt: minutesAgo(3 * 24 * 60) });
    await expect(refresh(issued.refreshToken)).resolves.toMatchObject({ persistent: true });
  });
});

describe('touchSession', () => {
  it('no escribe si la última actividad fue hace menos de un minuto', async () => {
    await loginAs();
    const session = await SessionModel.findOneAndUpdate(
      {},
      { lastActivityAt: new Date(Date.now() - 30 * 1000) },
      { new: true },
    );
    await touchSession(session!);
    expect((await SessionModel.findOne())?.lastActivityAt).toEqual(session?.lastActivityAt);
  });

  it('no persistente: actualiza lastActivityAt y alarga expiresAt 30 min', async () => {
    await loginAs(false);
    const session = await SessionModel.findOneAndUpdate(
      {},
      { lastActivityAt: minutesAgo(5) },
      { new: true },
    );
    const now = new Date();
    await touchSession(session!, now);
    const updated = await SessionModel.findOne();
    expect(updated?.lastActivityAt).toEqual(now);
    expect(updated?.expiresAt).toEqual(new Date(now.getTime() + 30 * MINUTE_MS));
  });

  it('persistente: actualiza lastActivityAt sin tocar expiresAt', async () => {
    await loginAs(true);
    const session = await SessionModel.findOneAndUpdate(
      {},
      { lastActivityAt: minutesAgo(5) },
      { new: true },
    );
    await touchSession(session!, new Date());
    expect((await SessionModel.findOne())?.expiresAt).toEqual(session?.expiresAt);
  });
});

// --- Bloqueo temporal (US5) ---
// Solo se simula Date: los temporizadores reales los necesita el driver de MongoDB.
const REAL_TIMERS = [
  'nextTick',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
  'queueMicrotask',
  'hrtime',
  'performance',
] as const;
const T0 = new Date('2026-10-15T10:00:00Z'); // 12:00 en Madrid (CEST)
const LOCKED = {
  code: 'AUTH_ACCOUNT_LOCKED',
  status: 423,
  message: 'Demasiados intentos. Vuelve a intentarlo a las 12:15.',
};

const setNow = (offsetMinutes: number) =>
  jest.setSystemTime(T0.getTime() + offsetMinutes * MINUTE_MS);
const wrong = () => login(credentials('ana@empresa.es', 'mal'));
const right = () => login(credentials('ana@empresa.es'));

async function failTimes(times: number) {
  for (let i = 0; i < times; i += 1) await wrong().catch(() => undefined);
}

function useLockoutClock() {
  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: [...REAL_TIMERS] });
    setNow(0);
    await createUser('ana@empresa.es');
  });
  afterEach(() => jest.useRealTimers());
}

describe('login · bloqueo temporal por intentos fallidos', () => {
  useLockoutClock();

  it('el 5.º fallo bloquea 15 min e indica la hora de Madrid', async () => {
    await failTimes(4);
    await expect(wrong()).rejects.toMatchObject(LOCKED);
    const attempt = await LoginAttemptModel.findOne({ identifier: 'ana@empresa.es' });
    expect(attempt?.lockedUntil).toEqual(new Date(T0.getTime() + 15 * MINUTE_MS));
  });

  it('con el bloqueo activo rechaza incluso la contraseña correcta', async () => {
    await failTimes(5);
    setNow(14);
    await expect(right()).rejects.toMatchObject(LOCKED);
    await expect(SessionModel.countDocuments()).resolves.toBe(0);
  });
});

describe('login · fin del bloqueo y reinicio del contador', () => {
  useLockoutClock();

  it('pasado el bloqueo, la contraseña correcta entra y reinicia el contador', async () => {
    await failTimes(5);
    setNow(16);
    await expect(right()).resolves.toMatchObject({ user: { login: 'ana@empresa.es' } });
    await expect(LoginAttemptModel.countDocuments()).resolves.toBe(0);
  });

  it('pasado el bloqueo, un fallo vuelve a contar desde el principio', async () => {
    await failTimes(5);
    setNow(16);
    await expect(wrong()).rejects.toMatchObject({
      message: 'Email o contraseña incorrectos. Te quedan 4 intentos.',
    });
  });

  it('un acceso correcto antes del límite reinicia el contador', async () => {
    await failTimes(4);
    await right();
    await expect(wrong()).rejects.toMatchObject({
      message: 'Email o contraseña incorrectos. Te quedan 4 intentos.',
    });
  });

  it('también bloquea un email que no existe, con el mismo mensaje', async () => {
    for (let i = 0; i < 4; i += 1)
      await login(credentials('nadie@empresa.es', 'mal')).catch(() => undefined);
    await expect(login(credentials('nadie@empresa.es', 'mal'))).rejects.toMatchObject(LOCKED);
  });
});
