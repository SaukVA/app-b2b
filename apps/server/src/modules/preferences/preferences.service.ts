import {
  isHomeScreenAllowed,
  PREFERENCES_ERROR_CODES,
  type AppearancePreferences,
  type PermissionSet,
  type UpdatePreferencesRequest,
} from '@app/shared';
import { AppError } from '../../utils/AppError';
import { UserModel } from '../users/user.model';
import { toAppearancePreferences } from './preferences.mapper';

/** FR-014: solo se puede elegir una pantalla que exista y que el rol pueda ver (`null` = sin elegir). */
function assertHomeScreenAllowed(permissions: PermissionSet, change: UpdatePreferencesRequest) {
  const { homeScreen } = change;
  if (!homeScreen || isHomeScreenAllowed(permissions, homeScreen)) return;
  throw new AppError(
    PREFERENCES_ERROR_CODES.homeScreenNotAllowed,
    400,
    'Tu rol no tiene acceso a esa pantalla.',
  );
}

/**
 * Guarda solo los campos recibidos en el usuario de la sesión (research R3) y devuelve las 4 preferencias
 * resueltas. `permissions` son los del rol, leídos en cada petición.
 */
export async function updatePreferences(
  userId: string,
  permissions: PermissionSet,
  change: UpdatePreferencesRequest,
): Promise<AppearancePreferences> {
  assertHomeScreenAllowed(permissions, change);
  const doc = await UserModel.findByIdAndUpdate(userId, { $set: change }, { new: true });
  if (!doc) {
    throw new AppError(
      'AUTH_SESSION_EXPIRED',
      401,
      'Tu sesión ha caducado. Vuelve a iniciar sesión.',
    );
  }
  return toAppearancePreferences(doc);
}
