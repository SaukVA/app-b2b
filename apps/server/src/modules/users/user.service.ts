import {
  USER_ERROR_CODES,
  type CreateUserResponse,
  type UserStatus,
  type UserSummary,
} from '@app/shared';
import { AppError } from '../../utils/AppError';
import { hashPassword } from '../../utils/password';
import { countRealUsers, retireBootstrapIfNeeded } from '../auth/bootstrap.service';
import { SessionModel } from '../auth/session.model';
import type { RoleDocument } from '../roles/role.model';
import { findAdminRoleKeys, findRole, listRoles } from '../roles/role.service';
import { toUserSummary } from './user.mapper';
import { UserModel, type UserDocument } from './user.model';
import type { CreateUserInput, UpdateUserInput } from './user.validation';
import {
  UserAuditModel,
  type UserAuditAction,
  type UserAuditChange,
  type UserAuditField,
} from './userAudit.model';

/** Quien hace o recibe una acción de gestión, con su login en ese momento (para el registro). */
export interface UserRef {
  id: string;
  login: string;
}

const DUPLICATE_KEY = 11000;

/** Usuario real por id; la cuenta inicial no se gestiona desde aquí (FR-005). */
export async function findRealUserOrThrow(id: string): Promise<UserDocument> {
  const user = await UserModel.findOne({ _id: id, isBootstrap: false });
  if (!user) throw new AppError(USER_ERROR_CODES.notFound, 404, 'El usuario no existe.');
  return user;
}

export async function assertRoleExists(key: string): Promise<RoleDocument> {
  const role = await findRole(key);
  if (!role) throw new AppError(USER_ERROR_CODES.roleNotFound, 400, 'El rol indicado no existe.');
  return role;
}

export async function isAdminRoleKey(key: string): Promise<boolean> {
  return (await findRole(key))?.isAdmin === true;
}

/** Índice único de `login` (research R3): un E11000 es un email ya usado, sin distinguir mayúsculas. */
export function toEmailTakenError(err: unknown): unknown {
  if ((err as { code?: unknown } | null)?.code !== DUPLICATE_KEY) return err;
  return new AppError(USER_ERROR_CODES.emailTaken, 409, 'Ya existe un usuario con ese email.');
}

/** Añade una entrada al registro de acciones (FR-025). NEVER recibe contraseñas ni hashes. */
export async function recordAudit(entry: {
  action: UserAuditAction;
  actor: UserRef;
  target: UserRef;
  changes?: UserAuditChange[];
}): Promise<void> {
  await UserAuditModel.create({
    action: entry.action,
    actorId: entry.actor.id,
    actorLogin: entry.actor.login,
    targetId: entry.target.id,
    targetLogin: entry.target.login,
    changes: entry.changes ?? [],
  });
}

/** Revoca todas las sesiones activas del usuario: dejan de valer en la siguiente petición (research R1). */
export async function revokeUserSessions(userId: string): Promise<void> {
  await SessionModel.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}

/** Sin usuarios reales, el primero tiene que tener el rol de Administrador (FR-003, research R4). */
async function assertFirstUserIsAdmin(role: RoleDocument): Promise<void> {
  if (role.isAdmin || (await countRealUsers()) > 0) return;
  throw new AppError(
    USER_ERROR_CODES.firstMustBeAdmin,
    409,
    'El primer usuario tiene que ser Administrador.',
  );
}

async function insertUser(input: CreateUserInput): Promise<UserDocument> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await UserModel.create({
      login: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      status: 'Activo',
      isBootstrap: false,
    });
  } catch (err) {
    throw toEmailTakenError(err);
  }
}

/** Alta directa: el usuario queda Activo. Con el primer usuario real se retira la cuenta inicial (FR-004). */
export async function createUser(
  input: CreateUserInput,
  actor: UserRef,
): Promise<CreateUserResponse> {
  const role = await assertRoleExists(input.role);
  await assertFirstUserIsAdmin(role);
  const user = await insertUser(input);
  const bootstrapRetired = await retireBootstrapIfNeeded();
  await recordAudit({
    action: 'create',
    actor,
    target: { id: user.id as string, login: user.login },
  });
  return { user: toUserSummary(user, role.name), bootstrapRetired };
}

type UserField = 'login' | 'name' | 'role' | 'status';
type UserUpdate = Partial<Record<UserField, string>>;
type ChangeInput = Partial<Record<UserAuditField, string>>;

const FIELD_OF: Record<UserAuditField, UserField> = {
  email: 'login',
  name: 'name',
  role: 'role',
  status: 'status',
};

/** Solo los campos que cambian, en el orden del registro (FR-025). */
function collectChanges(user: UserDocument, input: ChangeInput): UserAuditChange[] {
  const candidates: Array<[UserAuditField, string, string | undefined]> = [
    ['email', user.login, input.email],
    ['name', user.name, input.name],
    ['role', user.role, input.role],
    ['status', user.status, input.status],
  ];
  return candidates
    .filter(([, from, to]) => to !== undefined && to !== from)
    .map(([field, from, to]) => ({ field, from, to: to ?? null }));
}

function toUpdate(changes: UserAuditChange[]): UserUpdate {
  return Object.fromEntries(changes.map((change) => [FIELD_OF[change.field], change.to]));
}

/** Los valores que tenía el documento en los campos que toca `update` (para compensar). */
function previousValues(before: UserDocument, update: UserUpdate): UserUpdate {
  const fields = Object.keys(update) as UserField[];
  return Object.fromEntries(fields.map((field) => [field, before.get(field) as string]));
}

/** Guarda el cambio y devuelve el documento anterior; un email repetido es USER_EMAIL_TAKEN (R3). */
async function saveUpdate(id: string, update: UserUpdate): Promise<UserDocument> {
  try {
    const before = await UserModel.findOneAndUpdate(
      { _id: id, isBootstrap: false },
      { $set: update },
      { new: false },
    );
    if (!before) throw new AppError(USER_ERROR_CODES.notFound, 404, 'El usuario no existe.');
    return before;
  } catch (err) {
    throw toEmailTakenError(err);
  }
}

function countActiveAdmins(adminKeys: string[]): Promise<number> {
  return UserModel.countDocuments({
    isBootstrap: false,
    status: 'Activo',
    role: { $in: adminKeys },
  }).exec();
}

/**
 * Aplica el cambio y, si deja la aplicación sin Administrador activo, lo deshace (research R2).
 * La compensación filtra por los valores nuevos: no pisa un cambio posterior de otra petición.
 */
async function applyWithAdminGuard(id: string, update: UserUpdate): Promise<UserDocument> {
  const adminKeys = await findAdminRoleKeys();
  const before = await saveUpdate(id, update);
  const wasActiveAdmin = before.status === 'Activo' && adminKeys.includes(before.role);
  if (!wasActiveAdmin || (await countActiveAdmins(adminKeys)) > 0) return before.set(update);
  await UserModel.updateOne({ _id: id, ...update }, { $set: previousValues(before, update) });
  throw new AppError(
    USER_ERROR_CODES.lastAdmin,
    409,
    'Debe quedar al menos un Administrador activo.',
  );
}

async function roleNameOf(key: string): Promise<string> {
  return (await findRole(key))?.name ?? key;
}

/** Nombre de cada rol por clave, con una sola consulta a `roles`. */
async function roleNamesByKey(): Promise<Map<string, string>> {
  return new Map((await listRoles()).map((role) => [role.key, role.name]));
}

/** Usuarios reales ordenados por nombre en español (Á antes de B), sin la cuenta inicial (FR-005, FR-011). */
export async function listUsers(): Promise<UserSummary[]> {
  const [users, roleNames] = await Promise.all([
    UserModel.find({ isBootstrap: false }).collation({ locale: 'es' }).sort({ name: 1 }),
    roleNamesByKey(),
  ]);
  return users.map((user) => toUserSummary(user, roleNames.get(user.role) ?? user.role));
}

/** Guarda → revoca sesiones (solo al bloquear) → registra. Una acción compensada no hace nada más. */
async function applyAndRecord(
  user: UserDocument,
  changes: UserAuditChange[],
  action: UserAuditAction,
  actor: UserRef,
): Promise<UserSummary> {
  if (changes.length === 0) return toUserSummary(user, await roleNameOf(user.role));
  const updated = await applyWithAdminGuard(user.id as string, toUpdate(changes));
  if (action === 'block') await revokeUserSessions(user.id as string);
  await recordAudit({
    action,
    actor,
    target: { id: user.id as string, login: updated.login },
    changes,
  });
  return toUserSummary(updated, await roleNameOf(updated.role));
}

/**
 * Corrige nombre, email y rol (FR-013, FR-024). No cierra sus sesiones: el rol nuevo se lee de `roles`
 * en la siguiente petición (FR-028).
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: UserRef,
): Promise<UserSummary> {
  const user = await findRealUserOrThrow(id);
  if (input.role !== undefined) await assertRoleExists(input.role);
  return applyAndRecord(user, collectChanges(user, input), 'update', actor);
}

function assertNotSelf(id: string, actor: UserRef): void {
  if (id !== actor.id) return;
  throw new AppError(USER_ERROR_CODES.selfBlock, 409, 'No puedes bloquearte a ti mismo.');
}

/** Bloquea (revoca todas sus sesiones) o desbloquea; nunca deja la aplicación sin Administrador. */
export async function setUserStatus(
  id: string,
  status: UserStatus,
  actor: UserRef,
): Promise<UserSummary> {
  if (status === 'Bloqueado') assertNotSelf(id, actor);
  const user = await findRealUserOrThrow(id);
  const action = status === 'Bloqueado' ? 'block' : 'unblock';
  return applyAndRecord(user, collectChanges(user, { status }), action, actor);
}
