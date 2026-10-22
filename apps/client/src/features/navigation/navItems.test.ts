import type { AppModule, PermissionLevel } from '@app/shared';
import type * as NavItemsModule from './navItems';
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

/** Carga ./navItems con otra lista de módulos implementados, en un registro de módulos aparte. */
function loadNavItems(implemented: readonly string[]): typeof NavItemsModule {
  let loaded: typeof NavItemsModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('../../../../../packages/shared/src/constants/modules', () => ({
      IMPLEMENTED_MODULES: implemented,
      isModuleImplemented: (module: string) => implemented.includes(module),
    }));
    loaded = jest.requireActual<typeof NavItemsModule>('./navItems');
  });
  if (!loaded) throw new Error('No se pudo cargar ./navItems');
  return loaded;
}

describe('buildNavItems · pendientes', () => {
  it('con la lista real, Clientes (007), Productos (006) y Ajustes no están pendientes y el resto sí', () => {
    const pending = buildNavItems(ADMIN).map(({ label, pending }) => [label, pending]);
    expect(pending).toEqual([
      ['Ventas', true],
      ['Clientes', false],
      ['Productos', false],
      ['Proveedores', true],
      ['Cobros', true],
      ['Ajustes', false],
    ]);
  });

  it('al implementar Clientes deja de estar pendiente, en la misma posición (FR-010)', () => {
    const { buildNavItems: build } = loadNavItems(['ajustes', 'clientes']);
    const items = build(ADMIN);
    expect(items[1]).toMatchObject({ label: 'Clientes', pending: false });
    expect(items.filter((item) => item.pending)).toHaveLength(4);
  });
});
