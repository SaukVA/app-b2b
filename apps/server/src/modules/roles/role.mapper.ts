import { APP_MODULES, type AppModule, type PermissionLevel, type RoleSummary } from '@app/shared';
import type { RoleDocument } from './role.model';

/** Fila de permisos completa: los módulos sin valor (o un rol inexistente) cuentan como `none` (FR-026). */
export function toPermissionSet(doc: RoleDocument | null): Record<AppModule, PermissionLevel> {
  const stored = doc?.permissions ?? {};
  return Object.fromEntries(
    APP_MODULES.map((module) => [module, stored[module] ?? 'none']),
  ) as Record<AppModule, PermissionLevel>;
}

/** Documento de Mongoose → DTO compartido. NEVER se devuelve el documento en una respuesta. */
export function toRoleSummary(doc: RoleDocument): RoleSummary {
  return {
    key: doc.key,
    name: doc.name,
    isAdmin: doc.isAdmin,
    order: doc.order,
    permissions: toPermissionSet(doc),
  };
}
