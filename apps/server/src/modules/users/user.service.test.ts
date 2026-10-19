import { USER_ERROR_CODES } from '@app/shared';
import { verifyPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { login } from '../auth/auth.service';
import { ensureBootstrapAccount } from '../auth/bootstrap.service';
import { SessionModel } from '../auth/session.model';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from './user.model';
import { createUser, updateUser, type UserRef } from './user.service';
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

/** Primer Administrador real (retira la cuenta inicial): a partir de aquí hay usuarios reales. */
async function realAdmin(): Promise<UserRef> {
  const { user } = await createUser(firstAdminInput(), await bootstrapActor());
  return { id: user.id, login: user.email };
}

function newUserInput(email: string, role = 'Comercial') {
  return { name: 'Bea Gómez', email, role, password: PASSWORD };
}

function signIn(loginValue: string) {
  return login({ login: loginValue, password: PASSWORD, persistent: false, client: 'web' });
}

/** Crea un Comercial con el primer Administrador como autor. */
async function realAdminAndComercial() {
  const actor = await realAdmin();
  const { user } = await createUser(newUserInput('bea@empresa.es'), actor);
  return { actor, user };
}

describe('createUser · alta con usuarios reales (US2)', () => {
  it.each([
    ['Comercial', 'comercial@empresa.es'],
    ['Almacén', 'almacen@empresa.es'],
    ['Administración', 'administracion@empresa.es'],
  ])('con el rol %s queda Activo y bootstrapRetired: false', async (role, email) => {
    const result = await createUser(newUserInput(email, role), await realAdmin());
    expect(result.bootstrapRetired).toBe(false);
    expect(result.user).toMatchObject({ role, roleName: role, status: 'Activo' });
  });

  it('con un rol inexistente → USER_ROLE_NOT_FOUND 400', async () => {
    const actor = await realAdmin();
    await expect(
      createUser(newUserInput('bea@empresa.es', 'Inexistente'), actor),
    ).rejects.toMatchObject({ code: USER_ERROR_CODES.roleNotFound, status: 400 });
  });

  it('con un email ya usado (« Ana@Empresa.ES » normalizado) → USER_EMAIL_TAKEN 409', async () => {
    const actor = await realAdmin();
    // createUserSchema recorta y pasa a minúsculas antes de llegar al servicio.
    const email = ' Ana@Empresa.ES '.trim().toLowerCase();
    await expect(createUser(newUserInput(email), actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.emailTaken,
      status: 409,
    });
  });

  it('dos altas simultáneas con el mismo email: solo una tiene éxito', async () => {
    const actor = await realAdmin();
    await UserModel.syncIndexes();
    const results = await Promise.allSettled([
      createUser(newUserInput('bea@empresa.es'), actor),
      createUser(newUserInput('bea@empresa.es'), actor),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await UserModel.countDocuments({ login: 'bea@empresa.es' })).toBe(1);
  });
});

describe('updateUser · nombre y email (US2, FR-024)', () => {
  it('cambia el login y registra los cambios de email y nombre', async () => {
    const { actor, user } = await realAdminAndComercial();
    const input = { name: 'Beatriz Gómez', email: 'beatriz@empresa.es' };
    const updated = await updateUser(user.id, input, actor);
    expect(updated).toMatchObject({ ...input, roleName: 'Comercial' });
    const entry = await UserAuditModel.findOne({ action: 'update' }).lean().orFail();
    expect(entry.changes).toEqual([
      { field: 'email', from: 'bea@empresa.es', to: 'beatriz@empresa.es' },
      { field: 'name', from: 'Bea Gómez', to: 'Beatriz Gómez' },
    ]);
    expect(entry.targetLogin).toBe('beatriz@empresa.es');
  });

  it('con un email usado por otro usuario → USER_EMAIL_TAKEN 409', async () => {
    const { actor, user } = await realAdminAndComercial();
    await expect(updateUser(user.id, { email: 'ana@empresa.es' }, actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.emailTaken,
      status: 409,
    });
  });

  it('no revoca sus sesiones', async () => {
    const { actor, user } = await realAdminAndComercial();
    const session = await openSessionFor(user.id);
    await updateUser(user.id, { email: 'beatriz@empresa.es' }, actor);
    expect((await SessionModel.findById(session.id).orFail()).revokedAt).toBeNull();
  });

  it('el email anterior ya no inicia sesión y el nuevo sí', async () => {
    const { actor, user } = await realAdminAndComercial();
    await updateUser(user.id, { email: 'beatriz@empresa.es' }, actor);
    await expect(signIn('bea@empresa.es')).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    await expect(signIn('beatriz@empresa.es')).resolves.toMatchObject({
      user: { login: 'beatriz@empresa.es' },
    });
  });
});

describe('updateUser · casos límite (US2)', () => {
  it('sin cambios reales no registra ninguna entrada', async () => {
    const { actor, user } = await realAdminAndComercial();
    await updateUser(user.id, { name: 'Bea Gómez' }, actor);
    expect(await UserAuditModel.countDocuments({ action: 'update' })).toBe(0);
  });

  it('con la cuenta inicial o un id inexistente → USER_NOT_FOUND 404', async () => {
    const actor = await bootstrapActor();
    await expect(updateUser(actor.id, { name: 'X' }, actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.notFound,
      status: 404,
    });
  });

  it('el cambio de rol todavía no se aplica → VALIDATION_ERROR 400 (llega con US4)', async () => {
    const { actor, user } = await realAdminAndComercial();
    await expect(updateUser(user.id, { role: 'Almacén' }, actor)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });
});
