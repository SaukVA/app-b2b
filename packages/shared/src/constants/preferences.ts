import type { MoneyFormat, TableDensity, ThemePreference } from '../types/preferences';
import type { HomeScreen } from '../types/user';
import { isModuleImplemented } from './modules';
import { can, type PermissionSet } from './roles';

export const DEFAULT_THEME: ThemePreference = 'light';
export const DEFAULT_TABLE_DENSITY: TableDensity = 'comfortable';
export const DEFAULT_MONEY_FORMAT: MoneyFormat = 'es';

/**
 * Pantallas que se pueden elegir como inicio: las de módulos implementados (005, clarificación del
 * 2026-10-20), en el orden del selector. Hoy solo Productos (006). `panel` se añadirá cuando exista su
 * pantalla.
 */
export const AVAILABLE_HOME_SCREENS: readonly HomeScreen[] = (
  ['ventas', 'clientes', 'productos', 'proveedores', 'cobros'] as const
).filter(isModuleImplemented);

/** Códigos de error de las preferencias (contracts/preferences-api.openapi.yaml). */
export const PREFERENCES_ERROR_CODES = {
  homeScreenNotAllowed: 'PREFERENCES_HOME_SCREEN_NOT_ALLOWED',
} as const;

/** `true` si la pantalla existe en la aplicación y el rol puede al menos verla (FR-014). */
export function isHomeScreenAllowed(permissions: PermissionSet, screen: HomeScreen): boolean {
  const available: readonly HomeScreen[] = AVAILABLE_HOME_SCREENS;
  // `panel` no está en la lista; compararlo además estrecha `screen` a un AppModule para `can`.
  if (!available.includes(screen) || screen === 'panel') return false;
  return can(permissions, screen, 'view');
}
