import { can, DEFAULT_HOME_SCREEN, type AppModule, type AuthUser } from '@app/shared';

export const APP_MODULES: readonly AppModule[] = [
  'ventas',
  'clientes',
  'productos',
  'proveedores',
  'cobros',
  'ajustes',
];

/** Módulo al que pertenece una ruta ("/clientes/42?x=1" → "clientes"), o null. */
export function moduleFromPath(path: string): AppModule | null {
  const segment = path.split(/[?#]/)[0].split('/')[1] ?? '';
  return APP_MODULES.find((module) => module === segment) ?? null;
}

function canOpen(user: AuthUser, path: string | null | undefined): path is string {
  const module = path ? moduleFromPath(path) : null;
  return module !== null && can(user.role, module, 'view');
}

/** FR-006: ruta de origen → pantalla elegida → pantalla por defecto, siempre que el rol pueda abrirla. */
export function resolveHomeRoute(user: AuthUser, from?: string | null): string {
  if (canOpen(user, from)) return from;
  const preferred = user.homeScreen ? `/${user.homeScreen}` : null;
  if (canOpen(user, preferred)) return preferred;
  return `/${DEFAULT_HOME_SCREEN}`;
}
