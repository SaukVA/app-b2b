// Módulos fijos de la aplicación. Los roles y su matriz de permisos viven en la colección `roles`
// (ADR 0003, research R11).
export const APP_MODULES = [
  'ventas',
  'clientes',
  'productos',
  'proveedores',
  'cobros',
  'ajustes',
] as const;

export type AppModule = (typeof APP_MODULES)[number];

export type PermissionLevel = 'edit' | 'view' | 'none';

/** Fila de permisos de un rol. Un módulo ausente cuenta como `none` (FR-026). */
export type PermissionSet = Readonly<Partial<Record<AppModule, PermissionLevel>>>;

/** Clave del rol Administrador del sistema que crea la siembra. */
export const ADMIN_ROLE_KEY = 'Administrador';

const RANK: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2 };

/** `true` si el conjunto tiene al menos el nivel pedido en el módulo (`edit` incluye `view`). */
export function can(
  permissions: PermissionSet,
  module: AppModule,
  level: PermissionLevel,
): boolean {
  return RANK[permissions[module] ?? 'none'] >= RANK[level];
}
