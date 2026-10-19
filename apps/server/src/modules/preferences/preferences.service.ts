import type { AppearancePreferences, PermissionSet, UpdatePreferencesRequest } from '@app/shared';
import { AppError } from '../../utils/AppError';
import { UserModel } from '../users/user.model';
import { toAppearancePreferences } from './preferences.mapper';

/**
 * Guarda solo los campos recibidos en el usuario de la sesión (research R3) y devuelve las 4 preferencias
 * resueltas. `permissions` (los del rol, leídos en cada petición) los usa la validación de la pantalla de
 * inicio (US2).
 */
export async function updatePreferences(
  userId: string,
  _permissions: PermissionSet,
  change: UpdatePreferencesRequest,
): Promise<AppearancePreferences> {
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
