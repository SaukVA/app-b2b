import { IMPLEMENTED_MODULES, isModuleImplemented } from './modules';

describe('IMPLEMENTED_MODULES', () => {
  it('hoy están implementados Ajustes, Productos (006) y Clientes (007)', () => {
    expect(IMPLEMENTED_MODULES).toEqual(['ajustes', 'productos', 'clientes']);
  });
});

describe('isModuleImplemented', () => {
  it.each(['ajustes', 'productos', 'clientes'] as const)('%s está implementado', (module) => {
    expect(isModuleImplemented(module)).toBe(true);
  });

  it.each(['ventas', 'proveedores', 'cobros'] as const)('%s está pendiente', (module) => {
    expect(isModuleImplemented(module)).toBe(false);
  });
});
