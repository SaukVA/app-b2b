import type { AppModule, PermissionLevel } from '@app/shared';
import { buildNavItems } from './navItems';

type Permissions = Record<AppModule, PermissionLevel>;

const NO_ACCESS: Permissions = {
  ventas: 'none',
  clientes: 'none',
  productos: 'none',
  proveedores: 'none',
  cobros: 'none',
  ajustes: 'none',
};

const ADMIN: Permissions = {
  ventas: 'edit',
  clientes: 'edit',
  productos: 'edit',
  proveedores: 'edit',
  cobros: 'edit',
  ajustes: 'edit',
};

const labels = (permissions: Permissions) => buildNavItems(permissions).map((item) => item.label);

describe('buildNavItems', () => {
  it('un Administrador recibe los 6 módulos en orden, con su ruta y etiqueta', () => {
    const items = buildNavItems(ADMIN);
    expect(items.map(({ to, label }) => [to, label])).toEqual([
      ['/ventas', 'Ventas'],
      ['/clientes', 'Clientes'],
      ['/productos', 'Productos'],
      ['/proveedores', 'Proveedores'],
      ['/cobros', 'Cobros'],
      ['/ajustes', 'Ajustes'],
    ]);
  });

  it('un módulo con none no aparece; con view o edit sí', () => {
    expect(labels({ ...NO_ACCESS, clientes: 'view', productos: 'edit' })).toEqual([
      'Clientes',
      'Productos',
      'Ajustes',
    ]);
  });

  it('Ajustes aparece siempre en el pie, aunque el rol tenga ajustes: none', () => {
    const ajustes = buildNavItems({ ...ADMIN, ajustes: 'none' }).at(-1);
    expect(ajustes?.label).toBe('Ajustes');
    expect(ajustes?.section).toBe('footer');
  });

  it('un rol sin ningún view solo recibe Ajustes', () => {
    expect(labels(NO_ACCESS)).toEqual(['Ajustes']);
  });
});
