import type * as PreferencesModule from './preferences';
import type { PermissionSet } from './roles';
import {
  AVAILABLE_HOME_SCREENS,
  DEFAULT_MONEY_FORMAT,
  DEFAULT_TABLE_DENSITY,
  DEFAULT_THEME,
  isHomeScreenAllowed,
} from './preferences';

const ALL_IMPLEMENTED = ['ventas', 'clientes', 'productos', 'proveedores', 'cobros', 'ajustes'];

/**
 * Carga ./preferences con otra lista de módulos implementados: AVAILABLE_HOME_SCREENS se calcula al cargar
 * el módulo, así que cada lista necesita su propio registro de módulos.
 */
function loadPreferences(implemented: readonly string[]): typeof PreferencesModule {
  let loaded: typeof PreferencesModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('./modules', () => ({
      IMPLEMENTED_MODULES: implemented,
      isModuleImplemented: (module: string) => implemented.includes(module),
    }));
    loaded = jest.requireActual<typeof PreferencesModule>('./preferences');
  });
  if (!loaded) throw new Error('No se pudo cargar ./preferences');
  return loaded;
}

describe('valores por defecto', () => {
  it('tema Claro, densidad Cómoda y formato "1.248,50 €"', () => {
    expect(DEFAULT_THEME).toBe('light');
    expect(DEFAULT_TABLE_DENSITY).toBe('comfortable');
    expect(DEFAULT_MONEY_FORMAT).toBe('es');
  });
});

describe('AVAILABLE_HOME_SCREENS', () => {
  it('con la lista real ofrece Clientes (007), Productos (006) y Proveedores (009)', () => {
    expect(AVAILABLE_HOME_SCREENS).toEqual(['clientes', 'productos', 'proveedores']);
  });

  it('son las pantallas de módulos implementados, en el orden del selector y sin el Panel', () => {
    expect(loadPreferences(ALL_IMPLEMENTED).AVAILABLE_HOME_SCREENS).toEqual([
      'ventas',
      'clientes',
      'productos',
      'proveedores',
      'cobros',
    ]);
  });
});

describe('isHomeScreenAllowed(permissions, screen)', () => {
  const permissions: PermissionSet = { ventas: 'edit', clientes: 'view', productos: 'none' };

  it('con la lista real rechaza las pantallas pendientes (005)', () => {
    expect(isHomeScreenAllowed(permissions, 'ventas')).toBe(false);
  });

  it('con la lista real admite Clientes, ya implementado (007)', () => {
    expect(isHomeScreenAllowed(permissions, 'clientes')).toBe(true);
  });
});

describe('isHomeScreenAllowed(permissions, screen) con módulos implementados', () => {
  const { isHomeScreenAllowed } = loadPreferences(ALL_IMPLEMENTED);
  const permissions: PermissionSet = { ventas: 'edit', clientes: 'view', productos: 'none' };

  it('admite una pantalla con view o edit', () => {
    expect(isHomeScreenAllowed(permissions, 'ventas')).toBe(true);
    expect(isHomeScreenAllowed(permissions, 'clientes')).toBe(true);
  });

  it('rechaza una pantalla sin acceso o ausente de la matriz', () => {
    expect(isHomeScreenAllowed(permissions, 'productos')).toBe(false);
    expect(isHomeScreenAllowed(permissions, 'cobros')).toBe(false);
  });

  it('rechaza el Panel mientras no exista', () => {
    expect(isHomeScreenAllowed(permissions, 'panel')).toBe(false);
  });
});
