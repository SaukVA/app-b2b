import { hashPassword, verifyPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { UserModel } from '../users/user.model';
import {
  countRealUsers,
  ensureBootstrapAccount,
  retireBootstrapIfNeeded,
} from './bootstrap.service';
import { SessionModel } from './session.model';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function createRealUser() {
  const passwordHash = await hashPassword('secreto123');
  return UserModel.create({
    login: 'ana@empresa.es',
    name: 'Ana',
    passwordHash,
    role: 'Comercial',
    status: 'Activo',
  });
}

function findBootstrap() {
  return UserModel.findOne({ isBootstrap: true }).select('+passwordHash');
}

async function createBootstrapSession(userId: unknown) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  return SessionModel.create({
    userId,
    refreshTokenHash: `hash-${Date.now()}`,
    persistent: false,
    client: 'web',
    lastActivityAt: new Date(),
    expiresAt,
    revokedAt: null,
  });
}

describe('ensureBootstrapAccount', () => {
  it('crea la cuenta inicial "admin" si no hay usuarios', async () => {
    await ensureBootstrapAccount();
    const admin = await findBootstrap();
    expect(admin).toMatchObject({
      login: 'admin',
      role: 'Administrador',
      status: 'Activo',
      isBootstrap: true,
    });
    await expect(verifyPassword('admin', admin?.passwordHash)).resolves.toBe(true);
  });

  it('no la duplica si ya existe', async () => {
    await ensureBootstrapAccount();
    await ensureBootstrapAccount();
    await expect(UserModel.countDocuments({ isBootstrap: true })).resolves.toBe(1);
  });

  it('no la crea si ya hay usuarios reales', async () => {
    await createRealUser();
    await ensureBootstrapAccount();
    await expect(findBootstrap()).resolves.toBeNull();
  });

  it('la borra y revoca sus sesiones si hay usuarios reales', async () => {
    await ensureBootstrapAccount();
    const session = await createBootstrapSession((await findBootstrap())?._id);
    await createRealUser();
    await ensureBootstrapAccount();
    await expect(findBootstrap()).resolves.toBeNull();
    expect((await SessionModel.findById(session._id))?.revokedAt).toBeInstanceOf(Date);
  });
});

describe('retireBootstrapIfNeeded', () => {
  it('no hace nada si no hay usuarios reales', async () => {
    await ensureBootstrapAccount();
    await expect(retireBootstrapIfNeeded()).resolves.toBe(false);
    await expect(findBootstrap()).resolves.not.toBeNull();
  });

  it('retira la cuenta inicial en cuanto existe un usuario real', async () => {
    await ensureBootstrapAccount();
    await createRealUser();
    await expect(retireBootstrapIfNeeded()).resolves.toBe(true);
    await expect(countRealUsers()).resolves.toBe(1);
    await expect(UserModel.countDocuments()).resolves.toBe(1);
  });

  it('devuelve false si ya no existe la cuenta inicial', async () => {
    await createRealUser();
    await expect(retireBootstrapIfNeeded()).resolves.toBe(false);
  });
});

describe('UserModel · login de la cuenta inicial', () => {
  it('rechaza "admin" sin formato email en un usuario real', async () => {
    const passwordHash = await hashPassword('admin');
    await expect(
      UserModel.create({ login: 'admin', passwordHash, role: 'Administrador', status: 'Activo' }),
    ).rejects.toThrow('El login debe ser un email válido');
  });
});
