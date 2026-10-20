import type { ApiSuccess, AppearancePreferences, UpdatePreferencesRequest } from '@app/shared';
import { httpClient } from '../../utils/httpClient';

// Llamada a /preferences (contracts/preferences-api.openapi.yaml). Los componentes nunca llaman a la API:
// lo hace el thunk savePreference de preferencesSlice (ADR 0001).

/** Mensaje del aviso de guardado fallido (FR-004), sea cual sea la causa. */
export const PREFERENCES_SAVE_ERROR =
  'No se ha podido guardar. Se mantiene hasta que cierres sesión.';

/** Guarda un cambio parcial (PATCH /preferences) y devuelve las preferencias guardadas. */
export async function updatePreferences(
  change: UpdatePreferencesRequest,
): Promise<AppearancePreferences> {
  const { data } = await httpClient.patch<ApiSuccess<AppearancePreferences>>(
    '/preferences',
    change,
  );
  return data.data;
}
