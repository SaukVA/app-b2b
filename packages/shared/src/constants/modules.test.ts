import { IMPLEMENTED_MODULES, isModuleImplemented } from './modules';

describe('IMPLEMENTED_MODULES', () => {
  it('hoy están implementados Ajustes y Productos (006)', () => {
    expect(IMPLEMENTED_MODULES).toEqual(['ajustes', 'productos']);
  });
});

describe('isModuleImplemented', () => {
  it.each(['ajustes', 'productos'] as const)('%s está implementado', (module) => {
    expect(isModuleImplemented(module)).toBe(true);
  });

  it.each(['ventas', 'clientes', 'proveedores', 'cobros'] as const)(
    '%s está pendiente',
    (module) => {
      expect(isModuleImplemented(module)).toBe(false);
    },
  );
});
