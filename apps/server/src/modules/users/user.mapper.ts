import type { AuthUser, UserSummary } from '@app/shared';
import { toPermissionSet } from '../roles/role.mapper';
import type { RoleDocument } from '../roles/role.model';
import type { UserDocument } from './user.model';

/**
 * Documento de Mongoose → DTO compartido. NEVER se devuelve el documento en una respuesta.
 * Con un rol inexistente, el nombre es la clave y todos los módulos quedan en `none` (data-model.md).
 */
export function toAuthUser(doc: UserDocument, role: RoleDocument | null): AuthUser {
  return {
    id: doc._id.toString(),
    login: doc.login,
    name: doc.name,
    role: doc.role,
    roleName: role?.name ?? doc.role,
    permissions: toPermissionSet(role),
    isBootstrap: doc.isBootstrap,
    homeScreen: doc.homeScreen ?? null,
  };
}

/** Fila de Ajustes › Usuarios. El email es el `login`; NEVER incluye la contraseña ni su hash. */
export function toUserSummary(doc: UserDocument, roleName: string): UserSummary {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.login,
    role: doc.role,
    roleName,
    status: doc.status,
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
  };
}
