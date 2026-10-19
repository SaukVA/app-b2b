import { USER_ERROR_CODES } from '@app/shared';
import { verifyPassword } from '../../utils/password';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { login } from '../auth/auth.service';
import { ensureBootstrapAccount } from '../auth/bootstrap.service';
import { SessionModel } from '../auth/session.model';
import { ensureDefaultRoles } from '../roles/role.service';
import { UserModel } from './user.model';
import { RoleModel } from '../roles/role.model';
import {
  createUser,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
  type UserRef,
} from './user.service';
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
});

describe('listUsers (US3, FR-011)', () => {
  async function seedUsers() {
    const actor = await realAdmin();
    for (const name of ['Carlos Ruiz', 'Bea Gómez', 'Álvaro Díaz']) {
      const email = `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')}@empresa.es`;
      await createUser({ name, email, role: 'Comercial', password: PASSWORD }, actor);
    }
  }

  it('excluye la cuenta inicial y ordena por nombre en español (Á antes de B)', async () => {
    await ensureBootstrapAccount();
    await seedUsers();
    await UserModel.create({
      login: 'admin',
      name: 'Administrador inicial',
      passwordHash: 'x',
      role: 'Administrador',
      status: 'Activo',
      isBootstrap: true,
    });
    const names = (await listUsers()).map((user) => user.name);
    expect(names).toEqual(['Álvaro Díaz', 'Ana Pérez', 'Bea Gómez', 'Carlos Ruiz']);
  });

  it('roleName sale del documento de roles', async () => {
    await seedUsers();
    await RoleModel.updateOne({ key: 'Comercial' }, { name: 'Comercial senior' });
    const bea = (await listUsers()).find((user) => user.email === 'bea@empresa.es');
    expect(bea).toMatchObject({ role: 'Comercial', roleName: 'Comercial senior' });
  });

  it('lastLoginAt es null si nunca ha entrado y una fecha ISO si ha entrado', async () => {
    await seedUsers();
    await signIn('bea@empresa.es');
    const users = await listUsers();
    expect(users.find((user) => user.email === 'carlos@empresa.es')?.lastLoginAt).toBeNull();
    const beaLogin = users.find((user) => user.email === 'bea@empresa.es')?.lastLoginAt;
    expect(beaLogin).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

function activeAdmins() {
  return UserModel.countDocuments({ isBootstrap: false, status: 'Activo', role: 'Administrador' });
}

describe('updateUser · cambio de rol (US4)', () => {
  it('cambia el rol, lo registra y no cierra sus sesiones', async () => {
    const { actor, user } = await realAdminAndComercial();
    const session = await openSessionFor(user.id);
    const updated = await updateUser(user.id, { role: 'Almacén' }, actor);
    expect(updated).toMatchObject({ role: 'Almacén', roleName: 'Almacén' });
    const entry = await UserAuditModel.findOne({ action: 'update' }).lean().orFail();
    expect(entry.changes).toEqual([{ field: 'role', from: 'Comercial', to: 'Almacén' }]);
    expect((await SessionModel.findById(session.id).orFail()).revokedAt).toBeNull();
  });

  it('con un rol inexistente → USER_ROLE_NOT_FOUND 400', async () => {
    const { actor, user } = await realAdminAndComercial();
    await expect(updateUser(user.id, { role: 'Inexistente' }, actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.roleNotFound,
      status: 400,
    });
  });

  it('degradar al único Administrador activo → USER_LAST_ADMIN 409 y el rol no cambia', async () => {
    const actor = await realAdmin();
    await expect(updateUser(actor.id, { role: 'Comercial' }, actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.lastAdmin,
      status: 409,
    });
    expect((await UserModel.findById(actor.id).orFail()).role).toBe('Administrador');
    expect(await UserAuditModel.countDocuments({ action: 'update' })).toBe(0);
  });
});

describe('setUserStatus · bloqueo y desbloqueo (US4)', () => {
  it('bloquear cambia el estado, revoca sus sesiones, lo registra y ya no entra', async () => {
    const { actor, user } = await realAdminAndComercial();
    const session = await openSessionFor(user.id);
    const updated = await setUserStatus(user.id, 'Bloqueado', actor);
    expect(updated.status).toBe('Bloqueado');
    expect((await SessionModel.findById(session.id).orFail()).revokedAt).toBeInstanceOf(Date);
    const entry = await UserAuditModel.findOne({ action: 'block' }).lean().orFail();
    expect(entry.changes).toEqual([{ field: 'status', from: 'Activo', to: 'Bloqueado' }]);
    await expect(signIn('bea@empresa.es')).rejects.toMatchObject({ code: 'AUTH_ACCOUNT_BLOCKED' });
  });

  it('desbloquear lo deja Activo, lo registra y entra con su contraseña de siempre', async () => {
    const { actor, user } = await realAdminAndComercial();
    await setUserStatus(user.id, 'Bloqueado', actor);
    const updated = await setUserStatus(user.id, 'Activo', actor);
    expect(updated.status).toBe('Activo');
    expect(await UserAuditModel.countDocuments({ action: 'unblock' })).toBe(1);
    await expect(signIn('bea@empresa.es')).resolves.toMatchObject({
      user: { login: 'bea@empresa.es' },
    });
  });

  it('bloquear a alguien ya bloqueado no registra nada nuevo', async () => {
    const { actor, user } = await realAdminAndComercial();
    await setUserStatus(user.id, 'Bloqueado', actor);
    await setUserStatus(user.id, 'Bloqueado', actor);
    expect(await UserAuditModel.countDocuments({ action: 'block' })).toBe(1);
  });

  it('bloquearse a uno mismo → USER_SELF_BLOCK 409', async () => {
    const actor = await realAdmin();
    await expect(setUserStatus(actor.id, 'Bloqueado', actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.selfBlock,
      status: 409,
    });
  });
});

describe('setUserStatus · último Administrador (US4, FR-016)', () => {
  it('un usuario con permiso de Ajustes no puede bloquear al único Administrador activo', async () => {
    const admin = await realAdmin();
    await RoleModel.create({
      key: 'Supervisor',
      name: 'Supervisor',
      isAdmin: false,
      order: 5,
      permissions: { ajustes: 'edit' },
    });
    const { user } = await createUser(newUserInput('sup@empresa.es', 'Supervisor'), admin);
    const supervisor = { id: user.id, login: user.email };
    await expect(setUserStatus(admin.id, 'Bloqueado', supervisor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.lastAdmin,
      status: 409,
    });
    expect((await UserModel.findById(admin.id).orFail()).status).toBe('Activo');
  });

  it('dos bloqueos cruzados a la vez: como mucho uno sale bien y queda un Administrador', async () => {
    const a = await realAdmin();
    const { user } = await createUser(newUserInput('bea@empresa.es', 'Administrador'), a);
    const b = { id: user.id, login: user.email };
    const results = await Promise.allSettled([
      setUserStatus(b.id, 'Bloqueado', a),
      setUserStatus(a.id, 'Bloqueado', b),
    ]);
    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    expect(succeeded).toBeLessThanOrEqual(1);
    expect(await activeAdmins()).toBeGreaterThanOrEqual(1);
    expect(await UserAuditModel.countDocuments({ action: 'block' })).toBe(succeeded);
  });
});

const NEW_PASSWORD = 'nuevaClave456';

function signInWith(loginValue: string, password: string) {
  return login({ login: loginValue, password, persistent: false, client: 'web' });
}

/** Cinco fallos seguidos: el quinto deja el login bloqueado 15 minutos (bloqueo temporal de 001). */
async function lockOut(loginValue: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await signInWith(loginValue, 'incorrecta').catch(() => undefined);
  }
  await expect(signInWith(loginValue, PASSWORD)).rejects.toMatchObject({
    code: 'AUTH_ACCOUNT_LOCKED',
  });
}

describe('resetUserPassword · contraseña y sesiones (US5)', () => {
  it('la contraseña anterior deja de servir y la nueva entra', async () => {
    const { actor, user } = await realAdminAndComercial();
    await resetUserPassword(user.id, NEW_PASSWORD, actor);
    await expect(signIn('bea@empresa.es')).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    await expect(signInWith('bea@empresa.es', NEW_PASSWORD)).resolves.toMatchObject({
      user: { login: 'bea@empresa.es' },
    });
  });

  it('revoca todas sus sesiones', async () => {
    const { actor, user } = await realAdminAndComercial();
    await openSessionFor(user.id);
    await signIn('bea@empresa.es');
    await resetUserPassword(user.id, NEW_PASSWORD, actor);
    const sessions = await SessionModel.find({ userId: user.id }).lean();
    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.revokedAt instanceof Date)).toBe(true);
  });

  it('autorrestablecimiento: también revoca la sesión propia', async () => {
    const actor = await realAdmin();
    const session = await openSessionFor(actor.id);
    await resetUserPassword(actor.id, NEW_PASSWORD, actor);
    expect((await SessionModel.findById(session.id).orFail()).revokedAt).toBeInstanceOf(Date);
  });
});

describe('resetUserPassword · bloqueos y registro (US5, FR-019, FR-022)', () => {
  it('reinicia el bloqueo temporal: entra al momento con la nueva', async () => {
    const { actor, user } = await realAdminAndComercial();
    await lockOut('bea@empresa.es');
    await resetUserPassword(user.id, NEW_PASSWORD, actor);
    await expect(signInWith('bea@empresa.es', NEW_PASSWORD)).resolves.toMatchObject({
      user: { login: 'bea@empresa.es' },
    });
  });

  it('un usuario Bloqueado sigue Bloqueado', async () => {
    const { actor, user } = await realAdminAndComercial();
    await setUserStatus(user.id, 'Bloqueado', actor);
    await resetUserPassword(user.id, NEW_PASSWORD, actor);
    expect((await UserModel.findById(user.id).orFail()).status).toBe('Bloqueado');
  });

  it('registra resetPassword con changes vacío y sin contraseña ni hash', async () => {
    const { actor, user } = await realAdminAndComercial();
    await resetUserPassword(user.id, NEW_PASSWORD, actor);
    const entry = await UserAuditModel.findOne({ action: 'resetPassword' }).lean().orFail();
    expect(entry).toMatchObject({ actorLogin: 'ana@empresa.es', targetLogin: 'bea@empresa.es' });
    expect(entry.changes).toEqual([]);
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain(NEW_PASSWORD);
    expect(serialized).not.toMatch(/\$2[aby]\$/);
  });

  it('con la cuenta inicial → USER_NOT_FOUND 404', async () => {
    const actor = await bootstrapActor();
    await expect(resetUserPassword(actor.id, NEW_PASSWORD, actor)).rejects.toMatchObject({
      code: USER_ERROR_CODES.notFound,
      status: 404,
    });
  });
});
