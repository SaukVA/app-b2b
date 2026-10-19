import { ADMIN_ROLE_KEY, APP_MODULES, can, type PermissionSet } from './roles';

describe('APP_MODULES', () => {
  it('son los 6 módulos de la aplicación, en orden', () => {
    expect(APP_MODULES).toEqual([
      'ventas',
      'clientes',
      'productos',
      'proveedores',
      'cobros',
      'ajustes',
    ]);
  });
});

describe('ADMIN_ROLE_KEY', () => {
  it('es la clave del rol Administrador que crea la siembra', () => {
    expect(ADMIN_ROLE_KEY).toBe('Administrador');
  });
});

describe('can(permissions, module, level)', () => {
  const permissions: PermissionSet = { ventas: 'edit', clientes: 'view', productos: 'none' };

  it('edit incluye view', () => {
    expect(can(permissions, 'ventas', 'edit')).toBe(true);
    expect(can(permissions, 'ventas', 'view')).toBe(true);
  });

  it('view no incluye edit', () => {
    expect(can(permissions, 'clientes', 'view')).toBe(true);
    expect(can(permissions, 'clientes', 'edit')).toBe(false);
  });

  it('none no concede nada salvo el nivel none', () => {
    expect(can(permissions, 'productos', 'view')).toBe(false);
    expect(can(permissions, 'productos', 'none')).toBe(true);
  });

  it('un módulo ausente cuenta como none (FR-026)', () => {
    expect(can(permissions, 'ajustes', 'view')).toBe(false);
    expect(can(permissions, 'ajustes', 'edit')).toBe(false);
    expect(can({}, 'cobros', 'view')).toBe(false);
  });
});
