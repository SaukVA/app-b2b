import type { AppModule } from './roles';

// Único sitio que se edita al implementar un módulo (005 FR-010): el menú lo pasa de «Pendiente» a enlace,
// sus rutas se abren y la pantalla de inicio de 004 puede elegirlo.

/** Módulos con pantalla real. Los demás se muestran en el menú como «Pendiente» y no se pueden abrir. */
export const IMPLEMENTED_MODULES: readonly AppModule[] = ['ajustes', 'productos', 'clientes'];

export function isModuleImplemented(module: AppModule): boolean {
  return IMPLEMENTED_MODULES.includes(module);
}
