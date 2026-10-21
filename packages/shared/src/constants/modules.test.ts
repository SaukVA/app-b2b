import { IMPLEMENTED_MODULES, isModuleImplemented } from './modules';

describe('IMPLEMENTED_MODULES', () => {
  it('hoy solo está implementado Ajustes', () => {
    expect(IMPLEMENTED_MODULES).toEqual(['ajustes']);
  });
});

describe('isModuleImplemented', () => {
  it('Ajustes está implementado', () => {
    expect(isModuleImplemented('ajustes')).toBe(true);
  });

  it.each(['ventas', 'clientes', 'productos', 'proveedores', 'cobros'] as const)(
    '%s está pendiente',
    (module) => {
      expect(isModuleImplemented(module)).toBe(false);
    },
  );
});
