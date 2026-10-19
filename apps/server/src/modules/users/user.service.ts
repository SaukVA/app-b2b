import { USER_ERROR_CODES } from '@app/shared';
import { AppError } from '../../utils/AppError';
import { SessionModel } from '../auth/session.model';
import type { RoleDocument } from '../roles/role.model';
import { findRole } from '../roles/role.service';
import { UserModel, type UserDocument } from './user.model';
import { UserAuditModel, type UserAuditAction, type UserAuditChange } from './userAudit.model';

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
