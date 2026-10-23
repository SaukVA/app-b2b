import { IMPLEMENTED_MODULES, isModuleImplemented } from './modules';

describe('IMPLEMENTED_MODULES', () => {
  it('hoy están implementados Ajustes, Productos (006), Clientes (007) y Proveedores (009)', () => {
    expect(IMPLEMENTED_MODULES).toEqual(['ajustes', 'productos', 'clientes', 'proveedores']);
  });
});

describe('isModuleImplemented', () => {
  it.each(['ajustes', 'productos', 'clientes', 'proveedores'] as const)(
    '%s está implementado',
    (module) => {
      expect(isModuleImplemented(module)).toBe(true);
    },
  );

  it.each(['ventas', 'cobros'] as const)('%s está pendiente', (module) => {
    expect(isModuleImplemented(module)).toBe(false);
  });
});
