import { useLayoutEffect } from 'react';
import { DEFAULT_TABLE_DENSITY, DEFAULT_THEME, type ThemePreference } from '@app/shared';
import { useAppSelector } from '../../store/store';

// Tema y densidad en <html> (research R4): tokens.css ya resuelve data-theme (también «Según el sistema»,
// en vivo por media query) y Table lee data-density.

/** Último tema usado en este equipo, para el login (FR-007). Solo el valor, nunca quién lo usó. */
export const LAST_THEME_KEY = 'appearance.lastTheme';

const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system'];

function readLastTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(LAST_THEME_KEY);
    return THEMES.find((theme) => theme === value) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function writeLastTheme(theme: ThemePreference): void {
  try {
    localStorage.setItem(LAST_THEME_KEY, theme);
  } catch {
    // Sin almacenamiento (navegación privada, bloqueo): el login volverá a Claro.
  }
}

/** Antes del pintado (useLayoutEffect), para que no destelle el tema anterior (research R5). */
export function useApplyAppearance(): void {
  const applied = useAppSelector((state) => state.preferences.applied);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (applied) writeLastTheme(applied.theme);
    root.dataset.theme = applied?.theme ?? readLastTheme();
    root.dataset.density = applied?.tableDensity ?? DEFAULT_TABLE_DENSITY;
  }, [applied]);
}
