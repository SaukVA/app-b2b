import type { Role } from '../types/user';

export type AppModule = 'ventas' | 'clientes' | 'productos' | 'proveedores' | 'cobros' | 'ajustes';

export type PermissionLevel = 'edit' | 'view' | 'none';

export const ROLES: readonly Role[] = ['Administrador', 'Comercial', 'Almacén', 'Administración'];

/** Matriz de Ajustes › Usuarios (data-model.md). */
export const PERMISSIONS: Readonly<Record<AppModule, Readonly<Record<Role, PermissionLevel>>>> = {
  ventas: { Administrador: 'edit', Comercial: 'edit', Almacén: 'view', Administración: 'view' },
  clientes: { Administrador: 'edit', Comercial: 'edit', Almacén: 'none', Administración: 'view' },
  productos: { Administrador: 'edit', Comercial: 'view', Almacén: 'edit', Administración: 'view' },
  proveedores: { Administrador: 'edit', Comercial: 'none', Almacén: 'view', Administración: 'edit' },
  cobros: { Administrador: 'edit', Comercial: 'view', Almacén: 'none', Administración: 'edit' },
  ajustes: { Administrador: 'edit', Comercial: 'none', Almacén: 'none', Administración: 'none' },
};

const RANK: Record<PermissionLevel, number> = { none: 0, view: 1, edit: 2 };

/** `true` si el rol tiene al menos el nivel pedido en el módulo (`edit` incluye `view`). */
export function can(role: Role, module: AppModule, level: PermissionLevel): boolean {
  return RANK[PERMISSIONS[module][role]] >= RANK[level];
}
