import { USER_ERROR_CODES } from '@app/shared';
import { verifyPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { ensureBootstrapAccount } from '../auth/bootstrap.service';
import { SessionModel } from '../auth/session.model';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from './user.model';
import { createUser, type UserRef } from './user.service';
import { UserAuditModel } from './userAudit.model';

setTestEnv();

beforeAll(startTestDb);
beforeEach(async () => {
  await ensureDefaultRoles();
  await ensureBootstrapAccount();
});
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'secreto123';

async function bootstrapActor(): Promise<UserRef> {
  const bootstrap = await UserModel.findOne({ isBootstrap: true }).orFail();
  return { id: bootstrap.id as string, login: bootstrap.login };
}

async function openSessionFor(userId: string) {
  return SessionModel.create({
    userId,
    refreshTokenHash: `hash-${userId}`,
    persistent: false,
    client: 'web',
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
}

function firstAdminInput(role = 'Administrador') {
  return { name: 'Ana Pérez', email: 'ana@empresa.es', role, password: PASSWORD };
}

describe('createUser · primer usuario real (US1)', () => {
  it('con un rol distinto del Administrador → USER_FIRST_MUST_BE_ADMIN 409 y no crea nada', async () => {
    const actor = await bootstrapActor();
    await expect(createUser(firstAdminInput('Comercial'), actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.firstMustBeAdmin,
      status: 409,
    });
    expect(await UserModel.countDocuments({ isBootstrap: false })).toBe(0);
    expect(await UserModel.exists({ isBootstrap: true })).toBeTruthy();
    expect(await UserAuditModel.countDocuments()).toBe(0);
  });

  it('con Administrador crea un usuario Activo con el email como login y la contraseña hasheada', async () => {
    const actor = await bootstrapActor();
    const { user } = await createUser(firstAdminInput(), actor);
    expect(user).toMatchObject({
      name: 'Ana Pérez',
      email: 'ana@empresa.es',
      role: 'Administrador',
      roleName: 'Administrador',
      status: 'Activo',
      lastLoginAt: null,
    });
    const stored = await UserModel.findById(user.id).select('+passwordHash').orFail();
    expect(stored.isBootstrap).toBe(false);
    expect(stored.passwordHash).not.toBe(PASSWORD);
    expect(await verifyPassword(PASSWORD, stored.passwordHash)).toBe(true);
  });
});

describe('createUser · retirada de la cuenta inicial y registro (US1)', () => {
  it('devuelve bootstrapRetired: true, borra la cuenta inicial y revoca sus sesiones', async () => {
    const actor = await bootstrapActor();
    const session = await openSessionFor(actor.id);
    const result = await createUser(firstAdminInput(), actor);
    expect(result.bootstrapRetired).toBe(true);
    expect(await UserModel.exists({ isBootstrap: true })).toBeNull();
    expect((await SessionModel.findById(session.id).orFail()).revokedAt).toBeInstanceOf(Date);
  });

  it('registra una entrada create con actorLogin admin y sin contraseña ni hash', async () => {
    const actor = await bootstrapActor();
    const { user } = await createUser(firstAdminInput(), actor);
    const entries = await UserAuditModel.find().lean();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'create',
      actorLogin: 'admin',
      targetLogin: 'ana@empresa.es',
      changes: [],
    });
    expect(entries[0].targetId.toString()).toBe(user.id);
    const serialized = JSON.stringify(entries[0]);
    expect(serialized).not.toContain(PASSWORD);
    expect(serialized).not.toMatch(/\$2[aby]\$/);
  });
});
