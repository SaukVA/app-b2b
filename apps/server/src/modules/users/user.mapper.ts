import type { AuthUser } from '@app/shared';
import type { UserDocument } from './user.model';

/** Documento de Mongoose → DTO compartido. NEVER se devuelve el documento en una respuesta. */
export function toAuthUser(doc: UserDocument): AuthUser {
  return {
    id: doc._id.toString(),
    login: doc.login,
    name: doc.name,
    role: doc.role,
    isBootstrap: doc.isBootstrap,
    homeScreen: doc.homeScreen ?? null,
  };
}
