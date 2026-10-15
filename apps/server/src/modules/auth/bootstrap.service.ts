import { hashPassword } from '../../utils/password';
import { UserModel } from '../users/user.model';
import { SessionModel } from './session.model';

// Cuenta inicial "admin" (research R6): existe solo mientras no haya usuarios reales.

const BOOTSTRAP_LOGIN = 'admin';
const BOOTSTRAP_PASSWORD = 'admin';

/** Usuarios reales = todos salvo la cuenta inicial. */
export function countRealUsers(): Promise<number> {
  return UserModel.countDocuments({ isBootstrap: false }).exec();
}

/** Al arrancar: crea la cuenta inicial con la base vacía, o la retira si ya hay usuarios reales. */
export async function ensureBootstrapAccount(): Promise<void> {
  if ((await countRealUsers()) > 0) {
    await retireBootstrapIfNeeded();
    return;
  }
  if (await UserModel.exists({ isBootstrap: true })) return;
  await UserModel.create({
    login: BOOTSTRAP_LOGIN,
    name: 'Administrador inicial',
    passwordHash: await hashPassword(BOOTSTRAP_PASSWORD),
    role: 'Administrador',
    status: 'Activo',
    isBootstrap: true,
  });
}

/** Si ya hay usuarios reales, borra la cuenta inicial y revoca sus sesiones. Devuelve si la ha retirado. */
export async function retireBootstrapIfNeeded(): Promise<boolean> {
  if ((await countRealUsers()) === 0) return false;
  const bootstrap = await UserModel.findOne({ isBootstrap: true });
  if (!bootstrap) return false;
  await SessionModel.updateMany({ userId: bootstrap._id, revokedAt: null }, { revokedAt: new Date() });
  await UserModel.deleteOne({ _id: bootstrap._id });
  return true;
}
