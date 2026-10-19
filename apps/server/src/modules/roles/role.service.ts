import { APP_MODULES, type RoleSummary } from '@app/shared';
import { DEFAULT_ROLES } from './role.defaults';
import { toRoleSummary } from './role.mapper';
import { RoleModel, type RoleDocument } from './role.model';

const ALL_EDIT = Object.fromEntries(APP_MODULES.map((module) => [`permissions.${module}`, 'edit']));

/**
 * Al arrancar: inserta los roles por defecto que falten sin tocar los existentes (FR-020) y fuerza
 * `edit` en todos los módulos del rol `isAdmin` (FR-027).
 */
export async function ensureDefaultRoles(): Promise<void> {
  await RoleModel.bulkWrite(
    DEFAULT_ROLES.map((role) => ({
      updateOne: { filter: { key: role.key }, update: { $setOnInsert: role }, upsert: true },
    })),
  );
  await RoleModel.updateMany({ isAdmin: true }, { $set: ALL_EDIT });
}

export async function listRoles(): Promise<RoleSummary[]> {
  const roles = await RoleModel.find().sort({ order: 1, key: 1 });
  return roles.map(toRoleSummary);
}

export function findRole(key: string): Promise<RoleDocument | null> {
  return RoleModel.findOne({ key }).exec();
}

/** Claves de los roles Administrador (`isAdmin`), para la regla del último Administrador activo. */
export async function findAdminRoleKeys(): Promise<string[]> {
  const roles = await RoleModel.find({ isAdmin: true }).select('key');
  return roles.map((role) => role.key);
}
