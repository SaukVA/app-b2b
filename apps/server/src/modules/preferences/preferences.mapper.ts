import {
  DEFAULT_MONEY_FORMAT,
  DEFAULT_TABLE_DENSITY,
  DEFAULT_THEME,
  type AppearancePreferences,
} from '@app/shared';
import type { UserDocument } from '../users/user.model';

/** Documento → preferencias resueltas: `null` o ausente es el valor por defecto (data-model.md). */
export function toAppearancePreferences(doc: UserDocument): AppearancePreferences {
  return {
    theme: doc.theme ?? DEFAULT_THEME,
    tableDensity: doc.tableDensity ?? DEFAULT_TABLE_DENSITY,
    moneyFormat: doc.moneyFormat ?? DEFAULT_MONEY_FORMAT,
    homeScreen: doc.homeScreen ?? null,
  };
}
