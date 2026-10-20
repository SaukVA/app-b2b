import type { PermissionSet } from './roles';
import {
  AVAILABLE_HOME_SCREENS,
  DEFAULT_MONEY_FORMAT,
  DEFAULT_TABLE_DENSITY,
  DEFAULT_THEME,
  isHomeScreenAllowed,
} from './preferences';

describe('valores por defecto', () => {
  it('tema Claro, densidad Cómoda y formato "1.248,50 €"', () => {
    expect(DEFAULT_THEME).toBe('light');
    expect(DEFAULT_TABLE_DENSITY).toBe('comfortable');
    expect(DEFAULT_MONEY_FORMAT).toBe('es');
  });
});

describe('AVAILABLE_HOME_SCREENS', () => {
  it('son las pantallas con ruta, en el orden del selector y sin el Panel', () => {
    expect(AVAILABLE_HOME_SCREENS).toEqual([
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
