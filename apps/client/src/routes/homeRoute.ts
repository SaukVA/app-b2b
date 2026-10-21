import {
  APP_MODULES,
  AVAILABLE_HOME_SCREENS,
  can,
  DEFAULT_HOME_SCREEN,
  isHomeScreenAllowed,
  isModuleImplemented,
  type AppModule,
  type AuthUser,
  type HomeScreen,
} from '@app/shared';

/** Destino de un rol sin ninguna pantalla de negocio: Apariencia solo exige sesión (004). */
const NO_SCREEN_ROUTE = '/ajustes/apariencia';

/** Módulo al que pertenece una ruta ("/clientes/42?x=1" → "clientes"), o null. */
export function moduleFromPath(path: string): AppModule | null {
  const segment = path.split(/[?#]/)[0].split('/')[1] ?? '';
  return APP_MODULES.find((module) => module === segment) ?? null;
}

/** Ruta de un módulo implementado que el rol puede ver; un módulo pendiente nunca se abre (005 FR-011). */
function canOpen(user: AuthUser, path: string | null | undefined): path is string {
  const module = path ? moduleFromPath(path) : null;
  return module !== null && isModuleImplemented(module) && can(user.permissions, module, 'view');
}

/**
 * Pantalla por defecto que el rol puede abrir: DEFAULT_HOME_SCREEN o, si no, la primera de
 * AVAILABLE_HOME_SCREENS. Nunca devuelve una pantalla sin permiso, así RequireAuth no redirige en bucle
 * (research R9).
 */
function defaultHomeScreen(user: AuthUser): HomeScreen | null {
  if (isHomeScreenAllowed(user.permissions, DEFAULT_HOME_SCREEN)) return DEFAULT_HOME_SCREEN;
  return (
    AVAILABLE_HOME_SCREENS.find((screen) => isHomeScreenAllowed(user.permissions, screen)) ?? null
  );
}

/** Pantalla de inicio que se usa de verdad, la que aparece seleccionada en Apariencia (FR-016). */
export function effectiveHomeScreen(user: AuthUser): HomeScreen | null {
  const { homeScreen } = user.preferences;
  if (homeScreen && isHomeScreenAllowed(user.permissions, homeScreen)) return homeScreen;
  return defaultHomeScreen(user);
}

/**
 * FR-006: ruta de origen → pantalla elegida → pantalla por defecto, siempre que el rol pueda abrirla y el
 * módulo esté implementado (005). Sin ninguno, Ajustes › Apariencia.
 */
export function resolveHomeRoute(user: AuthUser, from?: string | null): string {
  if (canOpen(user, from)) return from;
  const screen = effectiveHomeScreen(user);
  return screen ? `/${screen}` : NO_SCREEN_ROUTE;
}
