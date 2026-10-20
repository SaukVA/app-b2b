import type { RoleFields } from './role.model';

export type DefaultRole = Pick<RoleFields, 'key' | 'name' | 'isAdmin' | 'order' | 'permissions'>;

/** Roles y matriz iniciales de FR-020. Las claves son los valores que ya guarda `users.role` (ADR 0003). */
export const DEFAULT_ROLES: readonly DefaultRole[] = [
  {
    key: 'Administrador',
    name: 'Administrador',
    isAdmin: true,
    order: 1,
    permissions: {
      ventas: 'edit',
      clientes: 'edit',
      productos: 'edit',
      proveedores: 'edit',
      cobros: 'edit',
      ajustes: 'edit',
    },
  },
  {
    key: 'Comercial',
    name: 'Comercial',
    isAdmin: false,
    order: 2,
    permissions: {
      ventas: 'edit',
      clientes: 'edit',
      productos: 'view',
      proveedores: 'none',
      cobros: 'view',
      ajustes: 'none',
    },
  },
  {
    key: 'Almacén',
    name: 'Almacén',
    isAdmin: false,
    order: 3,
    permissions: {
      ventas: 'view',
      clientes: 'none',
      productos: 'edit',
      proveedores: 'view',
      cobros: 'none',
      ajustes: 'none',
    },
  },
  {
    key: 'Administración',
    name: 'Administración',
    isAdmin: false,
    order: 4,
    permissions: {
      ventas: 'view',
      clientes: 'view',
      productos: 'view',
      proveedores: 'edit',
      cobros: 'edit',
      ajustes: 'none',
    },
  },
];
