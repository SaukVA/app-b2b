import { can, PERMISSIONS, ROLES, type AppModule, type PermissionLevel } from './roles';
import type { Role } from '../types/user';

const EXPECTED: Array<[AppModule, Role, PermissionLevel]> = [
  ['ventas', 'Administrador', 'edit'],
  ['ventas', 'Comercial', 'edit'],
  ['ventas', 'Almacén', 'view'],
  ['ventas', 'Administración', 'view'],
  ['clientes', 'Administrador', 'edit'],
  ['clientes', 'Comercial', 'edit'],
  ['clientes', 'Almacén', 'none'],
  ['clientes', 'Administración', 'view'],
  ['productos', 'Administrador', 'edit'],
  ['productos', 'Comercial', 'view'],
  ['productos', 'Almacén', 'edit'],
  ['productos', 'Administración', 'view'],
  ['proveedores', 'Administrador', 'edit'],
  ['proveedores', 'Comercial', 'none'],
  ['proveedores', 'Almacén', 'view'],
  ['proveedores', 'Administración', 'edit'],
  ['cobros', 'Administrador', 'edit'],
  ['cobros', 'Comercial', 'view'],
  ['cobros', 'Almacén', 'none'],
  ['cobros', 'Administración', 'edit'],
  ['ajustes', 'Administrador', 'edit'],
  ['ajustes', 'Comercial', 'none'],
  ['ajustes', 'Almacén', 'none'],
  ['ajustes', 'Administración', 'none'],
];

describe('PERMISSIONS', () => {
  it('cubre los 4 roles en los 6 módulos', () => {
    expect(ROLES).toHaveLength(4);
    expect(Object.keys(PERMISSIONS)).toHaveLength(6);
    expect(EXPECTED).toHaveLength(24);
  });
});

describe('can()', () => {
  it.each(EXPECTED)('%s · %s → %s', (module, role, level) => {
    expect(PERMISSIONS[module][role]).toBe(level);
    expect(can(role, module, 'edit')).toBe(level === 'edit');
    expect(can(role, module, 'view')).toBe(level !== 'none');
    expect(can(role, module, 'none')).toBe(true);
  });
});
