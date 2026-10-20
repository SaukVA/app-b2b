import type { HomeScreen } from './user';

/** Claro, Oscuro o Según el sistema (FR-005). */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Cómoda o Compacta (FR-008). */
export type TableDensity = 'comfortable' | 'compact';

/** `es` = "1.248,50 €"; `en` = "€ 1,248.50" (FR-010). */
export type MoneyFormat = 'es' | 'en';

/** Preferencias de apariencia de un usuario, ya resueltas con sus valores por defecto. */
export interface AppearancePreferences {
  theme: ThemePreference;
  tableDensity: TableDensity;
  moneyFormat: MoneyFormat;
  /** `null` = sin elegir: el cliente usa la pantalla por defecto efectiva. */
  homeScreen: HomeScreen | null;
}

/** Cambio parcial de `PATCH /preferences`; `null` vuelve al valor por defecto. */
export type UpdatePreferencesRequest = Partial<{
  theme: ThemePreference | null;
  tableDensity: TableDensity | null;
  moneyFormat: MoneyFormat | null;
  homeScreen: HomeScreen | null;
}>;
